import { FolderPlus } from 'lucide-react';
export function DashboardFolderAction({ busy, onCreate }: { busy: boolean; onCreate(): void }) {
  return (
    <button type="button" className="nako-dashboard-button" disabled={busy} onClick={onCreate}>
      <FolderPlus size={16} />
      <span>新建文件夹</span>
    </button>
  );
}
