import { canvasError } from '../../../contracts/canvasErrors.js';
import { useEffect, useState } from 'react';

interface ProjectItem {
  id: string;
  title: string;
  updatedAt?: string;
}

interface Props {
  currentProjectId: string | null;
  busy: boolean;
  onSwitch(id: string): void;
}

export function CanvasProjectSwitcher({ currentProjectId, busy, onSwitch }: Props) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/workflows', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw canvasError('项目列表读取失败', 'project-switcher.load');
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.some((item) =>
          !item || typeof item.id !== 'string' || typeof item.title !== 'string')) {
          throw canvasError('项目列表数据无效', 'project-switcher.validate');
        }
        return data as ProjectItem[];
      })
      .then((data) => setProjects(data.sort((a, b) =>
        (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0))))
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '项目列表读取失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  return (
    <div className="border-t border-[var(--nk-border-control)] mt-1 pt-1" aria-label="切换项目">
      <div className="px-2.5 py-1 text-xs text-[var(--nk-text-muted)]">切换项目</div>
      {loading ? <div className="px-2.5 py-2 text-xs text-[var(--nk-text-muted)]">正在加载...</div>
        : error ? <button type="button" onClick={() => setRetry((value) => value + 1)}
          className="w-full px-2.5 py-2 text-left text-xs text-[var(--nk-danger)]">
          {error}，点击重试
        </button>
        : projects.length === 0 ? <div className="px-2.5 py-2 text-xs text-[var(--nk-text-muted)]">暂无项目</div>
        : <div className="max-h-52 overflow-y-auto">
            {projects.map((project) => (
              <button key={project.id} type="button" disabled={busy || project.id === currentProjectId}
                onClick={() => onSwitch(project.id)} title={project.title}
                className="w-full h-9 px-2.5 rounded-md text-left text-sm text-[var(--nk-text)] hover:bg-[var(--nk-surface-raised)] disabled:opacity-50 flex items-center gap-2">
                <span className="truncate flex-1">{project.title}</span>
                {project.id === currentProjectId && <span className="text-xs text-[var(--nk-text-muted)]">当前</span>}
              </button>
            ))}
          </div>}
    </div>
  );
}
