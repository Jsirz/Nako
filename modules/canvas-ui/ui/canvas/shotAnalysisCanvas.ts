import type { CanvasGroup, CanvasNode } from '../../../contracts/canvasDocument';
import type { AnalysisMedia, ShotAnalysisResult } from '../../../contracts/shotAnalysis.js';
import { parseShotAnalysisResult } from '../../../contracts/shotAnalysis.js';
import { canvasError } from '../../../contracts/canvasErrors.js';

/** Build one atomic history change; never connect assets to the JSON output port. */
export function shotAnalysisCanvas(source: CanvasNode, result: ShotAnalysisResult, resultId: string,
  before: { nodes: CanvasNode[]; groups: CanvasGroup[] }, runtime: {
    create(type: string, point: { x: number; y: number }, projectId: string): CanvasNode;
    width(node: CanvasNode): number; height(node: CanvasNode): number;
  }) {
  result = parseShotAnalysisResult(result);
  if (result.id !== resultId)
    throw canvasError('拉片素材不完整，请先重新提取。', 'shotAnalysis.insert');
  const nodes: CanvasNode[] = [], groups: CanvasGroup[] = [], projectId = String(source.projectId || '');
  const left = source.x + runtime.width(source) + 180;
  let top = source.y;
  result.shots.forEach((shot, index) => {
    if (before.nodes.some(node => node.shotAnalysisResultId === resultId && node.shotAnalysisNodeId === source.id && node.shotAnalysisShotId === shot.id)) return;
    const groupId = crypto.randomUUID(), items: CanvasNode[] = [];
    const add = (type: string, title: string, patch: Record<string, unknown>) => {
      const x = items.reduce((position, node) => position + runtime.width(node) + 48, left);
      items.push({ ...runtime.create(type, { x, y: top }, projectId), ...patch, title, status: 'success', parentIds: [], sourcePortIndices: [],
        shotAnalysisResultId: resultId, shotAnalysisShotId: shot.id, shotAnalysisNodeId: source.id });
    };
    const description = [`镜头 ${index + 1} · ${shot.start.toFixed(3)}–${shot.end.toFixed(3)} 秒`,
      ...[['画面', shot.description], ['景别与构图', shot.framing], ['机位与镜头', shot.camera], ['动态', shot.motion], ['对白', shot.dialogue], ['音乐', shot.music], ['音效', shot.soundEffects]]
        .filter(([, value]) => value).map(([label, value]) => `${label}：${value}`)].join('\n\n');
    add('Text', `镜头 ${index + 1} · 拉片说明`, { textContent: description, prompt: description });
    const media = (asset: AnalysisMedia, title: string) => {
      const prefix = `/library/media/${projectId}/${asset.type}s/`;
      if (!asset.url.startsWith(prefix)) throw canvasError('拉片素材不属于当前项目。', 'shotAnalysis.insert');
      add(`Upload ${asset.type[0].toUpperCase() + asset.type.slice(1)}`, title,
        { resultUrl: asset.url, resultUrls: [asset.url], assetId: asset.assetId, model: 'Upload',
          ...(asset.type === 'audio' ? {} : { resultAspectRatio: `${result.source.width}/${result.source.height}` }) });
    };
    shot.frames.forEach((frame, i) => media(frame, `镜头 ${index + 1} · 关键帧 ${i + 1}`));
    if (shot.clip) media(shot.clip, `镜头 ${index + 1} · 动态参考`);
    if (shot.audio) media(shot.audio, `镜头 ${index + 1} · 原声参考`);
    if (items.length > 1) {
      items.forEach(node => { node.groupId = groupId; });
      groups.push({ id: groupId, label: `分镜 ${index + 1} · ${shot.start.toFixed(3)}–${shot.end.toFixed(3)} 秒`, nodeIds: items.map(node => node.id) });
    }
    top += Math.max(...items.map(node => runtime.height(node))) + 180;
    nodes.push(...items);
  });
  return { nodes: [...before.nodes, ...nodes], groups: [...before.groups, ...groups], created: nodes.map(node => node.id) };
}
