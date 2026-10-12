import { PROJECT_ERRORS, ProjectError } from '../../../contracts/projectErrors.js';

/** Only application-owned showcase directories may be cleared. */
export function createShowcaseCacheMaintenance({ files, directories }) {
  let active = 0, clearing = false;
  const busy = () => new ProjectError(PROJECT_ERRORS.cacheBusy,
    '作品缓存正在使用或清理中，请关闭作品预览并等待下载或导入完成后重试。',
    { status: 409, context: { operation: 'clearShowcaseCache' } });
  return {
    acquire() {
      if (clearing) throw busy();
      active++;
      let released = false;
      return () => { if (!released) { released = true; active--; } };
    },
    async clear() {
      if (active || clearing) throw busy();
      clearing = true;
      try {
        for (const directory of directories) await files.remove(directory, { recursive: true, force: true });
        return { success: true };
      } catch (cause) {
        throw new ProjectError(PROJECT_ERRORS.cacheClear, '缓存清除失败，请稍后重试。',
          { status: 500, cause, context: { operation: 'clearShowcaseCache' } });
      } finally { clearing = false; }
    },
  };
}
