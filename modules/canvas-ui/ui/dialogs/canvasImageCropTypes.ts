import type { CanvasComponent } from '../app/canvasComponentType';
import type * as ReactTypes from 'react';
import type { CropHandle, CropOutput, CropPoint, CropRect } from './imageCropGeometry';

export type Runtime = Pick<
  typeof ReactTypes,
  | 'createElement'
  | 'useState'
  | 'useRef'
  | 'useEffect'
  | 'useLayoutEffect'
  | 'useCallback'
  | 'useMemo'
  | 'Suspense'
  | 'Component'
>;
export interface Props {
  saveLabel?: string;
  variant?: 'crop' | 'grid' | 'panorama';
  node?: { id: string; resultUrl?: string };
  projectId?: string;
  onClose(): void;
  onSave(
    id: string,
    outputs: CropOutput[],
    onProgress: (completed: number) => void,
  ): Promise<unknown> | unknown;
}
export interface Dependencies {
  Close: CanvasComponent;
  Save: CanvasComponent;
  Spinner: CanvasComponent;
  Globe: CanvasComponent;
  Chevron: CanvasComponent;
  Canvas: CanvasComponent;
  Scene: CanvasComponent;
  Vector2: new () => { x: number; y: number };
  toneMapping: number;
  colorSpace: string;
}
export interface CropGesture {
  id: number;
  start: CropPoint;
  rect: CropRect;
  kind: CropHandle | 'move' | 'create' | 'row' | 'column';
  index?: number;
}
