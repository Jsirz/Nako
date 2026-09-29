import type { DashboardRuntime, DashboardIcon } from './dashboardRuntime';
export interface DashboardHeaderProps {
  onNewProject(): void;
}
export interface DashboardHeaderIcons {
  SettingsIcon: DashboardIcon;
  AddIcon: DashboardIcon;
}
export function ProjectDashboardHeader(
  _React: DashboardRuntime,
  { onNewProject }: DashboardHeaderProps,
  { SettingsIcon, AddIcon }: DashboardHeaderIcons,
) {
  return (
    <header className="nako-dashboard-header">
      <div className="nako-dashboard-nav">
        <div className="nako-dashboard-brand">
          <img src="/nako-logo.png" alt="Nako 画布 Logo" />
          <b>Nako</b>
          <span>画布</span>
        </div>
        <div className="nako-dashboard-actions">
          <button
            type="button"
            className="nako-dashboard-button"
            onClick={() => window.dispatchEvent(new CustomEvent('nako:open-settings'))}
          >
            <SettingsIcon size={16} />
            <span>设置</span>
          </button>
          <button
            type="button"
            className="nako-dashboard-button nako-dashboard-primary"
            onClick={onNewProject}
          >
            <AddIcon size={17} />
            <span>新建项目</span>
          </button>
        </div>
      </div>
    </header>
  );
}
