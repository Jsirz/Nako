import type { DashboardRuntime, DashboardIcon } from './dashboardRuntime';
export function DashboardDeleteConfirmation(
  _React: DashboardRuntime,
  props: {
    deleteTarget: { id: string; type: 'project' | 'folder'; name: string };
    setDeleteTarget(value: null): void;
    deleteProject(id: string): Promise<boolean>;
    deleteFolder(id: string): Promise<boolean>;
    CloseIcon: DashboardIcon;
  },
) {
  const { deleteTarget, setDeleteTarget, deleteProject, deleteFolder, CloseIcon } = props;
  return (
    <div
      className={
        'bg-[var(--nk-surface-raised)] border border-[var(--nk-border-control)] rounded-lg p-6 w-[400px] shadow-2xl animate-in zoom-in duration-200'
      }
    >
      <div className={'flex items-center justify-between mb-4'}>
        <h3 className={'text-xl font-bold text-[var(--nk-text)]'}>{'确认删除'}</h3>
        <button
          onClick={() => setDeleteTarget(null)}
          className={'text-[var(--nk-text-muted)] hover:text-[var(--nk-text)] transition-colors'}
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <p className={'text-[var(--nk-text-secondary)] text-sm mb-8 leading-relaxed'}>
        {'确定要删除'}
        {deleteTarget.type === 'project' ? '项目' : '文件夹'}{' '}
        <span className={'text-[var(--nk-text)] font-bold'}>
          {'"'}
          {deleteTarget.name}
          {'"'}
        </span>
        {' 吗？ 此操作无法撤销。'}
      </p>
      <div className={'flex gap-3 justify-end'}>
        <button
          onClick={() => setDeleteTarget(null)}
          className={
            'px-6 py-2.5 rounded-lg bg-[var(--nk-surface-raised)] hover:bg-[var(--nk-hover)] text-[var(--nk-text)] text-sm font-bold transition-colors'
          }
        >
          {'取消'}
        </button>
        <button
          onClick={() =>
            deleteTarget.type === 'project'
              ? deleteProject(deleteTarget.id)
              : deleteFolder(deleteTarget.id)
          }
          className={
            'px-6 py-2.5 rounded-lg bg-[var(--nk-danger-bg)] hover:bg-[var(--nk-danger-bg)] text-[var(--nk-text)] text-sm font-bold transition-colors'
          }
        >
          {'删除'}
        </button>
      </div>
    </div>
  );
}
