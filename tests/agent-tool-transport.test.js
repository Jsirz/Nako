import { expect, it, vi } from 'vitest';
import { readToolChat } from '../modules/agent/server/agent/modelChatTransport.js';
import { createModelAdapter } from '../modules/agent/server/harness/modelAdapter.js';
import { generationProviders } from '../modules/generation-core/providerRegistry.js';
import { loadModelCatalog } from '../modules/generation-core/api/server/config/modelCatalog.js';

const call = (id, args = '{}', index = 0) => ({ index, id, type: 'function',
  function: { name: 'canvas_control', arguments: args } });
const stream = (deltas, finish = 'tool_calls') => new Response([
  ...deltas.map(tool_calls => ({ choices: [{ delta: { tool_calls }, finish_reason: null }] })),
  ...(finish ? [{ choices: [{ delta: {}, finish_reason: finish }] }] : []),
].map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n',
{ headers: { 'content-type': 'text/event-stream' } });

it('accepts repeated complete metadata while concatenating only argument fragments', async () => {
  const id = 'call_' + 'a'.repeat(60);
  const result = await readToolChat(stream([
    [call(id, '{"action":')], [call(id, '"read"')], [call(id, '}')],
  ]));
  expect(result.message.tool_calls).toEqual([{ id, type: 'function',
    function: { name: 'canvas_control', arguments: '{"action":"read"}' } }]);
});

it.each(['call_abc|fc_123', 'call.abc:123', 'call_' + 'x'.repeat(180)])(
  'preserves opaque upstream IDs in JSON and streaming responses: %s', async id => {
    for (const response of [stream([[call(id)]]), Response.json({ choices: [{
      message: { tool_calls: [call(id)] }, finish_reason: 'tool_calls',
    }] })]) expect((await readToolChat(response)).message.tool_calls[0].id).toBe(id);
  },
);

it('assembles interleaved calls by index with omitted or empty metadata', async () => {
  const result = await readToolChat(stream([
    [call('second', '{', 1), call('first', '{', 0)],
    [{ index: 0, id: '', function: { name: '', arguments: '}' } },
      { index: 1, function: { arguments: '}' } }],
  ]));
  expect(result.message.tool_calls.map(c => [c.id, c.function.arguments])).toEqual([['first', '{}'], ['second', '{}']]);
});

it.each([
  ['missing ID', [[call(undefined)]]],
  ['numeric ID', [[call(123)]]],
  ['control character', [[call('call\nvalue')]]],
  ['oversized ID', [[call('x'.repeat(1025))]]],
  ['duplicate calls', [[call('same', '{}', 0), call('same', '{}', 1)]]],
  ['changing ID', [[call('first', '{')], [call('second', '}')]]],
  ['changing name', [[call('first', '{')], [{ ...call('first', '}'), function: { name: 'media_control', arguments: '}' } }]]],
])('rejects %s without inventing or rewriting an identifier', async (_name, deltas) => {
  await expect(readToolChat(stream(deltas))).rejects.toMatchObject({ code: 'AGENT_CANVAS_INCOMPLETE' });
});

it('still rejects streams without a successful tool-call finish', async () => {
  await expect(readToolChat(stream([[call('call_abc', '{')]], null))).rejects.toMatchObject({ code: 'AGENT_CANVAS_INCOMPLETE' });
});

it.each(['workfisher/g6-astra', 'workfisher/g5.6-sol', 'workfisher/g5.6-terra', 'workfisher/g5.6-luna'])(
  'round-trips the exact ID through the pi adapter and next request for %s', async modelId => {
    const release = generationProviders.register({ name: 'WorkFisherTextProvider', kinds: ['text'],
      execution: 'immediate', requiredSecrets: ['WORK_FISHER_API_KEY'] }, {});
    try {
      const modelConfig = Object.values(loadModelCatalog()).find(m => m.endpoint?.['multimodal-chat']?.model === modelId);
      const id = 'call_abc|fc_' + 'x'.repeat(160), requests = [];
      const fetcher = vi.fn(async (_url, options) => {
        requests.push(JSON.parse(options.body));
        return requests.length === 1
          ? stream([[call(id, '{"action":')], [call(id, '"read"}')]])
          : Response.json({ choices: [{ message: { content: 'done' }, finish_reason: 'stop' }] });
      });
      const adapter = createModelAdapter({ modelConfig, textTransport: { fetcher },
        getCredentials: () => ({ WORK_FISHER_API_KEY: 'test-only' }) });
      const assistant = await adapter.streamFn(adapter.model, { messages: [] }).result();
      expect(adapter.error).toBeUndefined();
      expect(assistant.content).toEqual([{ type: 'toolCall', id, name: 'canvas_control', arguments: { action: 'read' } }]);
      await adapter.streamFn(adapter.model, { messages: [assistant, { role: 'toolResult', toolCallId: id,
        toolName: 'canvas_control', content: [{ type: 'text', text: '{}' }], timestamp: Date.now() }] }).result();
      expect(requests[1].messages[1].tool_calls[0].id).toBe(id);
      expect(requests[1].messages[2].tool_call_id).toBe(id);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { release(); }
  },
);
