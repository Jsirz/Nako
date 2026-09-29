import { createStableElement as element } from '../../../canvas-ui/api/ui/design/dom';
import { DeployedWorkflowRecord } from './workflowManagerTypes';

export function appendWorkflowCards(
  deployedRecords: DeployedWorkflowRecord[],
  createDeployedCard: (record: DeployedWorkflowRecord) => HTMLElement,
  panel: HTMLDivElement,
) {
  const records = element('div', 'fwm-card-grid');
  for (const record of deployedRecords) records.append(createDeployedCard(record));
  panel.append(records);
  return records;
}
