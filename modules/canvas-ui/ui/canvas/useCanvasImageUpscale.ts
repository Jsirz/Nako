import { mediaCanvas } from '../../../kernel/browser';
import type { CanvasImageUpscaleBinding as Binding } from '../../../contracts/mediaCanvas';

export function useCanvasImageUpscale(
  React: Pick<typeof import('react'), 'useRef' | 'useEffect' | 'useLayoutEffect' | 'useCallback'>,
  options: Omit<Binding, 'projectId' | 'isActive'> & { projectId?: string; enabled: boolean },
) {
  const currentRef = React.useRef(options);
  React.useLayoutEffect(() => {
    currentRef.current = options;
  });
  const sessionRef = React.useRef<ReturnType<ReturnType<typeof mediaCanvas>['createUpscale']> | null>(null);
  React.useEffect(() => {
    if (!options.projectId || !options.enabled) return;
    const projectId = options.projectId;
    const owned = mediaCanvas().createUpscale({
      projectId,
      getNodes: () => currentRef.current.getNodes(),
      isActive: () => currentRef.current.enabled && currentRef.current.projectId === projectId,
      setNodes: (value) => currentRef.current.setNodes(value),
      select: (ids) => currentRef.current.select(ids),
    });
    sessionRef.current = owned;
    return () => {
      owned.dispose();
      if (sessionRef.current === owned) sessionRef.current = null;
    };
  }, [options.projectId, options.enabled]);
  return React.useCallback((id: string) => {
    void sessionRef.current
      ?.start(id)
      .catch((error: unknown) =>
        window.alert(error instanceof Error ? error.message : '无法开始高清放大。'),
      );
  }, []);
}
