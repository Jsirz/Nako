// Preserve the stored `reasoning` UI field while mapping each API protocol explicitly.
import { ERRORS, PluginError } from './errors.js';
export function doubaoThinkingParameters(effort, responses = false) {
  if (effort === undefined) return {};
  if (!['minimal', 'low', 'medium', 'high'].includes(effort)) {
    throw new PluginError(ERRORS.invalidModel, '豆包不支持所选思考强度。', { context: { moduleId: 'contracts', operation: 'thinkingParameters', providerId: 'doubao', effort } });
  }
  return {
    thinking: { type: effort === 'minimal' ? 'disabled' : 'enabled' },
    ...(responses ? { reasoning: { effort } } : { reasoning_effort: effort }),
  };
}
