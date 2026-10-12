import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import type { ShowcaseCacheClearResult } from '../../../contracts/showcaseCache';

export function mountShowcaseCacheSettings(host: HTMLElement, fetcher: typeof fetch = globalThis.fetch) {
  const panel = document.createElement('section');
  panel.className = 'mt-6 p-8 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg space-y-6';
  const title = document.createElement('h3');
  title.className = 'text-xl font-bold text-[var(--nk-text)]'; title.textContent = '缓存管理';
  const description = document.createElement('p');
  description.className = 'text-sm text-[var(--nk-text-secondary)]';
  description.textContent = '清除作品视频与案例预览的本地缓存，下次打开时重新下载。画布、素材库、技能和已下载的文件会保留。';
  const button = document.createElement('button');
  button.type = 'button'; button.textContent = '清除缓存';
  button.className = 'px-3 py-2 rounded-lg border border-[var(--nk-border-control)] text-sm text-[var(--nk-text)] hover:bg-[var(--nk-hover)] disabled:opacity-50';
  const message = document.createElement('p');
  message.className = 'min-h-5 text-sm text-[var(--nk-text-secondary)]'; message.setAttribute('role', 'status');
  panel.append(title, description, button, message); host.append(panel);
  let disposed = false;
  const controller = new AbortController();
  button.addEventListener('click', async () => {
    if (button.disabled || disposed || !window.confirm('清除当前用户的作品视频和案例预览缓存？下次打开作品时会重新下载。')) return;
    button.disabled = true; button.textContent = '正在清除…'; message.textContent = '';
    message.style.color = 'var(--nk-text-secondary)';
    try {
      const response = await fetcher('/api/showcase/cache/clear', { method: 'POST', signal: controller.signal });
      const result = await response.json() as ShowcaseCacheClearResult & { error?: string };
      if (!response.ok || result?.success !== true) throw new ProjectError(PROJECT_ERRORS.cacheClear,
        result?.error || '缓存清除失败，请稍后重试。', { status: response.status, context: { operation: 'clearShowcaseCache' } });
      if (!disposed) message.textContent = '缓存已清除，下次打开作品时将重新下载。';
    } catch (error) {
      if (!disposed) {
        message.textContent = error instanceof Error ? error.message : '缓存清除失败，请稍后重试。';
        message.style.color = 'var(--nk-danger)';
      }
    } finally { if (!disposed) { button.disabled = false; button.textContent = '清除缓存'; } }
  });
  return () => { disposed = true; controller.abort(); panel.remove(); };
}
