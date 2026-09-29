import type { CanvasComponent } from '../../../canvas-ui/api/ui/app/canvasComponentType';
import type * as React from 'react';

export type DashboardRuntime = Pick<
  typeof React,
  | 'createElement'
  | 'Fragment'
  | 'useState'
  | 'useRef'
  | 'useEffect'
  | 'useLayoutEffect'
  | 'useMemo'
  | 'useCallback'
>;
export type DashboardIcon = CanvasComponent;
