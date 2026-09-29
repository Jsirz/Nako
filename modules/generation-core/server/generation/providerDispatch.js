import { getGenerationProvider } from '../../providerRegistry.js';
import { loadModelCatalog } from '../config/modelCatalog.js';
import { parseTimeToMs, withTimeout } from '../../timing.js';
function getModelRegistry() {
  return loadModelCatalog();
}

function modelConfigFor(registry, modelName) {
  return registry[modelName];
}

/**
 * 并发控制工具：统一标准化 URL Key，避免 query 顺序差异导致误判。
 */
function normalizeUrlKey(inputUrl = '') {
  try {
    const parsed = new URL(inputUrl);
    const entries = Array.from(parsed.searchParams.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const normalizedQuery = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${normalizedPath}${normalizedQuery ? `?${normalizedQuery}` : ''}`;
  } catch {
    return String(inputUrl || '').trim();
  }
}

/**
 * 统一解析最终执行目标（与真实请求分发口径一致）。
 * 返回：最终 URL、最终模型 ID、并发上限等。
 */
export function resolveFinalExecutionContext(modelName, mode) {
  const registry = getModelRegistry();
  const config = modelConfigFor(registry, modelName);
  if (!config) return null;

  const modelKey = config.name.replace(/[\s.-]/g, '_').toUpperCase();
  const envModelIdKey = `MODEL_ID_${modelKey}`;

  const endpointMap = config.endpoint || {};
  const endpointKeys = Object.keys(endpointMap);
  const matchedMode = mode && endpointMap[mode] ? mode : '';
  const resolvedMode = matchedMode || (endpointKeys.length === 1 ? endpointKeys[0] : '');

  const fallbackModeConfig = Object.values(endpointMap)[0];
  const modeConfig = endpointMap[resolvedMode] || endpointMap[mode] || fallbackModeConfig;
  let finalUrl = typeof modeConfig === 'object' ? modeConfig?.url : modeConfig;
  const defaultModelId = typeof modeConfig === 'object' ? modeConfig?.model : '';
  let finalModelId = defaultModelId;

  const modeEnvSuffix = (resolvedMode || mode || '').replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();

  // 覆盖优先级：模式级 > 模型通用级 > 配置默认
  const envUrlModeKey = modeEnvSuffix ? `MODEL_URL_${modelKey}_${modeEnvSuffix}` : '';
  const envUrlCommonKey = `MODEL_URL_${modelKey}`;
  if (envUrlModeKey && process.env[envUrlModeKey]) {
    finalUrl = String(process.env[envUrlModeKey]).trim();
  } else if (process.env[envUrlCommonKey]) {
    finalUrl = String(process.env[envUrlCommonKey]).trim();
  }

  const envModeModelKey = modeEnvSuffix ? `MODEL_ID_${modelKey}_${modeEnvSuffix}` : '';
  if (envModeModelKey && process.env[envModeModelKey]) {
    finalModelId = String(process.env[envModeModelKey]).trim();
  } else if (process.env[envModelIdKey]) {
    finalModelId = String(process.env[envModelIdKey]).trim();
  }

  // 若未取到模型 ID，则回退到模型名，保证并发 key 始终可用
  if (!finalModelId) {
    finalModelId = config.name;
  }

  return {
    modelName: config.name,
    modelIdKey: String(finalModelId).trim(),
    rawUrl: finalUrl,
    normalizedUrl: normalizeUrlKey(finalUrl || ''),
    finalModelId,
    maxConcurrent: config.maxConcurrent === 0 ? 0 : Math.max(1, Number(config.maxConcurrent || 1)),
    timeEstimate: config.timeEstimate || '5min',
    useProxy: config.useProxy,
  };
}

/**
 * 统一分发器
 */
export const PROVIDERS = {
  get: (modelName) => {
    if (!modelName) return null;

    const registry = getModelRegistry();
    const config = modelConfigFor(registry, modelName);

    if (!config || !config.provider) {
      console.error(`[Generation] Unknown model: ${modelName}`);
      return null;
    }

    // 直接根据配置文件中的 provider 字符串从全局集合中查找对应的处理器对象
    const handler = getGenerationProvider(config.provider);
    if (!handler) {
      console.error(`[Generation] No handler found for provider: ${config.provider}`);
      return null;
    }

    // 检查是否有覆盖的环境变量: MODEL_PROXY_model_name, MODEL_ID_model_name (空格点号转下划线)
    // 使用配置中的逻辑名称来生成 Key，确保旧节点也能匹配到正确的环境变量
    const modelKey = config.name.replace(/[\s.-]/g, '_').toUpperCase();
    const envProxyKey = `MODEL_PROXY_${modelKey}`;

    // 环境变量覆盖优先级：环境变量 > 代码默认值
    const finalUseProxy =
      process.env[envProxyKey] !== undefined
        ? process.env[envProxyKey] === 'true'
        : config.useProxy;

    // 包装函数，透传 url, modelId, timeEstimate 和 useProxy 到处理器参数中
    const wrap = (fn) => {
      if (!fn) return undefined;
      return (params, ctx) => {
        // 动态确定当前模式并解析最终生效目标（URL + 模型ID）
        const currentMode =
          params.imageMode ||
          params.videoMode ||
          params.audioMode ||
          params.languageMode ||
          params.mode;
        const finalCtx = resolveFinalExecutionContext(config.name, currentMode);
        if (!finalCtx) {
          throw new Error(`无法解析模型执行上下文: ${config.name}`);
        }
        const finalUrl = finalCtx.rawUrl;
        const finalModelId = finalCtx.finalModelId;
        const defaultModelId = finalModelId;

        const executionPromise = fn(
          {
            ...params,
            // 确保透传解析后的物理模型 ID 到对应的参数字段
            imageModel: params.imageModel ? finalModelId : params.imageModel,
            videoModel: params.videoModel ? finalModelId : params.videoModel,
            textModel: params.textModel ? finalModelId : params.textModel,
            audioModel: params.audioModel ? finalModelId : params.audioModel,
            // 传递原始默认 ID 作为映射键，防止自定义 ID 导致解析器失效
            mappingKey: defaultModelId,
            url: finalUrl,
            timeEstimate: config.timeEstimate,
            useProxy: finalUseProxy,
          },
          ctx,
        );

        // parseTimeToMs 已包含 3 倍安全余量：视频按 duration 放大，其它类型按 generateCount 放大
        const baseMs = parseTimeToMs(config.timeEstimate || '5min');
        const totalMs = params.videoModel
          ? baseMs * Math.max(1, Number(params.duration) || 1)
          : baseMs * Math.max(1, Number(params.generateCount) || 1);

        // 外部兜底超时
        return withTimeout(executionPromise, totalMs);
      };
    };

    return {
      ...handler,
      providerName: config.provider,
      recoveryParameters: (task) => {
        const context = resolveFinalExecutionContext(config.name, task.videoMode || task.imageMode);
        return {
          nodeId: task.nodeId,
          videoModel: context?.finalModelId,
          videoMode: task.videoMode,
          resolution: task.resolution,
          imageModel: context?.finalModelId,
          url: context?.rawUrl,
          useProxy: finalUseProxy,
        };
      },
      generateImage: wrap(handler.generateImage),
      generateVideo: wrap(handler.generateVideo),
      generateText: wrap(handler.generateText),
      generateAudio: wrap(handler.generateAudio),
    };
  },
};
