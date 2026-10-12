import type { CanvasWorkflowProps, WorkflowRecord } from '../../../contracts/projectWorkflow';
import type { ProjectHooks } from './canvasWorkflowHooks';

export function useWorkflowState(hooks: ProjectHooks, props: CanvasWorkflowProps) {
  const [workflowId, setId] = hooks.useState<string | null>(null);
  const [workflowRevision, setRevision] = hooks.useState(0);
  const [isWorkflowPanelOpen, setPanel] = hooks.useState(false);
  const [workflowPanelY, setPanelY] = hooks.useState(0);
  const current = hooks.useRef(props);
  const base = hooks.useRef<WorkflowRecord | null>(null);
  const defaultTitle = hooks.useRef<string | undefined>(undefined);
  const targetId = hooks.useRef<string | null>(null);
  const epoch = hooks.useRef(0);
  const loading = hooks.useRef(false);
  const queue = hooks.useRef<Promise<unknown>>(Promise.resolve());
  const notice = hooks.useRef<HTMLElement | null>(null);
  const blocked = hooks.useRef(false);
  const pendingView = hooks.useRef<{
    before: WorkflowRecord;
    displayed: WorkflowRecord;
    after: WorkflowRecord;
    replacement?: boolean;
  } | null>(null);
  hooks.useEffect(() => {
    current.current = props;
  });
  const dismiss = hooks.useCallback(() => {
    notice.current?.remove();
    notice.current = null;
  }, []);
  hooks.useEffect(() => () => {
    epoch.current += 1;
    dismiss();
  }, [dismiss]);
  return {
    workflowId, setId, workflowRevision, setRevision, isWorkflowPanelOpen,
    setPanel, workflowPanelY, setPanelY, current, base, targetId, epoch,
    loading, queue, notice, blocked, pendingView, dismiss, defaultTitle,
  };
}
export type WorkflowState = ReturnType<typeof useWorkflowState>;
