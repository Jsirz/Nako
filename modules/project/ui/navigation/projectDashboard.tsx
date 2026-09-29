import { DashboardDeleteConfirmation } from './dashboardDeleteConfirmation';
import type * as ReactTypes from 'react';
import type { DashboardRuntime, DashboardIcon } from './dashboardRuntime';
import {
  createDashboardClient,
  dashboardBreadcrumb,
  visibleDashboard,
} from './projectDashboardData';
import { useProjectDashboard } from './useProjectDashboard';
import {
  DashboardModal,
  DashboardErrorStatus,
  DashboardCleanupStatus,
  type ModalProps,
} from './dashboardParts';
import type { DashboardHeaderProps } from './projectDashboardHeader';
import type { DashboardCardProps } from './projectDashboardCards';
import type { DashboardMenuProps } from './projectDashboardMenu';
import type { DashboardProject, DashboardFolder } from './projectDashboardData';
import { ProjectDashboardHome } from './projectDashboardHome';
import { DashboardCollection } from './dashboardCollection';
import { DashboardBrowserHeader } from './dashboardBrowserHeader';
import { previewShowcaseArchive } from './shareShowcaseImport';
export interface ProjectDashboardProps {
  onOpenProject(id: string): void;
  onNewProject(folderId: string | null): void;
  onOpenShowcasePreview(workflow: Record<string, unknown>, archiveUrl: string): void;
  initialFolderId?: string | null;
}
interface Components {
  DashboardHeader: ReactTypes.ComponentType<DashboardHeaderProps>;
  FolderCard: ReactTypes.ComponentType<
    DashboardCardProps & {
      folder: DashboardFolder;
      projects: DashboardProject[];
    }
  >;
  ProjectCard: ReactTypes.ComponentType<DashboardCardProps & { project: DashboardProject }>;
  ContextMenu: ReactTypes.ComponentType<DashboardMenuProps>;
  HomeIcon: DashboardIcon;
  CloseIcon: DashboardIcon;
  FolderIcon: DashboardIcon;
  LoadingIcon: DashboardIcon;
}
interface Target {
  id: string;
  type: 'project' | 'folder';
}
export function ProjectDashboard(
  React: DashboardRuntime,
  props: ProjectDashboardProps,
  components: Components,
) {
  const { onOpenProject, onNewProject, onOpenShowcasePreview, initialFolderId = null } = props;
  const {
    DashboardHeader,
    FolderCard,
    ProjectCard,
    ContextMenu,
    HomeIcon,
    CloseIcon,
    FolderIcon,
    LoadingIcon,
  } = components;
  const client = React.useMemo(() => createDashboardClient(), []);
  const { projects, folders, setData, loading, loaded, busy, error, refresh, mutate } =
    useProjectDashboard(React, client);
  const [folderId, setFolderId] = React.useState(initialFolderId);
  const [showAllProjects, setShowAllProjects] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [contextMenu, setContextMenu] = React.useState<(Target & { x: number; y: number }) | null>(
      null,
    ),
    [renaming, setRenaming] = React.useState<Target | null>(null),
    [moveProjectId, setMoveProjectId] = React.useState<string | null>(null),
    [deleteTarget, setDeleteTarget] = React.useState<
      (Target & { isOpen: boolean; name: string }) | null
    >(null),
    [cleanupPreview, setCleanupPreview] = React.useState<{
      id: string;
      files: string[];
    } | null>(null),
    [cleaningProjectId, setCleaningProjectId] = React.useState<string | null>(null);
  const currentFolderRef = React.useRef(folderId);
  currentFolderRef.current = folderId;
  const aliveRef = React.useRef(false);
  React.useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  React.useEffect(() => {
    if (loaded && folderId && !folders.some((folder) => folder.id === folderId)) setFolderId(null);
  }, [loaded, folders, folderId]);
  const breadcrumbs = dashboardBreadcrumb(folders, folderId),
    { folders: visibleFolders, projects: visibleProjects } = visibleDashboard(
      { projects, folders },
      folderId,
      search,
      'all',
      'recent',
      'newest',
    );
  const createFolder = () => {
    const parentId = folderId;
    setSearch('');
    return mutate(
      (signal) => client.createFolder(parentId, signal),
      (folder) => {
        setData((data) => ({
          ...data,
          folders: [...data.folders.filter((item) => item.id !== folder.id), folder],
        }));
        if (currentFolderRef.current === parentId) {
          setRenaming({ id: folder.id, type: 'folder' });
        }
      },
    );
  };
  const renameFolder = (id: string, name: string) => {
    const folder = folders.find((item) => item.id === id);
    if (!folder) return Promise.resolve(false);
    return mutate(
      (signal) => client.renameFolder(folder, name, signal),
      () =>
        setData((data) => ({
          ...data,
          folders: data.folders.map((item) => (item.id === id ? { ...item, name } : item)),
        })),
    );
  };
  const renameProject = (id: string, title: string) =>
    mutate(
      (signal) => client.renameProject(id, title, signal),
      () =>
        setData((data) => ({
          ...data,
          projects: data.projects.map((item) => (item.id === id ? { ...item, title } : item)),
        })),
    );
  const deleteProject = (id: string) =>
    mutate(
      (signal) => client.deleteProject(id, signal),
      () => {
        setDeleteTarget(null);
        setData((data) => ({
          ...data,
          projects: data.projects.filter((item) => item.id !== id),
        }));
      },
    );
  const deleteFolder = (id: string) =>
    mutate(
      (signal) => client.deleteFolder(id, signal),
      () => {
        setDeleteTarget(null);
        setData((data) => ({
          projects: data.projects.map((item) =>
            item.folderId === id ? { ...item, folderId: null } : item,
          ),
          folders: data.folders.filter((item) => item.id !== id),
        }));
      },
    );
  const moveProject = (id: string, target: string | null) =>
    mutate(
      (signal) => client.moveProject(id, target, signal),
      () => {
        setMoveProjectId(null);
        setData((data) => ({
          ...data,
          projects: data.projects.map((item) =>
            item.id === id ? { ...item, folderId: target } : item,
          ),
        }));
      },
    );
  const cleanupProject = async (id: string, confirmed = false) => {
    if (busy) return;
    setCleaningProjectId(id);
    await mutate(
      (signal) =>
        confirmed ? client.cleanupProject(id, signal) : client.previewCleanup(id, signal),
      (result) => {
        if (confirmed) setCleanupPreview(null);
        else setCleanupPreview({ id, files: result as string[] });
      },
      false,
    );
    if (aliveRef.current) setCleaningProjectId(null);
  };
  const moveSourceFolder =
    projects.find((project) => project.id === moveProjectId)?.folderId || null;
  const Modal = React.useMemo(() => (props: ModalProps) => DashboardModal(React, props), [React]);
  const home = !folderId && !showAllProjects;
  const previewShowcase = async (archiveUrl: string) =>
    onOpenShowcasePreview(await previewShowcaseArchive(archiveUrl), archiveUrl);
  const cardProps = (id: string, type: 'project' | 'folder'): DashboardCardProps => ({
    onOpen: type === 'project' ? onOpenProject : setFolderId,
    onMenu: (event, candidate) =>
      setContextMenu({ x: event.clientX, y: event.clientY, type, id: candidate }),
    onRename: type === 'project' ? renameProject : renameFolder,
    isRenaming: renaming?.id === id && renaming.type === type,
    onRenameComplete: () => setRenaming(null),
  });
  const collection = (
    <DashboardCollection
      projects={visibleProjects}
      folders={visibleFolders}
      allProjects={projects}
      loading={loading}
      onNewProject={() => onNewProject(folderId)}
      cardProps={cardProps}
      ProjectCard={ProjectCard}
      FolderCard={FolderCard}
    />
  );
  return (
    <div
      data-nako-project-dashboard="true"
      className={
        'nako-dashboard min-h-screen bg-[var(--nk-input)] text-[var(--nk-text)] flex flex-col'
      }
    >
      <DashboardHeader onNewProject={() => onNewProject(folderId)} />
      <main
        data-nako-project-scroll="true"
        aria-busy={loading || busy}
        className="nako-dashboard-main"
      >
        {!home && (
          <DashboardBrowserHeader
            title={folderId ? breadcrumbs.at(-1)?.name || '项目' : '全部项目'}
            query={search}
            busy={busy}
            onBack={() => {
              const parentId = folders.find((folder) => folder.id === folderId)?.parentId;
              if (parentId) setFolderId(parentId);
              else if (folderId) {
                setShowAllProjects(true);
                setFolderId(null);
              } else {
                setShowAllProjects(false);
              }
            }}
            onQueryChange={setSearch}
            onCreateFolder={() => void createFolder()}
          />
        )}
        {!moveProjectId &&
          !deleteTarget &&
          !cleanupPreview &&
          !cleaningProjectId &&
          error &&
          DashboardErrorStatus(React, { error, busy, loading, refresh })}
        {loading && !home && (
          <p role="status" className="text-sm text-[var(--nk-text-secondary)]">
            正在读取项目…
          </p>
        )}
        {home ? (
          <ProjectDashboardHome
            projects={projects}
            loading={loading}
            onNewProject={() => onNewProject(null)}
            onOpenProject={onOpenProject}
            onBrowseProjects={() => {
              setSearch('');
              setShowAllProjects(true);
            }}
              onPreviewShowcase={previewShowcase}
          />
        ) : collection}
      </main>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onOpen={() =>
            contextMenu.type === 'project'
              ? onOpenProject(contextMenu.id)
              : setFolderId(contextMenu.id)
          }
          onRename={() => {
            setRenaming({ id: contextMenu.id, type: contextMenu.type });
            setContextMenu(null);
          }}
          onDelete={() => {
            const item =
              contextMenu.type === 'project'
                ? projects.find((value) => value.id === contextMenu.id)
                : folders.find((value) => value.id === contextMenu.id);
            if (item) {
              setDeleteTarget({
                isOpen: !0,
                type: contextMenu.type,
                id: contextMenu.id,
                name: String(contextMenu.type === 'project' ? item.title : item.name),
              });
            }
          }}
          onMove={contextMenu.type === 'project' ? () => setMoveProjectId(contextMenu.id) : void 0}
          onCleanup={contextMenu.type === 'project' ? () => cleanupProject(contextMenu.id) : void 0}
        />
      )}
      {moveProjectId && (
        <Modal
          label="移动至"
          busy={busy}
          onDismiss={() => {
            setMoveProjectId(null);
          }}
          error={error}
          onRefresh={refresh}
        >
          <div
            className={
              'bg-[var(--nk-surface-raised)] border border-[var(--nk-border-control)] rounded-lg p-6 w-[450px] shadow-2xl animate-in zoom-in duration-200'
            }
          >
            <div className={'flex items-center justify-between mb-6'}>
              <h3 className={'text-xl font-bold text-[var(--nk-text)]'}>{'移动至...'}</h3>
              <button
                onClick={() => setMoveProjectId(null)}
                className={
                  'text-[var(--nk-text-muted)] hover:text-[var(--nk-text)] transition-colors'
                }
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <div className={'space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar'}>
              <button
                onClick={() => moveProject(moveProjectId, null)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-all border ${moveSourceFolder === null ? 'bg-[var(--nk-info-bg)] border-[var(--nk-info)] text-[var(--nk-info)]' : 'bg-[var(--nk-surface-raised)] border-transparent hover:bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)]'}`}
              >
                <div className={'flex items-center gap-3'}>
                  <HomeIcon size={18} />
                  <span className={'font-medium'}>{'项目主页'}</span>
                </div>
                {moveSourceFolder === null && (
                  <div className={'w-2 h-2 rounded-full bg-[var(--nk-info-bg)]'} />
                )}
              </button>
              <div className={'h-px bg-[var(--nk-surface-raised)] my-2 mx-1'} />
              {folders.length === 0 ? (
                <div className={'text-center py-8 text-[var(--nk-text-muted)] text-sm'}>
                  {'暂无文件夹'}
                </div>
              ) : (
                folders.map((item) => {
                  return (
                    <button
                      onClick={() => moveProject(moveProjectId, item.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg transition-all border ${moveSourceFolder === item.id ? 'bg-[var(--nk-info-bg)] border-[var(--nk-info)] text-[var(--nk-info)]' : 'bg-[var(--nk-surface-raised)] border-transparent hover:bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)]'}`}
                      key={item.id}
                    >
                      <div className={'flex items-center gap-3'}>
                        <FolderIcon size={18} className={'text-[var(--nk-info)]'} />
                        <span className={'font-medium truncate max-w-[280px]'}>{item.name}</span>
                      </div>
                      {moveSourceFolder === item.id && (
                        <div className={'w-2 h-2 rounded-full bg-[var(--nk-info-bg)]'} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className={'flex justify-end mt-8'}>
              <button
                onClick={() => setMoveProjectId(null)}
                className={
                  'px-6 py-2.5 rounded-lg bg-[var(--nk-surface-raised)] hover:bg-[var(--nk-hover)] text-[var(--nk-text)] text-sm font-bold transition-colors'
                }
              >
                {'取消'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {deleteTarget && (
        <Modal
          label="确认删除"
          busy={busy}
          onDismiss={() => {
            setDeleteTarget(null);
          }}
          error={error}
          onRefresh={refresh}
        >
          {DashboardDeleteConfirmation(React, {
            deleteTarget,
            setDeleteTarget,
            deleteProject,
            deleteFolder,
            CloseIcon,
          })}
        </Modal>
      )}
      {cleanupPreview && (
        <Modal
          label="确认清理冗余素材"
          busy={busy}
          onDismiss={() => {
            setCleanupPreview(null);
          }}
          error={error}
          onRefresh={refresh}
        >
          <div
            className={
              'bg-[var(--nk-surface-raised)] border border-[var(--nk-border-control)] rounded-lg p-6 w-[500px] shadow-2xl animate-in zoom-in duration-200'
            }
          >
            <div className={'flex items-center justify-between mb-4'}>
              <h3 className={'text-xl font-bold text-[var(--nk-text)]'}>{'确认清理冗余素材'}</h3>
              <button
                onClick={() => setCleanupPreview(null)}
                className={
                  'text-[var(--nk-text-muted)] hover:text-[var(--nk-text)] transition-colors'
                }
              >
                <CloseIcon size={20} />
              </button>
            </div>
            <p className={'text-[var(--nk-text-secondary)] text-sm mb-4'}>
              {cleanupPreview.files.length
                ? '以下文件在当前画布中未被引用，确定要删除吗？'
                : '没有发现未引用的素材。'}
            </p>
            <div
              className={
                'bg-[var(--nk-input)] rounded-lg p-4 mb-8 max-h-[300px] overflow-y-auto border border-[var(--nk-border)] custom-scrollbar'
              }
            >
              <div className={'grid grid-cols-1 gap-1'}>
                {cleanupPreview.files.map((item, value) => (
                  <div
                    className={
                      'text-[12px] font-mono text-[var(--nk-text-secondary)] flex items-center gap-2'
                    }
                    key={value}
                  >
                    <span
                      className={'w-1.5 h-1.5 rounded-full bg-[var(--nk-danger-bg)] shrink-0'}
                    />
                    <span className={'truncate'}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={'flex gap-3 justify-end'}>
              <button
                onClick={() => setCleanupPreview(null)}
                className={
                  'px-6 py-2.5 rounded-lg bg-[var(--nk-surface-raised)] hover:bg-[var(--nk-hover)] text-[var(--nk-text)] text-sm font-bold transition-colors'
                }
              >
                {'取消'}
              </button>
              <button
                disabled={cleanupPreview.files.length === 0}
                onClick={() => cleanupProject(cleanupPreview.id, !0)}
                className={
                  'px-6 py-2.5 rounded-lg bg-[var(--nk-info-bg)] hover:bg-[var(--nk-info-bg)] text-[var(--nk-text)] text-sm font-bold transition-colors shadow-lg shadow-blue-900/20'
                }
              >
                {'确认清理 ('}
                {cleanupPreview.files.length}
                {' 个文件)'}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {cleaningProjectId && (
        <Modal
          label="正在检查素材"
          busy={busy}
          onDismiss={() => {}}
          error={error}
          onRefresh={refresh}
        >
          {DashboardCleanupStatus(React, LoadingIcon)}
        </Modal>
      )}
    </div>
  );
}
