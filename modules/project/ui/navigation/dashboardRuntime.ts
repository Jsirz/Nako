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
export type DashboardIcon =
  | Exclude<React.ElementType, string>
  | (keyof React.JSX.IntrinsicElements &
      (keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap));
