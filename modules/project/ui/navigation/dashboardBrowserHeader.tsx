import { ArrowLeft, FolderPlus, Search } from 'lucide-react';
import './dashboardBrowserHeader.css';

interface Props {
  title: string;
  query: string;
  busy: boolean;
  onBack(): void;
  onQueryChange(value: string): void;
  onCreateFolder(): void;
}

export function DashboardBrowserHeader({
  title,
  query,
  busy,
  onBack,
  onQueryChange,
  onCreateFolder,
}: Props) {
  return (
    <header className="nako-project-browser-header">
      <div className="nako-project-browser-title">
        <button type="button" onClick={onBack} aria-label="返回上一级">
          <ArrowLeft size={18} />
          <span>返回</span>
        </button>
        <span className="nako-project-browser-divider" />
        <h1>{title}</h1>
      </div>
      <div className="nako-project-browser-actions">
        <label className="nako-project-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="搜索项目"
            placeholder="搜索项目"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={onCreateFolder}>
          <FolderPlus size={16} />
          <span>新建文件夹</span>
        </button>
      </div>
    </header>
  );
}
