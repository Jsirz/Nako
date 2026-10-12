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
  _props: DashboardHeaderProps,
  { SettingsIcon }: DashboardHeaderIcons,
) {
  return (
    <header className="nako-dashboard-header">
      <div className="nako-dashboard-nav">
        <div className="nako-dashboard-brand">
          <img src="/nako-logo.png" alt="NAKO Agent 纳科画布智能体 Logo" />
          <b>NAKO Agent</b>
          <span>纳科画布智能体</span>
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
        </div>
      </div>
    </header>
  );
}
