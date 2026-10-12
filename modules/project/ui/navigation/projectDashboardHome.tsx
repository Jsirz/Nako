import * as React from 'react';
import { ArrowUpRight, Clock3, Plus, Sparkles } from 'lucide-react';
import { browserHost } from '../../../kernel/browser';
import type { DashboardProject } from './projectDashboardData';
import { DashboardCover } from './dashboardCover';
import { ShareShowcase } from './shareShowcase';
import './projectDashboardHome.css';

interface Props {
  projects: DashboardProject[];
  loading: boolean;
  onNewProject(): void;
  onOpenProject(id: string): void;
  onBrowseProjects(): void;
  onPreviewShowcase(archiveUrl: string): Promise<void>;
}
function recentDate(value?: string) {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return '尚未编辑';
  const days = Math.floor(Math.max(0, Date.now() - time) / 86400000);
  return days === 0
    ? '今天编辑'
    : days === 1
      ? '昨天编辑'
      : days < 30
        ? days + ' 天前编辑'
        : new Date(time).toLocaleDateString('zh-CN');
}
export function ProjectDashboardHome({
  projects,
  loading,
  onNewProject,
  onOpenProject,
  onBrowseProjects,
  onPreviewShowcase,
}: Props) {
  const SkillShowcase = browserHost.services.optional<{ Home?: React.ComponentType }>(
    'ui.agent.surfaces',
  )?.Home;
  const recent = [...projects].sort(
    (a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0),
  );
  return (
    <div className="nako-home">
      <HomeHero />
      <RecentProjects
        recent={recent}
        loading={loading}
        onBrowseProjects={onBrowseProjects}
        onOpenProject={onOpenProject}
        onNewProject={onNewProject}
      />
      {SkillShowcase ? (
        <SkillShowcase />
      ) : (
        <section className="nako-home-section">
          <div className="nako-home-section-head">
            <h2>
              <Sparkles size={17} />
              技能灵感库
            </h2>
          </div>
          <p className="nako-home-empty">启用 Agent 插件后，可在这里浏览和使用技能。</p>
        </section>
      )}
      <ShareShowcase onPreview={onPreviewShowcase} />
    </div>
  );
}

function HomeHero() {
  return (
    <section className="nako-home-hero" aria-labelledby="nako-home-title">
      <div className="nako-home-intro">
        <span className="nako-home-eyebrow">
          <span />
          你的创作空间
        </span>
        <h1 id="nako-home-title">
          让灵感，
          <br />在<em>画布</em>上发生。
        </h1>
        <p>从一个想法开始，连接文字、图像与视频，构建属于你的创作工作流。</p>
      </div>
    </section>
  );
}

function RecentProjects({
  recent,
  loading,
  onBrowseProjects,
  onOpenProject,
  onNewProject,
}: {
  recent: DashboardProject[];
  loading: boolean;
  onBrowseProjects(): void;
  onOpenProject(id: string): void;
  onNewProject(): void;
}) {
  return (
    <section className="nako-home-section" aria-labelledby="nako-recent-title">
      <div className="nako-home-section-head">
        <h2 id="nako-recent-title">
          <Clock3 size={17} />
          最近项目
        </h2>
        <button className="nako-home-text-button" onClick={onBrowseProjects}>
          全部项目 <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="nako-home-carousel">
        <div className="nako-home-recent-grid">
          <button type="button" className="nako-recent-create" onClick={onNewProject}>
            <span className="nako-recent-create-icon">
              <Plus size={24} />
            </span>
            <span className="nako-recent-copy">
              <strong>新建画布</strong>
              <small>空白起点，无限可能</small>
            </span>
            <ArrowUpRight size={15} />
          </button>
          {recent.map((project) => (
            <button
              key={project.id}
              className="nako-recent-card"
              onClick={() => onOpenProject(project.id)}
            >
              <span className="nako-recent-cover">
                <DashboardCover url={project.coverUrl} title="" />
              </span>
              <span className="nako-recent-copy">
                <strong>{project.title}</strong>
                <small>{recentDate(project.updatedAt)}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      </div>
      {!recent.length && (
        <p className="nako-home-empty" role="status">
          {loading ? '正在读取最近项目…' : '还没有最近项目，从上方新建一张画布吧。'}
        </p>
      )}
    </section>
  );
}
