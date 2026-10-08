import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
export async function restoreShowcaseArchive(archiveUrl: string): Promise<string> {
  const response = await fetch('/api/workflows/restore?copy=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archive: archiveUrl }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || typeof result?.id !== 'string')
    throw new ProjectError(PROJECT_ERRORS.request, result?.error || '案例工作流导入失败。', { status: response.status, context: { operation: 'restoreShowcase', archiveUrl } });
  return result.id;
}

export async function previewShowcaseArchive(archiveUrl: string): Promise<Record<string, unknown>> {
  const response = await fetch('/api/workflows/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archive: archiveUrl }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.workflow || typeof result.workflow !== 'object')
    throw new ProjectError(PROJECT_ERRORS.request, result?.error || '案例预览失败。', { status: response.status, context: { operation: 'previewShowcase', archiveUrl } });
  return result.workflow as Record<string, unknown>;
}
