/**
 * 页面展示策略：隐藏暂不向用户展示的第三方来源。
 *
 * 这只是 UI 投影层过滤，后端 Provider、工作流执行器、凭据和已有数据仍保留，
 * 因而不会改变协议或删除用户已保存的配置。
 */
import { isGenerationSourceVisible } from '../../../contracts/uiFeatures';
import { IMAGE_MODELS, VIDEO_MODELS, TEXT_MODELS, AUDIO_MODELS } from '../../models/catalog';
import type { SourceBlock } from './sourceSettingsClient';

export function isHiddenGenerationSource(source: string) {
  return !isGenerationSourceVisible(source);
}

export function isModelVisible(name: string) {
  const model = [...IMAGE_MODELS, ...VIDEO_MODELS, ...TEXT_MODELS, ...AUDIO_MODELS]
    .find(entry => entry.name === name);
  return isGenerationSourceVisible(model?.source);
}
const SOURCE_ORDER = ['work_fisher', 'ecloud', 'runninghub', 'runninghub_global', 'official'];

export function visibleSourceBlocks(blocks: SourceBlock[]) {
  const order = new Map(SOURCE_ORDER.map((source, index) => [source, index]));
  return blocks
    // CLI sources have dedicated cards in the direct-vendor section.
    .filter((block) => !['dreamina_cli', 'libtv_cli'].includes(block.source) && isGenerationSourceVisible(block.source))
    .map((block, index) => ({ block, index }))
    .sort((a, b) => (order.get(a.block.source) ?? SOURCE_ORDER.length) -
      (order.get(b.block.source) ?? SOURCE_ORDER.length) || a.index - b.index);
}
