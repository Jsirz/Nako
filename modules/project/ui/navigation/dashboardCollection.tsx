import * as React from 'react';
import type { DashboardProject, DashboardFolder } from './projectDashboardData';
import type { DashboardCardProps } from './projectDashboardCards';
import { Plus } from 'lucide-react';
import './dashboardCollection.css';

interface Props {
  projects: DashboardProject[];
  folders: DashboardFolder[];
  allProjects: DashboardProject[];
  loading: boolean;
  onNewProject(): void;
  cardProps(id: string, type: 'project' | 'folder'): DashboardCardProps;
  ProjectCard: React.ComponentType<DashboardCardProps & { project: DashboardProject }>;
  FolderCard: React.ComponentType<
    DashboardCardProps & { folder: DashboardFolder; projects: DashboardProject[] }
  >;
}
export function DashboardCollection(props: Props) {
  const {
    projects,
    folders,
    allProjects,
    cardProps,
    ProjectCard,
    FolderCard,
    loading,
    onNewProject,
  } = props;
  if (!projects.length && !folders.length && loading)
    return (
      <div className="nako-home-empty" role="status">
        {loading ? '正在读取项目…' : '这里还没有项目，试试新建一张画布。'}
      </div>
    );
  return (
    <div className="nako-collection-grid">
      <button type="button" className="nako-project-create-card" onClick={onNewProject}>
        <span className="nako-project-create-cover">
          <Plus size={27} />
          <span>开始创作</span>
        </span>
        <span className="nako-project-create-copy">
          <strong>创建新画布</strong>
          <small>从空白画布开始构建工作流</small>
        </span>
      </button>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          projects={allProjects}
          {...cardProps(folder.id, 'folder')}
        />
      ))}
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} {...cardProps(project.id, 'project')} />
      ))}
    </div>
  );
}
