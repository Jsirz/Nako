import { IMAGE_MODELS } from '../../../generation-core/api/models/catalog';
import type { CanvasNode } from '../../../canvas-ui/api/ui/nodes/canvasNodeOperations';
import {
  imageAngleDescription,
  normalizeImageAngle,
  type ImageAngle,
} from '../../../agent/api/ui/prompt/imageAngle';
export const imageToolModel =
  IMAGE_MODELS.find(
    (model) =>
      model.provider === 'DoubaoImageProvider' && Boolean(model.endpoint?.['image-to-image']),
  ) ?? IMAGE_MODELS.find((model) => Boolean(model.endpoint?.['image-to-image']));
export const panoramaPrompt = `基于参考图片重建同一场景，生成覆盖水平360度、垂直180度的完整球面全景等距柱状投影贴图。以原图主要内容为前方视线中心，向两侧和背后合理补全空间。整张画面承载完整经纬度范围，优先2:1展开；不要只生成宽幅风景、鱼眼图或多图拼版。左右边缘无缝连续，顶部天顶与底部地面自然闭合，避免接缝、断层、重复主体及局部拉伸。保持原图光照、材质、人物身份与画面风格，封闭空间保留合理出入口。不添加文字、水印、边框或界面。`;
interface Runtime {
  create(type: string, point: { x: number; y: number }, projectId: string): CanvasNode;
  configure(nodes: CanvasNode[], id: string, patch: Partial<CanvasNode>): CanvasNode[];
  connect(nodes: CanvasNode[], sourceId: string, targetId: string): CanvasNode[];
  width(node: CanvasNode): number;
}
export function createImageAngleDraft(
  nodes: CanvasNode[],
  sourceId: string,
  angle: ImageAngle | null,
  projectId: string,
  runtime: Runtime,
) {
  if (!imageToolModel) throw new Error('请先配置支持图生图的第三方模型。');
  const source = nodes.find((node) => node.id === sourceId);
  if (
    !source?.resultUrl ||
    !['Image', 'Upload Image'].includes(source.type) ||
    source.uploadPending
  )
    throw new Error('原图尚未准备好，请稍后重试。');
  const settings = normalizeImageAngle(angle),
    description = imageAngleDescription(settings);
  const draft = runtime.create(
    'Image',
    { x: source.x + runtime.width(source) + 80, y: source.y },
    projectId,
  );
  const configured = runtime.configure([...nodes, draft], draft.id, {
    imageModel: imageToolModel.name,
    imageMode: 'image-to-image',
    resolution: imageToolModel.resolutions[0] || '1K',
    generateCount: 1,
    aspectRatio:
      angle && imageToolModel.aspectRatios.includes(String(source.aspectRatio))
        ? source.aspectRatio
        : angle
          ? imageToolModel.aspectRatios.includes('16:9')
            ? '16:9'
            : imageToolModel.aspectRatios[0]
          : imageToolModel.aspectRatios.includes('2:1')
            ? '2:1'
            : imageToolModel.aspectRatios[0],
    title: angle ? `角度 · ${description.direction} · ${description.elevation}` : '全景图',
    prompt: angle ? '' : panoramaPrompt,
    imageAngle: angle ? settings : null,
  });
  const connected = runtime.connect(configured, sourceId, draft.id);
  if (!connected.find((node) => node.id === draft.id)?.parentIds?.includes(sourceId))
    throw new Error('当前图像模型不支持参考图片，请先选择支持图生图的模型。');
  return { nodes: connected, id: draft.id };
}
