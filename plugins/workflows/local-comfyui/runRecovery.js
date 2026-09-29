import { disposeRecovery, failRecovery, publishRecoveryOutputs } from './recoveryFinalization.js';
import { acceptRecoveryTerminal, observeRecovery } from './recoveryObservation.js';
import {
  failBeforeSubmission,
  loadRecoveryPlan,
  validateRecoveryMetadata,
} from './recoveryPreflight.js';
import { rollbackUncommittedOutputs } from './runFinalization.js';
import { openRunEvents } from './runSubmission.js';
export async function resume(ports, input) {
  const promptId = await validateRecoveryMetadata(ports, input);
  if (promptId === null) return;
  const state = {
    promptId,
    stageLedger: await ports.runStore.requireInputStageLedger(input.task.nodeId).catch(() => null),
  };
  if (!promptId) {
    await failBeforeSubmission(ports, input, state);
    return;
  }
  try {
    const plan = await loadRecoveryPlan(ports, input, state);
    await openRunEvents(
      ports,
      { runId: input.task.nodeId, signal: input.signal },
      state,
      state.client,
      () => promptId,
    );
    const { terminal, submissionWasUnknown } = await observeRecovery(ports, input, state);
    if (!(await acceptRecoveryTerminal(ports, input, state, plan, terminal, submissionWasUnknown)))
      return;
    await publishRecoveryOutputs(ports, input, state, plan, terminal);
  } catch (error) {
    await rollbackUncommittedOutputs(ports, state);
    await failRecovery(ports, input, state, error);
  } finally {
    await disposeRecovery(ports, input, state);
  }
}
