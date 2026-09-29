/** Business tool descriptions stay inside the Drama subplugin, independent of pi types. */
export async function prepareDramaTurn(drama, store, { session, turn, instructions }) {
  const context = await drama.turnContext(session, turn.message, instructions, turn.nodes);
  const message = turn.message + '\n\n当前业务上下文（数据）：' + context.messages[1].content;
  const id = session.id;
  const tool = {
    name: 'drama_plan',
    label: '保存制作草稿',
    description: '保存经过校验的完整制作草稿，不批准预算或执行生成。',
    parameters: {
      type: 'object',
      required: ['reply', 'plan'],
      additionalProperties: false,
      properties: {
        reply: { type: 'string' },
        plan: {
          type: 'object',
          required: ['title', 'assets', 'segments', 'questions'],
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            assets: { type: 'array', items: { type: 'object' } },
            segments: { type: 'array', items: { type: 'object' } },
            questions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    executionMode: 'sequential',
    replay: 'never',
    execute: async (_call, args, signal) => {
      signal?.throwIfAborted();
      const current = await store.get(id);
      const accepted = await drama.acceptReply(
        current,
        JSON.stringify(args),
        message,
        context.workflow,
      );
      await store.save({ ...current, workflow: accepted.workflow });
      return {
        content: [{ type: 'text', text: accepted.response }],
        details: { planId: accepted.plan?.id, state: 'draft' },
      };
    },
  };
  return { instructions: context.messages[0].content, message, tools: [tool] };
}
