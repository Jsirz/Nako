import { createStableElement as element } from '../../../kernel/ui/dom';
import { currentStage, stageReachable } from './workflowManagerBindings';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button } from './workflowManagerControls';
import { STAGES } from './workflowManagerEvents';
import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState, StageIndex } from './workflowManagerTypes';

export function renderWorkflowStages(
  rail: HTMLDivElement,
  state: ManagerState,
  compactCloud: boolean,
  session: WorkflowManagerSession,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
  client: WorkflowManagerClient,
  render: () => void,
) {
  return () => {
    rail.replaceChildren();
    const achieved = currentStage(state);
    const visibleStages = compactCloud ? [3, 4] : STAGES.map((_, index) => index);
    visibleStages.forEach((index, visibleIndex) => {
      const label = STAGES[index];
      const stage = button('', 'ghost');
      stage.className = 'fwm-stage';
      const stageIndex = index as StageIndex;
      if (stageIndex === state.activeStage) stage.classList.add('is-current');
      else if (stageIndex < achieved) stage.classList.add('is-done');
      stage.disabled = !stageReachable(state, stageIndex);
      stage.append(
        element('span', 'fwm-stage-dot', stageIndex < achieved ? '✓' : String(visibleIndex + 1)),
        element('span', '', label),
      );
      stage.addEventListener('click', () => {
        if (stageIndex === 3 && !session.projectsLoaded) {
          void runBusy('正在读取测试项目…', async () => {
            state.projects = await client.listProjects();
            state.projectId = state.projects[0]?.id;
            session.projectsLoaded = true;
            state.activeStage = stageIndex;
          });
          return;
        }
        state.activeStage = stageIndex;
        render();
      });
      rail.append(stage);
    });
  };
}
