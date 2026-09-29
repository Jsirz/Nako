import type { WorkflowManagerClient } from './workflowManagerClient';
import { ManagerState,WorkflowManagerOptions } from './workflowManagerTypes';

export function syncWorkflowCanvasNode(
  options: WorkflowManagerOptions,
  state: ManagerState,
  client: WorkflowManagerClient,
) {
  return async () => {
    if (
      !options.nodeId ||
      !state.selected ||
      !state.bindingSet ||
      (!state.attestation && !state.deployment)
    )
      return false;
    const blueprint = await client.createCanvasNode(state.selected.id, {
      ...(state.attestation
        ? { attestationId: state.attestation.id }
        : { deploymentId: state.deployment!.id }),
      bindingSetId: state.bindingSet.id,
      title: state.nodeTitle.trim() || state.selected.name,
    });
    window.dispatchEvent(
      new CustomEvent('nako:update-workflow-node', {
        detail: { nodeId: options.nodeId, blueprint },
      }),
    );
    return true;
  };
}
