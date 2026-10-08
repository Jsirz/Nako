import { ERRORS, PluginError } from './errors.js';
import {
  OFFICIAL_PRODUCTION_PROFILES,
  productionProfileForBundle,
} from './officialProductionProfiles.js';

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

export const OFFICIAL_DRAMA_SKILL_METADATA = Object.freeze({
  slug: OFFICIAL_DRAMA_BUNDLE.skillSlug,
  name: '剧本文戏',
  description:
    '整理剧本资产、角色参考与 MiniMax H3 文戏分镜；场景可在画布选择已配置的模型生成。',
  source: 'official',
  category: '视频制作',
  version: OFFICIAL_DRAMA_BUNDLE.version,
  bundleId: OFFICIAL_DRAMA_BUNDLE.id,
  fileCount: 9,
  updatedAt: '',
});

// Verified against RH's public inputNodes: high edition has different node IDs.
// The fight app labels 529/value as steps, so never treat it as duration.
const HIGH_VIDEO_ROUTE = deepFreeze({
  provider: 'runninghub-cn',
  webAppId: '2094860545999593474',
  fields: {
    prompt: field('167', 'prompt'),
    duration: field('163', 'value'),
    ratio: field('164', 'aspect_ratio'),
    megapixels: field('164', 'megapixels'),
  },
  images: ['238', '237', '230', '218', '227', '217'].map((nodeId, index) => ({
    name: `image${index + 1}`,
    ...field(nodeId, 'image'),
  })),
  audio: ['225', '223', '222'].map((nodeId, index) => ({
    name: `audio${index + 1}`,
    ...field(nodeId, 'audio'),
  })),
});
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
    drama: profile.mode === 'assets' ? FIGHT_VIDEO_ROUTE : HIGH_VIDEO_ROUTE,
  };
}
export const OFFICIAL_PRODUCTION_SKILLS = Object.freeze(
  OFFICIAL_PRODUCTION_PROFILES.map((profile) =>
    Object.freeze({
      ...OFFICIAL_DRAMA_SKILL_METADATA,
      slug: profile.slug,
      name: profile.name,
      bundleId: profile.id,
      version: profile.version,
      fileCount: profile.mode === 'assets' ? 1 : 9,
      description:
        profile.id === 'minimax-drama'
          ? OFFICIAL_DRAMA_SKILL_METADATA.description
          : profile.mode === 'assets'
            ? '无需剧本：描述人物与场景，确认生成资产后连接 RH 武戏节点。视频单独运行。'
            : '与剧本文戏相同的制作流程，使用 RH 高配文戏应用。资产与视频逐阶段确认。',
    }),
  ),
);

export const SKILL_INSTRUCTION_LIMITS = Object.freeze({
  rootBytes: Infinity,
  referenceBytes: Infinity,
  manifestBytes: Infinity,
  referenceCount: Infinity,
  totalBytes: Infinity,
});
