export type PromptAssetType = 'text' | 'image' | 'video' | 'audio';
export interface PromptAsset {
  id: string;
  type?: string;
  url?: string;
  title?: string;
  [key: string]: unknown;
}
export interface PromptDocumentNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: PromptDocumentNode[];
}
export function promptAssetType(asset?: PromptAsset): PromptAssetType {
  const type = String(asset?.type || '')
    .toLowerCase()
    .replace(/[ _-]/g, '');
  if (type === 'video' || type === 'uploadvideo') return 'video';
  if (type === 'audio' || type === 'uploadaudio') return 'audio';
  return type === 'text' ? 'text' : 'image';
}
export function promptAssetIndex(assets: readonly PromptAsset[]) {
  const byType: Record<PromptAssetType, PromptAsset[]> = {
      text: [],
      image: [],
      video: [],
      audio: [],
    },
    byId = new Map<string, { type: PromptAssetType; number: number; asset: PromptAsset }>();
  for (const asset of assets) {
    const type = promptAssetType(asset);
    byType[type].push(asset);
    if (!byId.has(asset.id)) byId.set(asset.id, { type, number: byType[type].length, asset });
  }
  return { byType, byId };
}
export function promptAssetLabel(type: PromptAssetType, number: number) {
  return `${{ image: '图片', video: '视频', audio: '音频', text: '文本' }[type]}${number}`;
}

