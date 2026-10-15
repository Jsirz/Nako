import type { CanvasNode, CanvasGroup } from './canvasDocument';
import type { GenerationMediaMetadata } from './generationUi';

export interface CanvasConnectionOptions {
  parentId: string; childId: string; portIndex?: number; sourcePortIndex?: number;
  inputCount?: number; connectionMode?: string; modeField?: 'imageMode' | 'videoMode' | 'comfyMode';
}
export type CanvasEditSnapshot = { nodes: CanvasNode[]; groups: CanvasGroup[] };
/** Document transformations return a planned snapshot; only the canvas commits it. */
export interface CanvasEditingService {
  deleteNodes(nodes: readonly CanvasNode[], ids: readonly string[]): CanvasNode[];
  hasGeneratingNodes(nodes: readonly CanvasNode[]): boolean;
  cloneNodes(nodes: readonly CanvasNode[], options: {
    offset: number; createId(): string; preserveParentConnections?: boolean; targetPoint?: { x: number; y: number };
  }): { newNodes: CanvasNode[]; idMap: Map<string, string> };
  insertClones(nodes: readonly CanvasNode[], copies: readonly CanvasNode[], ids: ReadonlyMap<string, string>,
    options?: { preserveChildConnections?: boolean }): CanvasNode[];
  connect(nodes: readonly CanvasNode[], options: CanvasConnectionOptions): CanvasNode[];
  disconnect(nodes: readonly CanvasNode[], options: Pick<CanvasConnectionOptions, 'parentId' | 'childId' | 'portIndex'>): CanvasNode[];
  group(snapshot: CanvasEditSnapshot, ids: readonly string[], options: { groupId: string; label?: string }): CanvasEditSnapshot;
  ungroup(snapshot: CanvasEditSnapshot, id: string): CanvasEditSnapshot;
  cleanupGroups(snapshot: CanvasEditSnapshot): CanvasEditSnapshot;
  renameGroup(groups: readonly CanvasGroup[], id: string, label: string): CanvasGroup[];
  grid(nodes: readonly CanvasNode[], ids: readonly string[], columns: number,
    measure: { getWidth(node: CanvasNode): number; getHeight(node: CanvasNode): number }): CanvasNode[];
  assetNode(asset: Record<string, unknown>, metadata: GenerationMediaMetadata, projectId: string | undefined,
    point: { x: number; y: number }, id: string): CanvasNode;
}
