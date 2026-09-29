import crypto from 'node:crypto';
import { canvasApiTool } from '../agent/canvasApiTool.js';
import { validCanvasControl } from '../../../contracts/canvasControlProtocol.js';
import { harnessError } from './session.js';
const groups = {
  canvas: ['read', 'nodes', 'runNode', 'nodeStatus', 'edit', 'undo', 'focus', 'models'],
  project: ['projects', 'project'],
  generation: [
    'tasks',
    'cancelTask',
    'prepareGeneration',
    'budgets',
    'prepareBudget',
    'revokeBudget',
    'runGeneration',
  ],
  media: ['assets', 'importAsset', 'media'],
  workflow: ['workflows', 'workflow', 'product'],
};
export const mutates = (command) =>
  !['read', 'nodes', 'nodeStatus', 'models', 'assets', 'projects', 'workflows', 'tasks', 'budgets', 'focus'].includes(
    command.action,
  ) && !(command.action === 'media' && ['view', 'inspect'].includes(command.operation));
function canonical(value) {
  return value && typeof value === 'object'
    ? Array.isArray(value)
      ? value.map(canonical)
      : Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])]),
        )
    : value;
}
const fingerprint = (value) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
/** Business flows receive the same durable intent barrier as canvas operations. */
export function journalBusinessTool(tool, { sessions, sessionId, runId }) {
  return {
    ...tool,
    async execute(toolCallId, args, signal, onUpdate) {
      signal?.throwIfAborted();
      const key = fingerprint({ tool: tool.name, args });
      let prior;
      await sessions.change(sessionId, (record) => {
        prior = record.receipts[key];
        if (!prior)
          record.receipts[key] = {
            id: key,
            runId,
            toolCallId,
            tool: tool.name,
            state: 'pending',
            createdAt: Date.now(),
          };
      });
      if (prior?.state === 'settled') return prior.result;
      if (prior)
        return {
          content: [{ type: 'text', text: '业务操作结果未确认，先查询原计划，禁止重放。' }],
          details: { code: 'UNCONFIRMED' },
          terminate: true,
        };
      signal?.throwIfAborted();
      const result = await tool.execute(toolCallId, args, signal, onUpdate);
      await sessions.change(sessionId, (record) =>
        Object.assign(record.receipts[key], { state: 'settled', result, completedAt: Date.now() }),
      );
      return result;
    },
  };
}
export function controlledTools({ sessions, sessionId, runId, dispatch, emit }) {
  return Object.entries(groups).map(([name, actions]) => {
    const schema = canvasApiTool().function.parameters;
    schema.properties.action.enum = actions;
    schema.oneOf = schema.oneOf.filter((s) => actions.includes(s.properties.action.const));
    return {
      name: name + '_control',
      label: name,
      description:
        canvasApiTool().function.description.replaceAll('canvas_control', name + '_control') +
        '\nOnly actions: ' +
        actions.join(', '),
      parameters: schema,
      replay: 'never',
      executionMode: 'sequential',
      async execute(toolCallId, command, signal) {
        signal?.throwIfAborted();
        if (!actions.includes(command.action) || !validCanvasControl(command))
          throw harnessError('操作参数无效', 'AGENT_TOOL_INVALID', 400);
        const key = mutates(command) ? fingerprint(command) : runId + ':' + toolCallId;
        let prior;
        await sessions.change(sessionId, (record) => {
          prior = record.receipts[key];
          if (prior) return;
          record.receipts[key] = {
            id: key,
            runId,
            toolCallId,
            tool: name + '_control',
            action: command.action,
            commandHash: fingerprint(command),
            state: 'pending',
            createdAt: Date.now(),
          };
        });
        if (prior) {
          if (prior.state === 'settled')
            return {
              content: [{ type: 'text', text: JSON.stringify(prior.result) }],
              details: prior.result,
            };
          return {
            content: [
              { type: 'text', text: '原操作回执未确认，必须先读取当前状态；禁止重复执行。' },
            ],
            details: { ok: false, code: 'UNCONFIRMED' },
            terminate: true,
          };
        }
        // Durable intent must commit before dispatch. Abort/timeouts leave it pending.
        signal?.throwIfAborted();
        const result = await dispatch(command, signal);
        const { images = [], ...receipt } = result;
        await sessions.change(sessionId, (record) => {
          record.receipts[key] = {
            ...record.receipts[key],
            state: receipt.code === 'UNCONFIRMED' ? 'unknown' : 'settled',
            result: receipt,
            completedAt: Date.now(),
          };
        });
        if (
          (receipt.ok && command.action === 'prepareBudget') ||
          receipt.generationState === 'awaiting-approval' ||
          receipt.nodeState === 'awaiting_approval' ||
          receipt.projectState === 'awaiting-user'
        )
          await emit('authorization_required', { toolCallId, action: command.action, receipt });
        return {
          content: [
            { type: 'text', text: JSON.stringify(receipt) },
            ...images.flatMap((image) => {
              const match = /^data:(image\/[^;]+);base64,(.+)$/s.exec(image.dataUrl || '');
              return match ? [{ type: 'image', mimeType: match[1], data: match[2] }] : [];
            }),
          ],
          details: receipt,
          ...(receipt.code === 'UNCONFIRMED' ? { terminate: true } : {}),
        };
      },
    };
  });
}
