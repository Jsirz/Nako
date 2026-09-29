import { browserServices } from '../../../kernel/browser';
import type {
  WorkflowDefinition,
  WorkflowManagerClient,
  WorkflowRun,
} from './workflowManagerClient';
declare global {
  interface Window {
    __NAKO_FOCUS_NODES__?: (nodeIds: readonly string[]) => void;
  }
}
export function incompleteExportNotice(definition: WorkflowDefinition) {
  const ids = (definition.analysis?.warnings || [])
    .filter((warning) => warning.code === 'UNREFERENCED_INCOMPLETE_API_NODE')
    .map((warning) => warning.nodeId);
  return ids.length
    ? `已忽略 ${ids.length} 个缺少类型且未被有效节点引用的节点（${ids.slice(0, 10).join('、')}${ids.length > 10 ? '…' : ''}）；原始 JSON 已保留。`
    : '';
}

export function focusInsertedWorkflow(nodeIds: readonly string[] | undefined) {
  if (nodeIds?.length) browserServices.__NAKO_FOCUS_NODES__?.(nodeIds);
}

export function isRunningHubRunner(runner: unknown) {
  return runner === 'runninghub-workflow' || runner === 'runninghub-webapp';
}

export function isCloudDefinition(definition: WorkflowDefinition) {
  return definition.sourceArtifacts.some((artifact) => artifact.origin === 'runninghub-webapp');
}

export function automaticWorkflowCover(run?: WorkflowRun) {
  const outputs = Array.isArray(run?.receipt?.outputs) ? run.receipt.outputs : [];
  const candidates = outputs.flatMap((output) => {
    const mediaKind = output.mediaKind;
    const url = output.url;
    if (
      (mediaKind !== 'image' && mediaKind !== 'video') ||
      typeof url !== 'string' ||
      !url.startsWith('/library/media/')
    )
      return [];
    return [{ url, mediaKind } as const];
  });
  return candidates.find((item) => item.mediaKind === 'video') || candidates[0];
}

export async function enrichVerifiedAssetValues(
  client: WorkflowManagerClient,
  values: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const assetLists = new Map<string, Awaited<ReturnType<WorkflowManagerClient['listAssets']>>>();
  const enrich = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) return Promise.all(value.map(enrich));
    if (!value || typeof value !== 'object') return value;
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.assetId !== 'string' ||
      typeof candidate.projectId !== 'string' ||
      typeof candidate.type !== 'string'
    )
      return structuredClone(value);
    const cacheKey = `${candidate.projectId}:${candidate.type}`;
    let assets = assetLists.get(cacheKey);
    if (!assets) {
      assets = await client.listAssets(candidate.projectId, candidate.type).catch(() => []);
      assetLists.set(cacheKey, assets);
    }
    const asset = assets.find((item) => item.id === candidate.assetId);
    return {
      ...structuredClone(candidate),
      ...(asset?.url ? { url: asset.url } : {}),
      ...(asset?.filename ? { filename: asset.filename } : {}),
    };
  };
  return Object.fromEntries(
    await Promise.all(
      Object.entries(values).map(async ([key, value]) => [key, await enrich(value)]),
    ),
  );
}
