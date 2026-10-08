import type { CanvasWorkflowProps, WorkflowRecord } from '../../../contracts/projectWorkflow';
import type { ProjectHooks } from './canvasWorkflowHooks';
import { canvasProjectUi } from '../projectUiServices';
import { content, copy } from './canvasWorkflowDocument';
import { mergeWorkflow, sameWorkflowValue } from './workflowMerge';
import type { WorkflowState } from './canvasWorkflowState';

export function useWorkflowView(hooks: ProjectHooks, state: WorkflowState) {
  const { current, pendingView, notice, base } = state;
  const displayedView = hooks.useCallback(() => {
    const p = current.current;
    return {
      title: p.canvasTitle,
      nodes: p.nodes,
      groups: p.groups,
      viewport: p.viewport,
      isMinimapOpen: p.isMinimapOpen,
    };
  }, []);
  const view = hooks.useCallback(() => {
    const raw = displayedView();
    const pending = pendingView.current;
    if (!pending) return raw;
    const displayed = displayedView();
    if (pending.replacement) {
      if (sameWorkflowValue(displayed, pending.displayed)) return pending.after as typeof raw;
      const merged = content(mergeWorkflow(pending.after, displayed, raw));
      pendingView.current = sameWorkflowValue(raw, merged) ? null : {
        before: copy(raw), displayed: copy(displayed), after: copy(merged),
      };
      return merged as typeof raw;
    }
    const accepted = content(mergeWorkflow(pending.displayed, displayed, pending.after));
    const merged = content(mergeWorkflow(pending.before, raw, accepted));
    pendingView.current = sameWorkflowValue(raw, merged) ? null : {
      before: copy(raw), displayed: copy(displayed), after: copy(merged),
    };
    return merged as typeof raw;
  }, [displayedView]);
  hooks.useEffect(() => {
    if (pendingView.current) {
      try {
        view();
      } catch {
        /* Preserve baselines for explicit conflict handling. */
      }
    }
  });
  const apply = hooks.useCallback((document: WorkflowRecord, includeViewport = true) => {
    const p = current.current;
    const title = typeof document.title === 'string' ? document.title : 'Untitled';
    p.setNodes(document.nodes as WorkflowRecord[]);
    p.setGroups(document.groups as WorkflowRecord[]);
    p.setCanvasTitle(title);
    p.setEditingTitleValue(title);
    if (includeViewport && document.viewport) p.setViewport(document.viewport as CanvasWorkflowProps['viewport']);
    if (includeViewport && typeof document.isMinimapOpen === 'boolean') p.setIsMinimapOpen(document.isMinimapOpen);
  }, []);
  const showConflict = hooks.useCallback(() => {
    if (notice.current) return;
    const element = canvasProjectUi().createToast({
      message: '保存冲突：当前编辑仍保留，尚未全部保存。可下载副本后重新打开项目核对。', tone: 'danger',
    });
    element.dataset.nakoWorkflowConflict = 'true';
    Object.assign(element.style, {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      maxWidth: '420px',
      zIndex: '10000',
    });
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '下载当前副本';
    button.className = 'nako-button';
    button.style.marginTop = '10px';
    button.addEventListener('click', () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify({ ...base.current, ...displayedView() }, null, 2)], {
          type: 'application/json',
        }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'canvas-conflict.json';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    element.append(document.createElement('br'), button);
    document.body.append(element);
    notice.current = element;
  }, [displayedView]);
  return { displayedView, view, apply, showConflict };
}
export type WorkflowView = ReturnType<typeof useWorkflowView>;
