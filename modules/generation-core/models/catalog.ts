// Generated from plugin-owned models.ts files.
export * from './defaults';
import * as p0 from '../../../plugins/providers/doubao/models';
import * as p1 from '../../../plugins/providers/deepseek/models';
import * as p2 from '../../../plugins/providers/official-text/models';
import * as p3 from '../../../plugins/providers/libtv/models';
import * as p4 from '../../../plugins/providers/dreamina/models';
import * as p5 from '../../../plugins/providers/jimeng/models';
import * as p6 from '../../../plugins/providers/openai/models';
import * as p7 from '../../../plugins/providers/runninghub/models';
import * as p8 from '../../../plugins/providers/seedvr2/models';
import * as p9 from '../../../plugins/providers/mureka/models';
import * as p10 from '../../../plugins/providers/kling/models';
import * as p11 from '../../../plugins/providers/ecloud/models';
import * as p12 from '../../../plugins/providers/work-fisher/models';
export const TEXT_MODELS = [...p0.TEXT_MODELS, ...p1.TEXT_MODELS, ...p2.TEXT_MODELS, ...p11.TEXT_MODELS, ...p12.TEXT_MODELS].sort((a,b)=>a.catalogOrder-b.catalogOrder);
export const IMAGE_MODELS = [...p0.IMAGE_MODELS, ...p3.IMAGE_MODELS, ...p4.IMAGE_MODELS, ...p5.IMAGE_MODELS, ...p6.IMAGE_MODELS, ...p7.IMAGE_MODELS, ...p8.IMAGE_MODELS, ...p11.IMAGE_MODELS, ...p12.IMAGE_MODELS].sort((a,b)=>a.catalogOrder-b.catalogOrder);
export const AUDIO_MODELS = [...p9.AUDIO_MODELS, ...p11.AUDIO_MODELS, ...p12.AUDIO_MODELS].sort((a,b)=>a.catalogOrder-b.catalogOrder);
export const VIDEO_MODELS = [...p0.VIDEO_MODELS, ...p3.VIDEO_MODELS, ...p4.VIDEO_MODELS, ...p7.VIDEO_MODELS, ...p10.VIDEO_MODELS, ...p11.VIDEO_MODELS, ...p12.VIDEO_MODELS].sort((a,b)=>a.catalogOrder-b.catalogOrder);
