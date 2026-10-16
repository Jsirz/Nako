// Built-in business nodes use exactly the same capability bridge as user packages.
import { shotAnalysis } from './shotAnalysis.mjs';
async function generate(kind, { inputs, parameters }, context) {
  const values = inputs.context || inputs.references || [];
  const isMedia = value => value && (typeof value === 'object' || /^(?:\/library\/|data:image\/)/.test(String(value)));
  const prompt = [parameters.prompt, ...values.filter(value => typeof value === 'string' && !isMedia(value))].filter(Boolean).join('\n');
  const references = values.filter(isMedia);
  context.progress('正在生成');
  const result = await context.call('models.generate', { kind, model: parameters.model, prompt, references,
    count: kind === 'text' ? 1 : parameters.count || 1, options: parameters }, 'generate');
  return { [kind]: kind === 'text' ? result.text : result };
}
export const executors = { ...Object.fromEntries(['text', 'image', 'video', 'audio'].flatMap(kind => [
  [kind, (input, context) => generate(kind, input, context)],
  ['asset' + kind, ({ parameters }) => ({ [kind]: { type: kind, url: parameters.value } })],
])),
  shotAnalysis,
  compare: ({ inputs }) => ({ image: inputs.images[0] }),
  async compose({ inputs, parameters }, context) {
    return { image: await context.call('media.compose', { images: inputs.images, columns: parameters.columns }, 'compose') };
  },
  async workflow({ parameters }, context) {
    return { dynamic: await context.call('workflow.execute', { workflowRef: parameters.workflowRef, canvasNodeHash: parameters.canvasNodeHash, values: parameters.parameterValues || parameters.values }, 'workflow') };
  },
};
