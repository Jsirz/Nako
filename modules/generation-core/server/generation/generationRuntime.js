import { createGenerationCoordinator } from './generationCoordinator.js';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { createModuleLogger } from '../../../kernel/logger.js';
import { GENERATION_COORDINATION_METHODS } from '../../../contracts/generationService.js';

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
  logger = createModuleLogger('generation-core'),
} = {}) {
  if (!journal) throw new PluginError(ERRORS.invalidConfiguration, 'Generation runtime requires GenerationTaskStore', { context: { moduleId: 'generation-core', operation: 'createRuntime' } });
  const taskStore = typeof onTaskChange === 'function'
    ? {
      upsert(task) {
        const persisted = journal.upsert(task);
        try {
          onTaskChange(persisted);
        } catch (error) {
          logger.warn('Account activity observer unavailable', { operation: 'taskChange', nodeId: persisted?.nodeId, error });
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

/** Publish methods and snapshots only, never coordinator maps or the journal adapter. */
export function publicGenerationTasks({ coordinator, journal }) {
  return Object.freeze({
    coordinator: Object.freeze(Object.fromEntries(GENERATION_COORDINATION_METHODS.map(
      method => [method, (...args) => coordinator[method](...args)],
    ))),
    journal: Object.freeze({
      get: nodeId => structuredClone(journal.get(nodeId)),
      list: () => structuredClone(journal.list()),
    }),
  });
}
