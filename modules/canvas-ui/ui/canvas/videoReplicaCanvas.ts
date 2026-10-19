import type { CanvasGroup, CanvasNode } from '../../../contracts/canvasDocument';
import { canvasError } from '../../../contracts/canvasErrors.js';
import { VIDEO_REPLICA_MODEL, parseVideoReplicaResult, validateVideoReplicaPlan, type VideoReplicaPlan, type VideoReplicaSettings } from '../../../contracts/videoReplica.js';

/** Validate every input before the caller commits one history transaction. */
export function videoReplicaCanvas(source: CanvasNode, before: { nodes: CanvasNode[]; groups: CanvasGroup[] }, runtime: {
  create(type: string, point: { x: number; y: number }, projectId: string): CanvasNode;
  width(node: CanvasNode): number; height(node: CanvasNode): number;
}) {
  const projectId = String(source.projectId || '');
  const result = parseVideoReplicaResult((source.pluginResult as { analysis?: unknown } | undefined)?.analysis);
  const settings: VideoReplicaSettings = {
    replacements: source.replicaAssetResultId === result.id ? source.replicaReplacements as VideoReplicaSettings['replacements'] : {}, requirements: source.replicaRequirements as string,
    aspectRatio: source.replicaAspectRatio as string, resolution: source.replicaResolution as string,
  };
  const plan = validateVideoReplicaPlan(source.replicaPlan, result, settings, projectId);
  const nodes: CanvasNode[] = [], groups: CanvasGroup[] = [], generated: string[] = [];
  const left = source.x + runtime.width(source) + 180;
  let top = source.y;
  plan.shots.forEach((shot, index) => {
    if (before.nodes.some(node => node.type === 'Video' && node.replicaSourceNodeId === source.id && node.replicaPlanId === plan.id && node.replicaShotId === shot.shotId)) return;
    const groupId = crypto.randomUUID(), items: CanvasNode[] = [];
    const add = (type: string, title: string, patch: Record<string, unknown>) => {
      const x = items.reduce((position, node) => position + runtime.width(node) + 72, left);
      const node = { ...runtime.create(type, { x, y: top }, projectId), ...patch, title, groupId,
        replicaSourceNodeId: source.id, replicaPlanId: plan.id, replicaShotId: shot.shotId };
      items.push(node); return node;
    };
    const references = shot.images.map(image => add('Upload Image', `替换 · ${image.name}`, {
      model: 'Upload', status: 'success', resultUrl: image.url, resultUrls: [image.url], parentIds: [], sourcePortIndices: [],
    }));
    references.push(add('Upload Video', `分镜 ${index + 1} · 动态参考`, {
      model: 'Upload', status: 'success', resultUrl: shot.referenceUrl, resultUrls: [shot.referenceUrl],
      resultAspectRatio: `${result.source.width}/${result.source.height}`, parentIds: [], sourcePortIndices: [],
    }));
    const output = add('Video', `分镜 ${index + 1} · 复刻`, {
      model: VIDEO_REPLICA_MODEL, videoModel: VIDEO_REPLICA_MODEL, videoMode: 'multimodal', status: 'idle',
      prompt: shot.prompt, duration: shot.duration, aspectRatio: plan.aspectRatio, resolution: plan.resolution, generateCount: 1,
      parentIds: references.map(node => node.id), sourcePortIndices: references.map(() => 0),
      inputLinks: references.map(node => ({ sourceNodeId: node.id, sourcePortId: node.type === 'Upload Video' ? 'video' : 'image', targetPortId: 'references' })),
    });
    if (!output.id) throw canvasError('创建复刻节点失败。', 'videoReplica.insert');
    generated.push(output.id);
    groups.push({ id: groupId, label: `复刻分镜 ${index + 1} · ${shot.duration} 秒`, nodeIds: items.map(node => node.id) });
    nodes.push(...items); top += Math.max(...items.map(node => runtime.height(node))) + 180;
  });
  return { nodes: [...before.nodes, ...nodes], groups: [...before.groups, ...groups], generated, plan: plan as VideoReplicaPlan };
}
