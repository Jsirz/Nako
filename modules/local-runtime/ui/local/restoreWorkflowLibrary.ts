import { currentStage } from './workflowManagerBindings';
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import type {
WorkflowDefinition,
WorkflowManagerClient,
WorkflowRun,
} from './workflowManagerClient';
import { messageFor } from './workflowManagerControls';
import { isCloudDefinition } from './workflowManagerMetadata';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState,WorkflowManagerOptions } from './workflowManagerTypes';
import { clearRunReference,readRunReference } from './workflowRunSession';

export function restoreWorkflowLibrary(
  libraryContext: boolean,
  loadOfficial: () => Promise<void>,
  session: WorkflowManagerSession,
  render: () => void,
  client: WorkflowManagerClient,
  options: WorkflowManagerOptions,
  state: ManagerState,
  loadDeployedRecords: (definitions?: WorkflowDefinition[]) => Promise<void>,
  pollRun: (runId: string, token: number) => Promise<void>,
  hydrate: (definition: WorkflowDefinition, restoredRun?: WorkflowRun) => Promise<void>,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
) {
  if (libraryContext && UI_FEATURES.runningHub)
    void loadOfficial().then(() => {
      if (!session.officialWorkflows.length && !session.officialError)
        session.librarySection = 'mine';
      render();
    });
  void Promise.all([client.listDefinitions(), client.listProjects()])
    .then(async ([definitions, projects]) => {
      const scopedDefinitions =
        options.scope === 'cloud'
          ? definitions.filter(isCloudDefinition)
          : options.scope === 'local'
            ? definitions.filter((definition) => !isCloudDefinition(definition))
            : definitions;
      state.definitions = scopedDefinitions;
      state.projects = projects;
      state.projectId = projects[0]?.id;
      session.projectsLoaded = true;
      await loadDeployedRecords(scopedDefinitions);
      const saved = readRunReference();
      const savedDefinition = saved
        ? scopedDefinitions.find((definition) => definition.id === saved.definitionId)
        : undefined;
      const unfinishedDefinition = !libraryContext
        ? scopedDefinitions.find(
            (definition) =>
              !state.deployedRecords.some((record) => record.definition.id === definition.id),
          )
        : undefined;
      if (saved && savedDefinition) {
        state.selected = savedDefinition;
        state.run = {
          runId: saved.runId,
          status: 'loading',
          phase: 'restoring-run',
          definitionId: savedDefinition.id,
        };
        state.activeStage = currentStage(state);
        session.pollToken += 1;
        void pollRun(saved.runId, session.pollToken);
      } else if (unfinishedDefinition) {
        if (saved) clearRunReference();
        await hydrate(unfinishedDefinition);
      } else if (scopedDefinitions[0] && state.deployedRecords.length === 0) {
        if (saved) clearRunReference();
        await hydrate(scopedDefinitions[0]);
      } else if (saved) {
        clearRunReference();
      }
      render();
    })
    .catch((error) => {
      render();
      setNotice(messageFor(error), 'error');
    });
}
