import { GenerationTaskJournal } from './taskJournal.js';
import { resolveGenerationRuntimePaths } from './paths.js';
export function createTaskJournalPlugin(options) {
  return {
    manifest: { id: 'storage.task-journal', version: '1.0.0', apiVersion: '^1.0.0', type: 'storage',
      services: { provides: ['generation.taskStore'] }, capabilities: ['generation.recovery'], reloadRequired: true },
    activate(context) {
      const paths = resolveGenerationRuntimePaths(options);
      context.services.register('generation.taskStore', new GenerationTaskJournal({ filePath: paths.privateJournalPath }));
    },
  };
}
