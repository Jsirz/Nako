import crypto from 'node:crypto';

import { assertPromptId } from './executorSafety.js';

export async function openRunEvents(ports, input, state, client, getPromptId) {
  const { coordinator, handleRealtimeEvent } = ports;
  const { runId, signal } = input;

  if (typeof client.openEventStream === 'function') {
    try {
      state.eventStream = await client.openEventStream({
        clientId: `nako-${runId}`,
        signal,
        onEvent: (event) =>
          handleRealtimeEvent({
            event,
            promptId: getPromptId(),
            runId,
          }),
        onDisconnect: () => {
          if (coordinator.isActive(runId)) {
            coordinator.update(runId, { realtimeChannel: 'history-fallback' });
          }
        },
      });
      coordinator.update(runId, { realtimeChannel: 'websocket' });
    } catch {
      coordinator.update(runId, { realtimeChannel: 'history-fallback' });
    }
  } else {
    coordinator.update(runId, { realtimeChannel: 'history-fallback' });
  }
}
export async function submitExecution(ports, input, state, plan) {
  const { coordinator, now, waitForHistory } = ports;
  const { runId, signal } = input;

  const { client, compiled, deployment, outputPlan } = plan;
  const clientPromptId = crypto.randomUUID();
  state.expectedPromptId = clientPromptId;
  await openRunEvents(ports, input, state, client, () => state.expectedPromptId);
  coordinator.update(runId, {
    phase: 'submitting',
    compiledPromptHash: compiled.compiledPromptHash,
    comfyOutputPlan: outputPlan,
    promptId: clientPromptId,
    resolvedSeeds: compiled.resolvedSeeds,
    pendingSeedAdvancements: compiled.seedAdvancements,
  });
  let submission;
  try {
    submission = await client.submitPrompt({
      prompt: compiled.apiJson,
      clientId: `nako-${runId}`,
      promptId: clientPromptId,
      signal,
    });
    state.promptId = assertPromptId(submission?.prompt_id);
    state.expectedPromptId = state.promptId;
    coordinator.update(runId, {
      seedAdvancements: compiled.seedAdvancements,
      seedAcceptedAt: new Date(now()).toISOString(),
    });
  } catch (error) {
    const definitelyNotSubmitted = [
      'COMFYUI_PROMPT_REJECTED',
      'COMFYUI_PROMPT_SIZE_LIMIT',
      'INVALID_COMFYUI_CLIENT_ID',
      'COMFYUI_REDIRECT_REJECTED',
    ].includes(error?.code);
    if (definitelyNotSubmitted) throw error;
    // The request may already have reached ComfyUI even when the 200 body
    // is missing, invalid, oversized or carries an invalid prompt_id.
    // Observe the client UUID persisted before POST; never resubmit.
    state.promptId = clientPromptId;
    coordinator.update(runId, {
      phase: 'submission_unknown',
      promptId: state.promptId,
      remoteMayContinue: true,
    });
    const observed = await waitForHistory({
      client,
      promptId: state.promptId,
      deployment,
      signal,
      runId,
      deadlineMs: now() + Math.min(60000, deployment.timeoutMs),
    });
    if (observed.state === 'pending' || observed.state === 'timeout') {
      coordinator.finalizeUnknown(runId, { promptId: state.promptId });
      return;
    }
    if (observed.state === 'success' || observed.state === 'failed') {
      coordinator.update(runId, {
        seedAdvancements: compiled.seedAdvancements,
        seedAcceptedAt: new Date(now()).toISOString(),
      });
    }
    submission = { recoveredFromUnknown: true, observed };
  }

  return submission;
}
