import { ERRORS, PluginError } from './errors.js';
import { productionProfileForBundle } from './officialProductionProfiles.js';

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object') deepFreeze(child);
  });
  return Object.freeze(value);
}

const field = (nodeId, fieldName) => ({ nodeId, fieldName });

// This is a routing contract, not an execution receipt or a source of model prices.
export const OFFICIAL_DRAMA_BUNDLE = deepFreeze({
  id: 'minimax-drama',
  version: '1.0.0',
  skillSlug: 'minimax-drama-prompt',
  source: 'official',
  characters: {
    provider: 'runninghub-cn',
    webAppId: '2052744677727715329',
    fields: {
      prompt: field('49', 'text'),
      width: field('60', 'value'),
      height: field('61', 'value'),
    },
  },
  scenes: { provider: null, model: null },
  drama: {
    provider: 'runninghub-cn',
    webAppId: '2094859983199498241',
    fields: {
      prompt: field('528', 'prompt'),
      duration: field('529', 'value'),
      ratio: field('456', 'aspect_ratio'),
      megapixels: field('456', 'megapixels'),
      steps: field('324', 'value'),
    },
    images: ['526', '527', '525', '515', '475', '469'].map((nodeId, index) => ({
      name: `image${index + 1}`,
      ...field(nodeId, 'image'),
    })),
    audio: ['522', '523', '473'].map((nodeId, index) => ({
      name: `audio${index + 1}`,
      ...field(nodeId, 'audio'),
    })),
  },
});

// The fight app labels 529/value as steps, so never treat it as duration.
const FIGHT_VIDEO_ROUTE = deepFreeze({
  ...OFFICIAL_DRAMA_BUNDLE.drama,
  webAppId: '2094873524119883778',
  fields: {
    prompt: field('528', 'prompt'),
    ratio: field('456', 'aspect_ratio'),
    megapixels: field('456', 'megapixels'),
    steps: field('324', 'value'),
  },
});
export function officialProductionBundle(bundleId = OFFICIAL_DRAMA_BUNDLE.id) {
  const profile = productionProfileForBundle(bundleId);
  if (!profile) throw new PluginError(ERRORS.invalidConfiguration, '官方制作组合不存在', { context: { moduleId: 'contracts', operation: 'officialProductionBundle', bundleId } });
  if (profile.id === OFFICIAL_DRAMA_BUNDLE.id) return OFFICIAL_DRAMA_BUNDLE;
  return {
    ...OFFICIAL_DRAMA_BUNDLE,
    id: profile.id,
    version: profile.version,
    skillSlug: profile.slug,
    drama: FIGHT_VIDEO_ROUTE,
  };
}
export const SKILL_INSTRUCTION_LIMITS = Object.freeze({
  rootBytes: Infinity,
  referenceBytes: Infinity,
  manifestBytes: Infinity,
  referenceCount: Infinity,
  totalBytes: Infinity,
});
