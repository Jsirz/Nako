import { preferenceStorage } from '../../../project/api/ui/persistence/preferenceStore';
import type { CanvasNode } from './workflowNodeTypes';

export const WORKFLOW_EXAMPLE_STORAGE_KEY = 'nako-workflow-example-bundles-v1';

export const WORKFLOW_EXAMPLE_MAX_BYTES = 512 * 1024;

export const WORKFLOW_EXAMPLE_MAX_NODES = 24;

export const WORKFLOW_EXAMPLE_NODE_TYPES = new Set([
  'Text',
  'Image',
  'Mask',
  'Video',
  'Audio',
  'Upload Image',
  'Upload Video',
  'Upload Audio',
]);

export interface WorkflowExampleNodeTemplate {
  templateId: string;
  role: 'input' | 'output';
  type: string;
  relativeX: number;
  relativeY: number;
  outputPortId?: string;
  data: Record<string, unknown>;
}

export interface WorkflowExampleInputBinding {
  slotKey: string;
  templateId: string;
  sourcePortIndex: number;
}

export interface WorkflowExampleBundle {
  schemaVersion: 1;
  definitionId: string;
  capturedAt: number;
  nodes: WorkflowExampleNodeTemplate[];
  inputBindings: WorkflowExampleInputBinding[];
}

export function safeExampleString(value: unknown, maximum = 200_000): string | undefined {
  if (typeof value !== 'string' || value.length > maximum || /[\0\r]/.test(value)) return undefined;
  return value;
}

export function safeExampleNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(maximum, Math.max(minimum, value));
}

export function exampleNodeData(node: CanvasNode): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of [
    'title',
    'prompt',
    'textContent',
    'resultText',
    'resultUrl',
    'url',
    'filename',
    'fileName',
    'mimeType',
    'aspectRatio',
    'mediaType',
    'model',
    'assetId',
    'projectId',
  ]) {
    const value = safeExampleString(node[key]);
    const isUrl = key === 'url' || key === 'resultUrl';
    if (value !== undefined && (!isUrl || !value.startsWith('data:'))) {
      data[key] = value;
    }
  }
  for (const key of ['width', 'height', 'duration', 'naturalWidth', 'naturalHeight']) {
    const value = safeExampleNumber(node[key], 0, 100_000);
    if (value !== undefined) data[key] = value;
  }
  if (Array.isArray(node.resultUrls)) {
    const resultUrls = node.resultUrls
      .map((value) => safeExampleString(value, 4_096))
      .filter((value): value is string => typeof value === 'string' && !value.startsWith('data:'))
      .slice(0, 20);
    if (resultUrls.length) data.resultUrls = resultUrls;
  }
  if (node.type === 'Text') {
    data.status = 'success';
  } else if (typeof data.resultUrl === 'string' || typeof data.url === 'string') {
    data.status = 'success';
    data.progress = 100;
  }
  return data;
}

export function loadWorkflowExampleBundles(): Map<string, WorkflowExampleBundle> {
  try {
    const raw = preferenceStorage().getItem(WORKFLOW_EXAMPLE_STORAGE_KEY);
    if (!raw || raw.length > WORKFLOW_EXAMPLE_MAX_BYTES) return new Map();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed
        .filter(
          (bundle): bundle is WorkflowExampleBundle =>
            Boolean(bundle) &&
            typeof bundle === 'object' &&
            (bundle as WorkflowExampleBundle).schemaVersion === 1 &&
            typeof (bundle as WorkflowExampleBundle).definitionId === 'string' &&
            Array.isArray((bundle as WorkflowExampleBundle).nodes) &&
            Array.isArray((bundle as WorkflowExampleBundle).inputBindings),
        )
        .map((bundle) => [bundle.definitionId, bundle]),
    );
  } catch {
    return new Map();
  }
}

export function saveWorkflowExampleBundles(
  bundles: ReadonlyMap<string, WorkflowExampleBundle>,
): boolean {
  try {
    const serialized = JSON.stringify([...bundles.values()]);
    if (new TextEncoder().encode(serialized).byteLength > WORKFLOW_EXAMPLE_MAX_BYTES) return false;
    preferenceStorage().setItem(WORKFLOW_EXAMPLE_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}
