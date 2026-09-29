import { createGenerationCoordinator } from './generationCoordinator.js';

/**
 * Composition root for every generation entry point. Call this exactly once at
 * server startup, then inject the returned coordinator into all routers.
 */
export function createGenerationRuntime({
  taskStore: journal,
  parseTimeToMs,
  now,
  onTaskChange,
  coordinatorOptions = {},
} = {}) {
  if (!journal) throw new Error('Generation runtime requires GenerationTaskStore');
  const taskStore = typeof onTaskChange === 'function'
    ? {
      upsert(task) {
        const persisted = journal.upsert(task);
        try {
          onTaskChange(persisted);
        } catch {
          console.warn('[GenerationRuntime] Account activity observer unavailable');
        }
        return persisted;
      },
      get: (nodeId) => journal.get(nodeId),
    }
    : journal;
  const coordinator = createGenerationCoordinator({
    parseTimeToMs,
    now,
    taskStore,
    ...coordinatorOptions,
  });
  return Object.freeze({ coordinator, journal });
}
