import { PluginError, ERRORS } from './errors.js';

export const STORAGE_ERRORS = Object.freeze({
  invalidSession: 'AGENT_SESSION_INVALID', corruptSession: 'AGENT_SESSION_CORRUPT',
  sessionConflict: 'AGENT_REVISION_CONFLICT', projectMismatch: 'AGENT_PROJECT_MISMATCH',
  instructions: 'INVALID_AGENT_SKILL_INSTRUCTIONS', exposedGeneration: 'GENERATION_STORAGE_EXPOSED',
  invalidPlan: 'INVALID_PLAN', planJournal: 'PLAN_JOURNAL_UNAVAILABLE', planMissing: 'PLAN_NOT_FOUND',
  planConflict: 'PLAN_CONFLICT', planLimit: 'PLAN_LIMIT', planDependency: 'PLAN_DEPENDENCY',
  budgetUnavailable: 'BUDGET_UNAVAILABLE', budgetMissing: 'BUDGET_NOT_FOUND', budgetConflict: 'BUDGET_CONFLICT',
  budgetScope: 'BUDGET_SCOPE', budgetInactive: 'BUDGET_INACTIVE', budgetDuplicate: 'BUDGET_DUPLICATE',
  budgetExhausted: 'BUDGET_EXHAUSTED', budgetUnbounded: 'BUDGET_COST_UNBOUNDED',
  promptPreset: 'INVALID_PROMPT_PRESET', promptConfiguration: 'INVALID_PROMPT_PRESET_CONFIG',
});
export class WorkspaceError extends PluginError {
  constructor(message, status = 400) {
    super(ERRORS.agentOperationSync, message, { status, context: { moduleId: 'storage.agent-files', operation: 'agentWorkspace' } });
  }
}
export class PlanError extends PluginError {
  constructor(message, code = STORAGE_ERRORS.invalidPlan, status = 400) {
    super(code, message, { status, context: { moduleId: 'storage.agent-files', operation: 'generationPlan' } });
  }
}
export class PromptPresetError extends PluginError {
  constructor(message, status = 400, code = STORAGE_ERRORS.promptPreset) {
    super(code, message, { status, context: { moduleId: 'storage.agent-files', operation: 'promptPresets' } });
  }
}
