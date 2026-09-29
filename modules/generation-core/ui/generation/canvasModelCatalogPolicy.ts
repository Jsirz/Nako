import type { ModelGroup } from './sourceSettingsClient';
import { isHiddenGenerationSource } from './hiddenProviderPolicy';

export type ModelGroupFilter = (groups: ModelGroup[]) => ModelGroup[];

/** 按实际配置生成选择器视图，不限制插件提供的模型名称，也不修改原始目录。 */
export const filterCanvasModelGroups: ModelGroupFilter = (groups) =>
  groups
    .map((group) => ({
      ...group,
      variants: group.variants.filter(
        (variant) => variant.configured && !isHiddenGenerationSource(variant.source),
      ),
    }))
    .filter((group) => group.variants.length > 0);
