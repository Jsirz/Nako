import type { CanvasNode, CanvasGroup } from './canvasDocument';
import type { CanvasViewport } from './projectUi';
import type { GenerationAuthorization } from './generationUi';
import type { ProjectDocument, WorkflowSaveOptions } from './projectWorkflow';

export type StateSetter<T> = (value: T | ((current: T) => T)) => void;
export interface LoadedCanvasProject extends Record<string, unknown> {
  nodes: CanvasNode[];
  groups: CanvasGroup[];
  folderId?: string | null;
  lastSavedAt?: number;
  lastSavedBy?: string;
  revision?: number;
}
export interface CanvasSaveReceipt { id?: string; revision?: number; unchanged?: boolean }
export interface CanvasSaveFeedbackOptions {
  enabled: boolean;
  getWorkflowEpoch(): number;
  getNodes(): Array<{ id: string; type?: unknown; resultUrl?: unknown; lastFrame?: unknown }>;
  getSelectedCoverId(): string | null | undefined;
  folderId?: string | null;
  userNo?: string;
  saveWorkflow(cover?: string, folderId?: string | null, options?: WorkflowSaveOptions): Promise<CanvasSaveReceipt>;
  setDirty(value: boolean): void;
  setSavedAt(value: number): void;
  setSavedBy(value: string): void;
  setSavedRevision(value: number): void;
}
export type CanvasSave = (request?: { manual?: boolean; reportFailure?: boolean }) => Promise<CanvasSaveReceipt | null>;
export type CanvasFileEvent = { target: { files: ArrayLike<Pick<File, 'name' | 'text'>> | null; value: string } };
export interface CanvasProjectFileOptions {
  view: string;
  projectId?: string | null;
  getWorkflowEpoch(): number;
  getNodes(): CanvasNode[];
  setNodes: StateSetter<CanvasNode[]>;
  setGroups: StateSetter<Record<string, unknown>[]>;
  setSelectedNodeIds(ids: string[]): void;
  importDocument(document: ProjectDocument, projectId?: string): ProjectDocument;
  onOpened(document: ProjectDocument): void;
  onChanged(): void;
  report?(message: string): void;
  createId?(): string;
}
export interface CanvasProjectTransferOptions {
  enabled: boolean;
  getWorkflowEpoch(): number;
  save(): Promise<CanvasSaveReceipt | null | undefined>;
  openProject(id: string): Promise<unknown>;
  openJson(event: { target: { files: File[]; value: string } }): Promise<void>;
}
export interface CanvasWorkflowBinding {
  workflowId: string | null;
  workflowRevision: number;
  isWorkflowPanelOpen: boolean;
  workflowPanelY: number;
  handleSaveWorkflow(cover?: string, folderId?: string | null, options?: WorkflowSaveOptions): Promise<CanvasSaveReceipt>;
  handleLoadWorkflow(id: string): Promise<LoadedCanvasProject | null>;
  getWorkflowEpoch(): number;
  importDocument(document: ProjectDocument, projectId?: string): ProjectDocument;
  resetWorkflowId(title?: string): void;
  handleWorkflowsClick(event: { currentTarget: HTMLElement }): void;
  closeWorkflowPanel(): void;
  useSaveFeedback(options: CanvasSaveFeedbackOptions): CanvasSave;
  useProjectFiles(options: CanvasProjectFileOptions): {
    handleOpenProjectFile(event: CanvasFileEvent): Promise<void>;
    handleMergeProjectFile(event: CanvasFileEvent): Promise<void>;
  };
  useProjectTransfer(options: CanvasProjectTransferOptions): {
    exportWorkflow(): Promise<void>;
    importWorkflow(file: File): Promise<void>;
    transferring: boolean;
  };
}
export interface CanvasGenerationBinding {
  handleGenerate(id: string, authorization?: GenerationAuthorization): Promise<void> | undefined;
}
export interface CanvasLocalWorkflowBinding {
  handleMiniMaxH3T2VAGenerate(id: string): Promise<void> | undefined;
}
export interface CanvasSnapshotBinding {
  handleVideoSnapshot(id: string, data: string): Promise<void> | undefined;
  handleVideoFirstLastSnapshot(id: string, first: string, last: string): Promise<void> | undefined;
}
export interface CanvasAudioTrimBinding {
  handleAudioTrim(id: string, start: number, end: number): Promise<boolean> | undefined;
}
export interface CanvasAssetBinding {
  isCreateAssetModalOpen: boolean;
  setIsCreateAssetModalOpen: StateSetter<boolean>;
  nodeToSnapshot: CanvasNode | null;
  assetCategories: string[];
  handleOpenCreateAsset(id: string): void;
  handleSaveAssetToLibrary(name: string, category: string, ownership?: string): Promise<void>;
  handleContextUpload(files: ArrayLike<File>): Promise<void> | undefined;
  handleClipboardImagePaste(files: ArrayLike<File>, point: { x: number; y: number }): Promise<void> | undefined;
  handleReplaceMedia(id: string, file: File): Promise<void> | undefined;
}
export interface CanvasMediaOptions {
  nodes: CanvasNode[];
  getNodes(): CanvasNode[];
  projectId?: string;
  enabled: boolean;
  setNodes: StateSetter<CanvasNode[]>;
  setSelectedNodeIds?: StateSetter<string[]>;
  viewport?: CanvasViewport;
  contextMenu?: { x: number; y: number };
}
export interface CanvasMediaEditingBindings {
  useCanvasCollage(options: CanvasMediaOptions & { selectedNodeIds: string[]; getNodeWidth(node: CanvasNode): number; getNodeHeight(node: CanvasNode): number }): () => Promise<boolean> | undefined;
  useCanvasImageEditSave(options: CanvasMediaOptions & { title: string; getNodeWidth(node: CanvasNode): number }): (id: string, data: string, dimensions?: { width: number; height: number }) => Promise<void>;
  useCanvasCompositeSave(options: CanvasMediaOptions & { getNodeWidth(node: CanvasNode): number }): (id: string, data: string, layout: Record<string, unknown>) => Promise<void>;
  useCanvasCropSave(options: CanvasMediaOptions & { getNodeWidth(node: CanvasNode): number; getNodeHeight(node: CanvasNode): number }): (id: string, outputs: Array<{ data: string; width: number; height: number; row: number; column: number }>, onProgress?: (count: number) => void) => Promise<void>;
}
