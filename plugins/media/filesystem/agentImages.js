import { open, realpath } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { assertDramaObject, DramaPlanError } from '../../../modules/agent/api/server/agent/drama/dramaPlan.js';
import { resolveMediaArtifact } from '../../../modules/asset-media/api/server/media/mediaArtifact.js';

/** Shared bounded reference reader for explicit prompt/storyboard operations. */
export async function readAgentReference({ libraryDirectory, projectId, url }) {
  if (typeof url !== 'string' || !url.startsWith('/library/media/')) throw new DramaPlanError('参考图片须属于当前项目', 'CROSS_PROJECT_MEDIA', 403);
  const [image] = await imageContent([{type:'image',url}], {libraryDirectory,projectId,model:{languageModes:[{value:'multimodal-chat',allowedInputs:{image:1}}],supportedImageFormats:['png','jpeg','webp']}});
  const match=/^data:([^;]+);base64,(.+)$/s.exec(image.image_url.url);
  const buffer=Buffer.from(match[2],'base64');
  if(buffer.length>10*1024*1024)throw new DramaPlanError('参考图片不能超过 10MB','MEDIA_TOO_LARGE',413);
  const metadata=await sharp(buffer).metadata();
  if(metadata.width>4096||metadata.height>4096)throw new DramaPlanError('参考图片不能超过 4096×4096','MEDIA_DIMENSIONS_EXCEEDED',413);
  return {mimeType:match[1],data:match[2],dataUrl:image.image_url.url};
}

function within(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

/** Resolve only this authenticated user's current-project images; never fetch URLs or arbitrary paths. */
export async function imageContent(media, { libraryDirectory, projectId, model, detail }) {
  if (media == null || (Array.isArray(media) && !media.length)) return [];
  const allowedCount = model.languageModes?.find((mode) => mode.value === 'multimodal-chat')?.allowedInputs?.image || 0;
  if (!allowedCount) throw new DramaPlanError('当前文本模型不支持参考图片，请选择支持图片的模型，或移除附件并取消画布图片选择后发送；本轮未调用模型', 'DRAMA_MODEL_IMAGES_UNSUPPORTED');
  if (!Array.isArray(media) || media.length > allowedCount) throw new DramaPlanError('参考图片数量超出当前模型范围', 'DRAMA_CHAT_MEDIA_INVALID');
  const detailParameter = model.advancedParams?.find((parameter) => parameter.key === 'detail');
  const detailDefault = detailParameter?.options?.some((option) => option.value === detailParameter.default) ? detailParameter.default : 'auto';
  const imageDetail = detail ?? detailDefault;
  const result = [];
  for (const item of media) {
    assertDramaObject(item, ['type', 'url'], '参考图片');
    if (item.type !== 'image' || !item.url) throw new DramaPlanError('参考图片无效', 'DRAMA_CHAT_MEDIA_INVALID');
    const raw = item.url;
    if (typeof raw !== 'string') throw new DramaPlanError('参考图片过大或无效', 'DRAMA_CHAT_MEDIA_INVALID');
    let buffer;
    let declaredMime;
    let filename;
    try {
      if (raw.startsWith('/library/media/')) {
        if (!libraryDirectory) throw new Error('missing scoped library');
        const decoded = decodeURIComponent(raw.split('?')[0]);
        const parts = decoded.split('/');
        if (parts.length !== 6 || parts[1] !== 'library' || parts[2] !== 'media' || parts[3] !== projectId || parts[4] !== 'images'
          // eslint-disable-next-line no-control-regex -- Reject control characters in decoded local media paths.
          || !parts[5] || /^\./.test(parts[5]) || /[\\:%#?\x00-\x1f]/.test(decoded)) throw new Error('invalid project image path');
        filename = parts[5];
        const root = await realpath(libraryDirectory);
        const expectedImages = path.join(root, 'media', projectId, 'images');
        const images = await realpath(expectedImages);
        const normalizePathCase = (value) => process.platform === 'win32' ? value.toLowerCase() : value;
        if (!within(root, images) || normalizePathCase(images) !== normalizePathCase(expectedImages)) throw new Error('image root escapes project');
        const file = await realpath(path.join(images, filename));
        if (!within(images, file)) throw new Error('image escapes scope');
        const handle = await open(file, 'r');
        try {
          const stat = await handle.stat();
          if (!stat.isFile()) throw new Error('image too large');
          // Read a fixed bounded allocation even if the file grows during this request.
          const bounded = Buffer.alloc(stat.size + 1);
          const { bytesRead } = await handle.read(bounded, 0, bounded.length, 0);
          if (bytesRead !== stat.size) throw new Error('image changed while reading');
          buffer = bounded.subarray(0, bytesRead);
        } finally { await handle.close(); }
      } else {
        const match = /^data:(image\/(?:png|jpeg|webp|gif|bmp));base64,([\s\S]+)$/i.exec(raw);
        if (!match) throw new Error('image data URL required');
        declaredMime = match?.[1]?.toLowerCase();
        const encoded = match[2].replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1) throw new Error('invalid base64');
        buffer = Buffer.from(encoded, 'base64');
        if (buffer.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('invalid base64');
      }
      if (!buffer.length) throw new Error('image size out of bounds');
      const artifact = resolveMediaArtifact({ filename, prefix: buffer.subarray(0, 32), contentType: declaredMime, requireRecognizedContent: true });
      if (artifact.kind !== 'image' || (declaredMime && artifact.mimeType !== declaredMime)) throw new Error('not the declared image');
      const format = artifact.mimeType.slice('image/'.length);
      const supportedFormats = Array.isArray(model.supportedImageFormats) ? model.supportedImageFormats : [];
      if (supportedFormats.length && !supportedFormats.includes(format)) throw new Error('image format unsupported');
      const outputArtifact = resolveMediaArtifact({ filename, prefix: buffer.subarray(0, 32), contentType: declaredMime, requireRecognizedContent: true });
      if (outputArtifact.kind !== 'image' || (declaredMime && outputArtifact.mimeType !== declaredMime)) throw new Error('optimized image invalid');
      const outputFormat = outputArtifact.mimeType.slice('image/'.length);
      if (supportedFormats.length && !supportedFormats.includes(outputFormat)) throw new Error('optimized image format unsupported');
      result.push({ type: 'image_url', image_url: { url: `data:${outputArtifact.mimeType};base64,${buffer.toString('base64')}`, detail: imageDetail } });
    } catch {
      throw new DramaPlanError('参考图片无法读取或不属于当前项目，亦可能超过大小或格式限制；请检查附件及画布所选图片，本轮未调用模型', 'DRAMA_CHAT_MEDIA_INVALID');
    }
  }
  return result;
}
