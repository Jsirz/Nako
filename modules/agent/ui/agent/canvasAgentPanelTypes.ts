import type * as ReactTypes from 'react';
import type { CanvasComponent } from '../../../canvas-ui/api/ui/app/canvasComponentType';
import type { CanvasActionHandler } from '../../../contracts/canvasControlProtocol.js';
import type { AgentVision } from './agentVision';
import type { AgentNode } from './agentClient';
import type { CanvasProjectControl } from './canvasProjectControl';
import type { CanvasProductControl } from './canvasProductControl';
import type { CanvasBudgetControl } from './canvasBudgetControl';
import type { CanvasCreationControl } from './canvasCreationControl';

export type Runtime = Pick<
  typeof ReactTypes,
  | 'createElement'
  | 'Fragment'
  | 'useState'
  | 'useEffect'
  | 'useRef'
  | 'useMemo'
  | 'useSyncExternalStore'
  | 'useLayoutEffect'
>;
export interface Parameter {
  key: string;
  label: string;
  type: string;
  default?: string | number | boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string | number }>;
}
export interface AgentModel {
  vision?: AgentVision;
  id: string;
  label: string;
  advancedParams: Parameter[];
}
export interface Props {
  isOpen: boolean;
  onClose(): void;
  userName?: string;
  isDraggingNode?: boolean;
  panelWidth?: number;
  onResizeWidth?(width: number): void;
  nodes?: AgentNode[];
  selectedReferenceNodes?: Array<{
    nodeId: string;
    url: string;
    type?: 'image' | 'video' | 'audio';
  }>;
  onLocateNode?(id: string): void;
  projectId?: string;
  selectedNodeIds?: string[];
  onCreateTextNode?(text: string): string;
  onCanvasAction?: CanvasActionHandler;
  canvasCreation?: CanvasCreationControl;
  canvasProjects?: CanvasProjectControl;
  canvasBudgets?: CanvasBudgetControl;
  canvasProducts?: CanvasProductControl;
}
export type Icons = Record<
  | 'Tooltip'
  | 'Message'
  | 'ImageIcon'
  | 'BackIcon'
  | 'Spinner'
  | 'HistoryIcon'
  | 'DeleteIcon'
  | 'AddIcon'
  | 'CloseIcon'
  | 'UploadIcon'
  | 'ChatIcon'
  | 'SettingsIcon'
  | 'ChevronIcon'
  | 'SendIcon',
  CanvasComponent
>;
export const EMPTY_NODES: AgentNode[] = [];
export const EMPTY_REFERENCES: NonNullable<Props['selectedReferenceNodes']> = [];
