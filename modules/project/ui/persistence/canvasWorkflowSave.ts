import type { WorkflowRecord, WorkflowSaveOptions } from '../../../contracts/projectWorkflow';
import type { ProjectHooks } from './canvasWorkflowHooks';
import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import { copy, content, request, stale, validateDocument } from './canvasWorkflowDocument';
import { mergeWorkflow, sameWorkflowValue, WorkflowConflictError } from './workflowMerge';
import type { WorkflowState } from './canvasWorkflowState';
import type { WorkflowView } from './canvasWorkflowView';

export function useWorkflowSave(hooks: ProjectHooks, state: WorkflowState, ui: WorkflowView) {
  const { epoch, loading, blocked, targetId, base, setId, setRevision, pendingView, queue, dismiss } = state;
  const { view, displayedView, apply, showConflict } = ui;
  return hooks.useCallback(
    (coverUrl?: string, folderId?: string | null, options: WorkflowSaveOptions = {}) => {
      const owner = epoch.current;
      const run = async () => {
        if (owner !== epoch.current || loading.current) throw stale();
        if (blocked.current) throw new WorkflowConflictError('document');
        try {
          targetId.current ??= crypto.randomUUID();
          const original = copy(base.current ?? {
            id: targetId.current,
            revision: 0,
            nodes: [],
            groups: [],
            title: 'Untitled',
          });
          const startView = copy(view());
          let draft = copy({
            ...original,
            ...startView,
            id: targetId.current,
            revision: Number(original.revision ?? 0),
            ...(folderId !== undefined ? { folderId } : {}),
            ...(coverUrl !== undefined ? { coverUrl } : {}),
            createBackup: !!options.createBackup,
            lastSavedBy: options.savedBy,
            lastSavedAt: options.savedAt,
          });
          const post = (document: WorkflowRecord) => request('/api/workflows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(document),
          });
          let result: WorkflowRecord;
          try {
            result = await post(draft);
          } catch (error) {
            if ((error as { code?: string }).code !== 'REVISION_CONFLICT') throw error;
            if (owner !== epoch.current) throw stale();
            const remote = validateDocument(
              await request(`/api/workflows/${encodeURIComponent(String(draft.id))}`),
              String(draft.id),
            );
            if (owner !== epoch.current) throw stale();
            draft = mergeWorkflow(original, draft, remote) as typeof draft;
            result = await post(draft);
          }
          if (owner !== epoch.current) throw stale();
          if (
            result.success === false ||
            result.id !== draft.id ||
            typeof result.revision !== 'number' ||
            !Number.isInteger(result.revision) ||
            result.revision <= Number(draft.revision)
          ) {
            throw new ProjectError(PROJECT_ERRORS.invalidDocument, '保存回执无效，尚不能确认保存成功。', {
              context: { operation: 'acceptSaveReceipt', projectId: draft.id },
            });
          }
          const latestView = copy(view());
          const unchanged = sameWorkflowValue(startView, latestView);
          const saved: WorkflowRecord = { ...draft, revision: result.revision };
          delete saved.createBackup;
          base.current = saved;
          setId(String(result.id));
          setRevision(Number(result.revision));
          if (!sameWorkflowValue(startView, content(draft))) {
            try {
              const rebased = unchanged ? saved : mergeWorkflow(
                { ...original, ...startView },
                { ...original, ...latestView },
                saved,
              );
              pendingView.current = {
                before: copy(displayedView()),
                displayed: copy(displayedView()),
                after: copy(content(rebased)),
              };
              apply(rebased);
            } catch {
              blocked.current = true;
              showConflict();
              return { id: result.id, revision: result.revision, unchanged: false };
            }
          }
          dismiss();
          return { id: result.id, revision: result.revision, unchanged };
        } catch (error) {
          if (owner === epoch.current && (error as { code?: string }).code === 'REVISION_CONFLICT') {
            blocked.current = true;
            showConflict();
          }
          throw error;
        }
      };
      const operation = queue.current.then(run, run);
      queue.current = operation.catch(() => undefined);
      return operation;
    }, [view, displayedView, apply, dismiss, showConflict],
  );
}
