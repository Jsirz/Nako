import type { CanvasNode, CanvasGroup } from './canvasDocument';
import type { CanvasViewport } from './projectUi';

export type WorkflowRecord = Record<string, unknown>;
export interface ProjectDocument extends WorkflowRecord {
  title: string;
  nodes: CanvasNode[];
  groups: WorkflowRecord[];
}
export interface CanvasWorkflowProps {
  nodes: WorkflowRecord[];
  groups: WorkflowRecord[];
  viewport: CanvasViewport;
  canvasTitle: string;
  isMinimapOpen: boolean;
  setNodes(nodes: WorkflowRecord[]): void;
  setGroups(groups: WorkflowRecord[]): void;
  setSelectedNodeIds(ids: string[]): void;
  setCanvasTitle(title: string): void;
  setEditingTitleValue(title: string): void;
  setViewport(viewport: CanvasViewport): void;
  setIsMinimapOpen(open: boolean): void;
  onPanelOpen?(): void;
}
export interface WorkflowSaveOptions {
  snapshot?: WorkflowRecord;
  createBackup?: boolean;
  savedBy?: string;
  savedAt?: number;
}
export interface CanvasProjectUiService {
  instantiateWorkflowPreset(
    nodes: CanvasNode[], projectId: string | undefined,
    position: { x: number; y: number },
    dimensions: { width(node: CanvasNode): number; height(node: CanvasNode): number },
    createId: () => string,
  ): CanvasNode[];
  cleanupCanvasGroups(input: { nodes: CanvasNode[]; groups: CanvasGroup[] }): {
    nodes: CanvasNode[]; groups: CanvasGroup[];
  };
  createToast(options: { message: string; tone: 'danger' }): HTMLElement;
  activateModal(root: HTMLElement, onClose: () => void): () => void;
  observeStableEnhancement(callback: () => void): () => void;
}
export interface ProjectMediaRecoveryService {
  interruptedMediaNode<T extends WorkflowRecord>(node: T): T;
}
