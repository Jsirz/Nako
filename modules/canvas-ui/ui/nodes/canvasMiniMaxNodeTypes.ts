import type { CanvasComponent } from '../app/canvasComponentType';
import type * as ReactTypes from 'react';
import type { MiniMaxH3CanvasNode } from '../../../asset-media/api/ui/media/minimaxH3';

export type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'Fragment' | 'useState' | 'useRef' | 'useEffect' | 'useLayoutEffect'
>;
export interface NodeData extends MiniMaxH3CanvasNode {
  status?: string;
  errorMessage?: string;
  isMiniMaxSettingsOpen?: boolean;
}
export interface Props {
  data: NodeData;
  selected?: boolean;
  projectId?: string;
  onUpdate(id: string, patch: Partial<NodeData>): void;
  onNodePointerDown?: ReactTypes.PointerEventHandler;
  onContextMenu?: ReactTypes.MouseEventHandler;
  onConnectorDown(event: ReactTypes.PointerEvent, id: string, side: 'left' | 'right', port: number): void;
  zoom: number;
  isHoveredForConnection?: boolean;
  isInvalidHover?: boolean;
  onMouseEnter?: ReactTypes.MouseEventHandler;
  onMouseLeave?: ReactTypes.MouseEventHandler;
  onMiniMaxH3T2VAGenerate?: (id: string) => unknown;
  connectedImageNodes?: MiniMaxH3CanvasNode[];
}
export interface Components {
  Frame: CanvasComponent;
  PromptEditor: ReactTypes.ComponentType<{
    value: string;
    onChange(value: string): void;
    connectedAssets: MiniMaxH3CanvasNode[];
    placeholder: string;
    type: string;
    isDark: boolean;
  }>;
}
export type Menu = 'mode' | 'ratio' | 'resolution' | 'audio' | 'duration' | null;
