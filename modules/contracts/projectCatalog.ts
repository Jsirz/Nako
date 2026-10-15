export interface DashboardProject {
  id: string; title: string; folderId?: string | null; coverUrl?: string; nodeCount?: number;
  createdAt?: string; updatedAt?: string; [key: string]: unknown;
}
export interface DashboardFolder {
  id: string; name: string; projectCount?: number; parentId?: string | null;
  createdAt?: string; updatedAt?: string; [key: string]: unknown;
}
export interface DashboardData { projects: DashboardProject[]; folders: DashboardFolder[] }
export interface ProjectCatalogClient {
  load(signal?: AbortSignal): Promise<DashboardData>;
  createFolder(parentId: string | null, signal?: AbortSignal): Promise<DashboardFolder>;
  renameFolder(folder: DashboardFolder, name: string, signal?: AbortSignal): Promise<unknown>;
  renameProject(id: string, title: string, signal?: AbortSignal): Promise<unknown>;
  moveProject(id: string, folderId: string | null, signal?: AbortSignal): Promise<unknown>;
  deleteProject(id: string, signal?: AbortSignal): Promise<unknown>;
  deleteFolder(id: string, signal?: AbortSignal): Promise<unknown>;
  previewCleanup(id: string, signal?: AbortSignal): Promise<string[]>;
  cleanupProject(id: string, signal?: AbortSignal): Promise<unknown>;
}
export interface ProjectCatalogService { createClient(fetcher?: typeof fetch): ProjectCatalogClient }
