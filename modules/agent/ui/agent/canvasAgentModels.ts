import type { AgentVision } from './agentVision';
import { modelCatalog } from '../../../kernel/browser';
import { isGenerationSourceVisible } from '../../../contracts/uiFeatures';
const CHAT_PROVIDERS = new Set([
  'DoubaoTextProvider',
  'DeepSeekProvider',
  'GlmTextProvider',
  'KimiTextProvider',
  'EcloudTextProvider',
  'WorkFisherTextProvider',
]);
interface CatalogModel<Parameter> {
  name: string;
  provider?: string;
  source?: string;
  selectable?: boolean;
  supportedReferenceTypes?: readonly string[];
  endpoint?: Record<string, { model?: string }>;
  advancedParams?: Parameter[];
}
/** Public catalog names identify a choice uniquely, even when providers share an upstream id. */
export function canvasAgentModels<Parameter>(catalog: readonly CatalogModel<Parameter>[]) {
  return catalog
    .filter(
      (model) =>
        model.selectable !== false &&
        isGenerationSourceVisible(model.source) &&
        CHAT_PROVIDERS.has(model.provider || '') &&
        typeof model.endpoint?.['multimodal-chat']?.model === 'string' &&
        model.endpoint['multimodal-chat'].model,
    )
    .map((model) => ({
      id: model.name,
      label: modelCatalog().displayName(model.name),
      vision: (model.supportedReferenceTypes?.includes('image')
        ? 'supported'
        : model.supportedReferenceTypes?.includes('text')
          ? 'unsupported'
          : 'unknown') as AgentVision,
      advancedParams: model.advancedParams || [],
    }))
    .sort((a, b) => Number(b.vision === 'supported') - Number(a.vision === 'supported'));
}
