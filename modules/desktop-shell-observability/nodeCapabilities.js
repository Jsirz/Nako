import { NODE_ERROR, nodeError } from '../contracts/nodeExecution.js';

function localUrl(value, projectId) {
  const url = typeof value === 'string' ? value : value?.url;
  const prefix = `/library/media/${projectId}/`;
  let decoded;
  try { decoded = decodeURIComponent(String(url || '').split('?')[0]); } catch { throw nodeError(NODE_ERROR.INVALID, '媒体地址无效'); }
  if (!decoded.startsWith(prefix) || !/^(images|videos|audios)\/[a-zA-Z0-9_ .-]+$/.test(decoded.slice(prefix.length)) || decoded.includes('..'))
    throw nodeError(NODE_ERROR.DENIED, '节点只能访问当前项目中的媒体');
  return url;
}

export function createNodeCapabilities({ generation, mediaStore, mediaAgent, mediaProcessor, workflow, projects, store }) {
  const scopedAsset = async (input, ctx) => {
    if (typeof input === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(input)) {
      if (input.length > 8 * 1024 * 1024) throw nodeError(NODE_ERROR.INVALID, '图片过大');
      const saved = await mediaStore.save({ projectId: ctx.projectId, type: 'image', data: Buffer.from(input.split(',')[1], 'base64'), name: 'reference.' + input.slice(11, input.indexOf(';')) });
      return { id: saved.id, type: 'image', url: saved.url };
    }
    const asset = input?.assetId ? await mediaStore.read(input.assetId) : input;
    if (!asset) throw nodeError(NODE_ERROR.NOT_FOUND, '媒体不存在');
    const url = localUrl(asset, ctx.projectId);
    return { id: asset.id, url, type: asset.type || /\/(images|videos|audios)\//.exec(url)?.[1].slice(0, -1) };
  };
  return {
    async 'models.generate'(input, ctx) {
      const { kind = 'text', model } = input;
      if (!['text', 'image', 'video', 'audio'].includes(kind)) throw nodeError(NODE_ERROR.INVALID, '模型类型无效');
      if (!Array.isArray(input.references || []) || (input.references || []).length > 20) throw nodeError(NODE_ERROR.INVALID, '媒体引用应为最多 20 项的数组');
      const refs = await Promise.all((input.references || []).map(item => scopedAsset(item, ctx)));
      if (input.options?.midjourneyReferences) {
        const check = value => {
          if (typeof value === 'string' && /^(?:https?:|data:|\/)/.test(value)) localUrl(value, ctx.projectId);
          else if (value && typeof value === 'object') Object.values(value).forEach(check);
        };
        check(input.options.midjourneyReferences);
      }
      const signal = ctx.childSignal ? AbortSignal.any([ctx.signal, ctx.childSignal]) : ctx.signal;
      signal.throwIfAborted();
      const result = await generation.generateNode({ ...input, kind, model, references: refs }, { ...ctx, signal });
      signal.throwIfAborted();
      if (kind === 'text') return { text: String(result.text ?? result.content ?? result.result ?? '') };
      return { type: kind, url: result.resultUrl || result.resultUrls?.[0], urls: result.resultUrls || [result.resultUrl] };
    },
    'media.read': scopedAsset,
    async 'media.compose'(input, ctx) {
      if (!Array.isArray(input.images) || input.images.length > 16) throw nodeError(NODE_ERROR.INVALID, '拼图应为最多 16 张图片的数组');
      const images = await Promise.all((input.images || []).map(item => scopedAsset(item, ctx)));
      const saved = await mediaProcessor.compose({ projectId: ctx.projectId, images, columns: input.columns, cellWidth: input.cellWidth,
        signal: ctx.childSignal ? AbortSignal.any([ctx.signal, ctx.childSignal]) : ctx.signal });
      return { assetId: saved.id, type: 'image', url: saved.url };
    },
    'workflow.execute': (input, ctx) => workflow.runNode(input, { ...ctx, signal: ctx.childSignal ? AbortSignal.any([ctx.signal, ctx.childSignal]) : ctx.signal }),
    async 'media.inspect'(input, ctx) {
      const asset = await scopedAsset(input, ctx);
      const result = await mediaAgent.inspect({ ...asset, projectId: ctx.projectId, times: input.times, speech: input.speech === true,
        signal: ctx.childSignal ? AbortSignal.any([ctx.signal, ctx.childSignal]) : ctx.signal });
      const frames = [];
      for (const frame of result.frames || []) {
        ctx.signal.throwIfAborted();
        const saved = await mediaStore.save({ projectId: ctx.projectId, type: 'image', name: 'frame.jpg', data: Buffer.from(frame.dataUrl.split(',')[1], 'base64') });
        frames.push({ time: frame.time, assetId: saved.id, url: saved.url, type: 'image' });
      }
      return { ...result, frames };
    },
    async 'project.read'(_input, ctx) {
      const project = await projects.getWorkflowById(ctx.projectId);
      return { id: project.id, name: project.name, revision: project.revision, nodes: (project.nodes || []).map(node => ({ id: node.id, type: node.type, title: node.title })) };
    },
    'storage.get': (input, ctx) => store.value(ctx.scope + ':' + ctx.projectId, ctx.pluginId, input.key),
    'storage.set': (input, ctx) => store.value(ctx.scope + ':' + ctx.projectId, ctx.pluginId, input.key, input.value),
  };
}
