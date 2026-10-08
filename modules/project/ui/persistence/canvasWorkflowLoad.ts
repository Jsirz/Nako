import type { ProjectDocument, WorkflowRecord } from '../../../contracts/projectWorkflow';
import type { ProjectHooks } from './canvasWorkflowHooks';
import { createModuleLogger } from '../../../kernel/logger.js';
import { projectMediaRecovery } from '../projectUiServices';
import { freshProjectDocument } from './canvasProjectDocument';
import { copy, content, request, validateDocument } from './canvasWorkflowDocument';
import type { WorkflowState } from './canvasWorkflowState';
import type { WorkflowView } from './canvasWorkflowView';
const logger = createModuleLogger('project.workflow');

export function useWorkflowLoad(hooks: ProjectHooks, state: WorkflowState, ui: WorkflowView) {
  const { epoch, loading, queue, base, targetId, pendingView, blocked, dismiss,
    setId, setRevision, current, setPanel, setPanelY } = state;
  const { apply, displayedView } = ui;
  const handleLoadWorkflow = hooks.useCallback(async (id: string) => {
    const owner = ++epoch.current;
    loading.current = true;
    queue.current = Promise.resolve();
    try {
      const isPublic = id.startsWith('public:');
      const rawId = isPublic ? id.slice(7) : id;
      const data = validateDocument(await request(
        `/api/${isPublic ? 'public-workflows' : 'workflows'}/${encodeURIComponent(rawId)}`,
      ), isPublic ? undefined : rawId);
      if (owner !== epoch.current) return null;
      const document = copy(data);
      if (isPublic) {
        document.id = null;
        document.revision = 0;
        document.status = 'work';
        document.folderId = null;
        delete document.createdAt;
        delete document.updatedAt;
      }
      base.current = copy(document);
      document.nodes = (document.nodes as WorkflowRecord[]).map(node => projectMediaRecovery().interruptedMediaNode(node));
      targetId.current = isPublic ? null : rawId;
      pendingView.current = {
        before: copy(displayedView()), displayed: copy(displayedView()),
        after: copy(content({ ...displayedView(), ...document })),
      };
      blocked.current = false;
      dismiss();
      setId(targetId.current);
      setRevision(Number(document.revision ?? 0));
      apply(document);
      current.current.setSelectedNodeIds([]);
      setPanel(false);
      return { ...document, nodeCount: (document.nodes as unknown[]).length };
    } catch (error) {
      if (owner === epoch.current) logger.error('项目读取失败。', { projectId: id, error });
      return null;
    } finally {
      if (owner === epoch.current) loading.current = false;
    }
  }, [apply, dismiss, displayedView]);
  const getWorkflowEpoch = hooks.useCallback(() => epoch.current, []);
  const importDocument = hooks.useCallback((input: ProjectDocument, projectId: string = crypto.randomUUID()) => {
    const document = freshProjectDocument(input, projectId);
    validateDocument(document);
    epoch.current += 1;
    loading.current = false;
    queue.current = Promise.resolve();
    base.current = copy(document);
    targetId.current = String(document.id);
    pendingView.current = {
      before: copy(displayedView()), displayed: copy(displayedView()),
      after: copy(content({ ...displayedView(), ...document })), replacement: true,
    };
    blocked.current = false;
    dismiss();
    setId(targetId.current);
    setRevision(0);
    apply(document);
    current.current.setSelectedNodeIds([]);
    setPanel(false);
    return document;
  }, [apply, dismiss, displayedView]);
  const resetWorkflowId = hooks.useCallback(() => {
    epoch.current += 1;
    loading.current = false;
    base.current = null;
    pendingView.current = null;
    targetId.current = null;
    queue.current = Promise.resolve();
    blocked.current = false;
    dismiss();
    setId(null);
    setRevision(0);
  }, [dismiss]);
  const handleWorkflowsClick = hooks.useCallback((event: { currentTarget: HTMLElement }) => {
    setPanelY(event.currentTarget.getBoundingClientRect().top);
    setPanel(value => !value);
    current.current.onPanelOpen?.();
  }, []);
  const closeWorkflowPanel = hooks.useCallback(() => setPanel(false), []);
  return { handleLoadWorkflow, getWorkflowEpoch, importDocument, resetWorkflowId,
    handleWorkflowsClick, closeWorkflowPanel };
}
