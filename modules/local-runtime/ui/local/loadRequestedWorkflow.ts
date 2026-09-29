import type { WorkflowManagerClient } from './workflowManagerClient';
import type { WorkflowManagerOptions } from './workflowManagerTypes';
import type { createWorkflowManagerView } from './createWorkflowManagerView';
import type { createWorkflowManagerActions } from './createWorkflowManagerActions';
import { stageReachable } from './workflowManagerBindings';
import { messageFor } from './workflowManagerControls';
export async function loadRequestedWorkflow(
  view: ReturnType<typeof createWorkflowManagerView>,
  actions: ReturnType<typeof createWorkflowManagerActions>,
  client: WorkflowManagerClient,
  options: WorkflowManagerOptions,
  render: () => void,
) {
  const { requestedDefinitionId, session, state, canvasNodeEditContext } = view;
  const { resetDraft, applyHydratedState, hydrate } = actions;

  if (!requestedDefinitionId) return;
  session.requestedDefinitionState = 'loading';
  session.requestedDefinitionError = '';
  resetDraft();
  render();
  try {
    if (canvasNodeEditContext) {
      const snapshot = await client.getEditorSnapshot(requestedDefinitionId);
      state.definitions = [snapshot.definition];
      state.projects = [];
      state.projectId = undefined;
      session.projectsLoaded = false;
      applyHydratedState(snapshot);
    } else {
      const [definition, projects] = await Promise.all([
        client.getDefinition(requestedDefinitionId),
        client.listProjects(),
      ]);
      state.definitions = [definition];
      state.projects = projects;
      state.projectId = projects[0]?.id;
      session.projectsLoaded = true;
      await hydrate(definition);
    }
    session.requestedDefinitionState = 'ready';
    if (options.initialStage !== undefined && stageReachable(state, options.initialStage))
      state.activeStage = options.initialStage;
  } catch (error) {
    session.requestedDefinitionState = 'error';
    session.requestedDefinitionError = messageFor(error);
  }
  render();
}
