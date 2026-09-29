import text from './catalog/text-1.json' with { type: 'json' };
import visionText from './catalog/text-2.json' with { type: 'json' };
import image1 from './catalog/image-1.json' with { type: 'json' };
import image2 from './catalog/image-2.json' with { type: 'json' };
import image3 from './catalog/image-3.json' with { type: 'json' };
import image4 from './catalog/image-4.json' with { type: 'json' };
import video1 from './catalog/video-1.json' with { type: 'json' };
import video2 from './catalog/video-2.json' with { type: 'json' };
import video3 from './catalog/video-3.json' with { type: 'json' };
import video4 from './catalog/video-4.json' with { type: 'json' };
import audio from './catalog/audio-1.json' with { type: 'json' };

export const ROOT = 'https://api.work-fisher.com';
// Declarative model data adapted from upstream commit bdcf3bec054594fcab591952a8c5acef858d6de4.
// See THIRD-PARTY-NOTICES.md for provenance and license; no account or telemetry code is included.
export const MODEL_DEFINITIONS = [
  ...text,
  ...visionText,
  ...image1,
  ...image2,
  ...image3,
  ...image4,
  ...video1,
  ...video2,
  ...video3,
  ...video4,
  ...audio,
].map((entry, index) => ({
  supportedImageFormats: ['jpeg', 'png', 'webp'],
  maxImageSizeMb: 20,
  maxResolution: '',
  resolutions: [],
  aspectRatios: [],
  advancedParams: [],
  ...entry,
  source: 'work_fisher',
  modelIdOverride: false,
  useProxy: false,
  maxConcurrent: 0,
  catalogOrder: 300 + index,
  description: entry.canonicalModel + ' · Work-Fisher',
  cost: 0,
  endpoint: Object.fromEntries(
    Object.entries(entry.endpoint).map(([mode, endpoint]) => [
      mode,
      { url: ROOT + endpoint.path, model: endpoint.model },
    ]),
  ),
}));
