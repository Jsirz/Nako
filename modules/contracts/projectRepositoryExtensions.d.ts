import type { Project, SaveResult, ProjectRepository } from './index.js';
import type { CanvasNode } from './canvasDocument';
import type { ProjectFileStore } from './projectFiles';

/** The dashboard lists metadata; loading a document requires get(id). */
export interface ProjectSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  coverUrl: string | null;
  folderId: string | null;
  status: string;
}
export interface ProjectFolder {
  id: string;
  name: string;
  parentId: string | null;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectFolderInput {
  id?: string;
  name?: string;
  parentId?: string | null;
  projectCount?: number;
  createdAt?: string;
}
export interface ProjectDirectoryRepository {
  listFolders(): Promise<ProjectFolder[]>;
  getFolderById(id: string): Promise<ProjectFolder | null>;
  saveFolder(folder: ProjectFolderInput): Promise<ProjectFolder>;
  deleteFolder(id: string): Promise<boolean>;
  clearFolderReferences(id: string): Promise<string[]>;
  syncFolderProjectCounts(): Promise<void>;
}
export interface ProjectRecoveryPoint {
  id: string;
  workflowId: string;
  revision: number;
  reason: string;
  createdAt: string;
}
export interface ProjectQuarantineEntry {
  id: string;
  workflowId: string;
  detectedAt: string;
  reason: string;
  action: 'recovered' | 'isolated';
  recoveryPointId: string | null;
}
export interface ProjectStartupRecovery {
  workflowId: string;
  action: 'recovered' | 'isolated';
  recoveryPointId: string | null;
  quarantineId: string;
  revision: number;
}
export interface ProjectRecoveryRepository {
  createWorkflowRecoveryPoint(id: string, reason?: string): Promise<ProjectRecoveryPoint | null>;
  listWorkflowRecoveryPoints(id: string): Promise<ProjectRecoveryPoint[]>;
  restoreWorkflowRecoveryPoint(id: string, recoveryPointId: string): Promise<SaveResult | null>;
  getStartupRecoveryReport(): ProjectStartupRecovery[];
  listWorkflowQuarantine(): Promise<ProjectQuarantineEntry[]>;
}
/** Work completes inside one atomic catalog transaction. No SQL is exposed. */
export interface ProjectCatalogTransaction {
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
}
export interface ProjectCatalog {
  workflows: Project[];
  folders: ProjectFolder[];
}
export interface ProjectNodeSanitizer {
  sanitizeWorkflowNodes(nodes: CanvasNode[], projectId: string): CanvasNode[];
}
export interface ProjectStorageServices {
  repository: ProjectRepository;
  directories: ProjectDirectoryRepository;
  recovery: ProjectRecoveryRepository;
  transactions: ProjectCatalogTransaction;
  files: ProjectFileStore;
}
