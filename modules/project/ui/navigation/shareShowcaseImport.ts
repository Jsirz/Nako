export async function restoreShowcaseArchive(archiveUrl: string): Promise<string> {
  const archiveResponse = await fetch(archiveUrl);
  if (!archiveResponse.ok) throw new Error('案例文件读取失败。');
  const response = await fetch('/api/workflows/restore?copy=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: await archiveResponse.blob(),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || typeof result?.id !== 'string')
    throw new Error(result?.error || '案例工作流导入失败。');
  return result.id;
}

export async function previewShowcaseArchive(archiveUrl: string): Promise<Record<string, unknown>> {
  const archiveResponse = await fetch(archiveUrl);
  if (!archiveResponse.ok) throw new Error('案例文件读取失败。');
  const response = await fetch('/api/workflows/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: await archiveResponse.blob(),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.workflow || typeof result.workflow !== 'object')
    throw new Error(result?.error || '案例预览失败。');
  return result.workflow as Record<string, unknown>;
}
