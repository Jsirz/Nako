import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';

interface ApiErrorBody {
  error?: string;
  code?: string;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(path, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw localRuntimeError(body.error || `请求失败（HTTP ${response.status}）`, 'request',
      body.code || 'WORKFLOW_MANAGER_REQUEST_FAILED', response.status);
  }
  return response.json() as Promise<T>;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(localRuntimeError('无法读取工作流文件', 'fileToBase64', ERRORS.invalidConfiguration, undefined, reader.error));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function mediaAssetType(mediaKind: string) {
  return mediaKind === 'audio' ? 'audios' : mediaKind === 'video' ? 'videos' : 'images';
}

export function mediaContentType(file: File, mediaKind: string) {
  if (file.type) return file.type;
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const byExtension: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    bmp: 'image/bmp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/x-m4v',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    flac: 'audio/flac',
  };
  if (extension === 'webm') return mediaKind === 'audio' ? 'audio/webm' : 'video/webm';
  return (
    byExtension[extension] ||
    (mediaKind === 'audio' ? 'audio/mpeg' : mediaKind === 'video' ? 'video/mp4' : 'image/png')
  );
}
