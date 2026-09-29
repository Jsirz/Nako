import { latestBindingDescendant } from './workflowManagerBindings';
import type {
WorkflowDefinition,
WorkflowManagerClient
} from './workflowManagerClient';
import { automaticWorkflowCover } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { DeployedWorkflowRecord,ManagerState } from './workflowManagerTypes';

export function loadWorkflowRecords(
  state: ManagerState,
  session: WorkflowManagerSession,
  client: WorkflowManagerClient,
  libraryContext: boolean,
) {
  return async (definitions = state.definitions) => {
    session.libraryReadFailures = [];
    const loadRecord = async (definition: WorkflowDefinition) => {
      if (!definition.executionPlan) return undefined;
      try {
        const attestations = await client.listAttestations(definition.id);
        const attestation = [...attestations]
          .filter(
            (item) =>
              item.definitionRevision === definition.revision &&
              item.executionPlanHash === definition.executionPlan?.executionPlanHash,
          )
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
        if (!attestation && !libraryContext) return undefined;
        const [deployments, bindingSets] = await Promise.all([
          client.listDeployments(definition.id),
          client.listBindingSets(definition.id),
        ]);
        const deployment = attestation
          ? deployments.find((item) => item.id === attestation.deploymentId)
          : deployments[0];
        const bindingSet = attestation
          ? latestBindingDescendant(bindingSets, attestation.bindingSetId) ||
            bindingSets.find((item) => item.id === attestation.bindingSetId)
          : bindingSets.at(-1);
        if (!deployment || !bindingSet) return undefined;
        const run = attestation
          ? await client.getRun(attestation.runId).catch(() => undefined)
          : undefined;
        return {
          definition,
          attestation,
          deployment,
          bindingSet,
          automaticCover: automaticWorkflowCover(run),
        } satisfies DeployedWorkflowRecord;
      } catch {
        session.libraryReadFailures.push(definition);
        return undefined;
      }
    };
    const records: Array<DeployedWorkflowRecord | undefined> = new Array(definitions.length);
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(4, definitions.length) }, async () => {
        while (next < definitions.length) {
          const index = next++;
          records[index] = await loadRecord(definitions[index]);
        }
      }),
    );
    state.deployedRecords = records.flatMap((item) => (item ? [item] : []));
  };
}
