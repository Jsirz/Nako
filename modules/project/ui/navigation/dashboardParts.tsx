import type * as ReactTypes from 'react';
import type { DashboardRuntime, DashboardIcon } from './dashboardRuntime';
import type { DashboardProject, DashboardFolder } from './projectDashboardData';
import { canvasProjectUi } from '../projectUiServices';
export function DashboardErrorStatus(
  _React: DashboardRuntime,
  props: { error: string; busy: boolean; loading: boolean; refresh(): Promise<boolean> },
) {
  return (
    <div role="alert" style={{ color: 'var(--nk-danger)', padding: '8px 0', fontSize: 13 }}>
      {props.error}{' '}
      <button disabled={props.busy || props.loading} onClick={() => void props.refresh()}>
        刷新列表
      </button>
    </div>
  );
}
export interface ModalProps {
  label: string;
  busy: boolean;
  onDismiss(): void;
  error: string;
  onRefresh(): Promise<boolean>;
  children: ReactTypes.ReactNode;
}
export function DashboardModal(React: DashboardRuntime, props: ModalProps) {
  const surface = React.useRef<HTMLDivElement>(null),
    currentRef = React.useRef(props);
  currentRef.current = props;
  React.useEffect(() => {
    if (surface.current)
      return canvasProjectUi().activateModal(surface.current, () => {
        if (!currentRef.current.busy) currentRef.current.onDismiss();
      });
  }, []);
  return (
    <div
      className="fixed inset-0 bg-[var(--nk-overlay)] backdrop-blur-sm flex items-center justify-center z-[110]"
      style={{ zIndex: 210 }}
    >
      <div
        ref={surface}
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        style={{
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 32px)',
          overflow: 'auto',
        }}
      >
        <fieldset disabled={props.busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          {props.children}
        </fieldset>
        {props.busy && (
          <p role="status" style={{ background: 'var(--nk-surface-raised)', padding: 12 }}>
            正在处理…
          </p>
        )}
        {props.error && (
          <div
            role="alert"
            style={{
              background: 'var(--nk-surface-raised)',
              color: 'var(--nk-danger)',
              padding: 12,
            }}
          >
            {props.error}{' '}
            <button disabled={props.busy} onClick={() => void props.onRefresh()}>
              刷新列表
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
export function DashboardBreadcrumbs(
  React: DashboardRuntime,
  props: {
    home: boolean;
    folderId: string | null;
    setFolderId(id: string | null): void;
    breadcrumbs: DashboardFolder[];
    projects: DashboardProject[];
    HomeIcon: DashboardIcon;
  },
) {
  const { home, folderId, setFolderId, breadcrumbs, projects, HomeIcon } = props;
  return (
    <div
      hidden={home}
      className={'nako-dashboard-breadcrumb flex items-center gap-2 mb-8 text-[17px]'}
    >
      <button
        onClick={() => setFolderId(null)}
        className={`flex items-center gap-2 transition-colors hover:text-[var(--nk-text)] font-bold ${folderId ? 'text-[var(--nk-text-muted)]' : 'text-[var(--nk-text)]'}`}
      >
        <HomeIcon size={18} className={'transition-colors'} />
        <span>{'项目'}</span>
      </button>
      {breadcrumbs.map((item, value) => (
        <React.Fragment key={item.id}>
          <span className={'text-[var(--nk-text-muted)] mx-1'}>{'/'}</span>
          <button
            onClick={() => setFolderId(item.id)}
            className={`transition-colors hover:text-[var(--nk-text)] font-bold ${value === breadcrumbs.length - 1 ? 'text-[var(--nk-text)]' : 'text-[var(--nk-text-muted)]'}`}
          >
            {item.name}
            {value === breadcrumbs.length - 1 && (
              <span className={'text-[var(--nk-text-muted)] text-sm font-normal ml-2'}>
                {'('}
                {projects.filter((candidate) => candidate.folderId === item.id).length}
                {')'}
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export function DashboardCleanupStatus(_React: DashboardRuntime, LoadingIcon: DashboardIcon) {
  return (
    <div
      className={
        'bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg p-8 flex flex-col items-center gap-4 shadow-2xl'
      }
    >
      <LoadingIcon size={40} className={'text-[var(--nk-info)] animate-spin'} />
      <div className={'text-[var(--nk-text)] font-bold'}>{'正在清理项目中未使用的素材...'}</div>
      <div className={'text-[var(--nk-text-muted)] text-sm'}>{'请稍候，这可能需要一点时间'}</div>
    </div>
  );
}
