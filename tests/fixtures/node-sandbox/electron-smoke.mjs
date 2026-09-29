import { executeIsolatedNode } from '../../../modules/desktop-shell-observability/nodeSandbox.js';

const result = await executeIsolatedNode({
  sources: { 'index.mjs': `export const executors = { run: async (_, context) => ({
    text: (await context.call('models.generate', { kind: 'text' }, 'generate')).text,
    globals: [typeof process, typeof require],
  }) };` },
  entry: 'index.mjs', method: 'run', timeoutMs: 10_000,
}, {}, { call: async () => ({ text: 'sandbox ready' }) });
process.stdout.write(JSON.stringify(result));
