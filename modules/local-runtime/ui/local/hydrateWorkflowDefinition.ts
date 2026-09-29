import { latestBindingDescendant } from './workflowManagerBindings';
import type {
WorkflowDefinition,
WorkflowEditorSnapshot,
WorkflowManagerClient,
WorkflowRun,
} from './workflowManagerClient';

export function hydrateWorkflowDefinition(
  client: WorkflowManagerClient,
  applyHydratedState: (hydrated: WorkflowEditorSnapshot) => void,
) {
  return async (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => {
    const hydrated: WorkflowEditorSnapshot = {
      definition,
      deployment: null,
      candidates: [],
      bindingSet: null,
      attestation: null,
      verifiedRun: null,
      verifiedOutputCandidates: [],
      outputBindingSet: null,
    };
    if (definition.executionPlan) {
      const deployments = await client.listDeployments(definition.id);
      hydrated.deployment =
        deployments.find((item) => item.id === restoredRun?.deploymentId) || deployments[0] || null;
      if (hydrated.deployment) {
        [hydrated.candidates] = await Promise.all([
          client.listBindingCandidates(definition.id, hydrated.deployment.id),
        ]);
        const bindingSets = await client.listBindingSets(definition.id);
        hydrated.bindingSet =
          bindingSets.find((item) => item.id === restoredRun?.bindingSetId) ||
          bindingSets.at(-1) ||
          null;
        if (!restoredRun && hydrated.bindingSet) {
          const attestations = await client.listAttestations(definition.id);
          const matching = attestations.find(
            (item) =>
              item.definitionRevision === definition.revision &&
              item.executionPlanHash === definition.executionPlan?.executionPlanHash &&
              item.deploymentId === hydrated.deployment?.id,
          );
          if (matching) {
            hydrated.attestation = matching;
            hydrated.bindingSet =
              latestBindingDescendant(bindingSets, matching.bindingSetId) ||
              bindingSets.find((item) => item.id === matching.bindingSetId) ||
              hydrated.bindingSet;
            try {
              const [verifiedRun, outputBindingSets] = await Promise.all([
                client.getRun(matching.runId),
                client.listOutputBindingSets(definition.id),
              ]);
              if (verifiedRun.status === 'success') {
                hydrated.verifiedRun = verifiedRun;
                hydrated.verifiedOutputCandidates = await client.listOutputCandidates(
                  definition.id,
                  matching.runId,
                );
                hydrated.outputBindingSet =
                  outputBindingSets.find((item) => item.id === matching.outputBindingSetId) || null;
              }
            } catch {
              // A historical proof may outlive the bounded run journal. Keep the editor usable.
            }
          }
        }
      }
    }
    applyHydratedState(hydrated);
  };
}
