import { ERRORS } from '../../../modules/contracts/index.js';
import { providerError } from '../../../modules/contracts/providerErrors.js';
import { MODEL_DEFINITIONS, ROOT } from './protocol.js';
export const invalid = (message) =>
  providerError(message, {
    providerId: 'work-fisher', operation: 'validate-input', code: ERRORS.invalidModel,
    status: 400, expose: true, retryable: false,
  });
export function connection(kind, params, config) {
  const apiKey = String(config.WORK_FISHER_API_KEY || '').trim();
  if (!apiKey)
    throw Object.assign(invalid('请在设置中保存 Work-Fisher API Key。'), {
      code: ERRORS.credentialMissing,
    });
  const modelId = params[kind + 'Model'];
  const modeId = params[kind === 'text' ? 'languageMode' : kind + 'Mode'];
  const modesKey = kind === 'text' ? 'languageModes' : kind + 'Modes';
  const candidates = MODEL_DEFINITIONS.filter(
    (model) => model.kind === kind && model.selectable !== false,
  );
  const definition = candidates.find((model) =>
    (model[modesKey] || []).some(
      (mode) =>
        (!modeId || mode.value === modeId) &&
        model.endpoint[mode.value]?.model === modelId &&
        model.endpoint[mode.value]?.url === params.url,
    ),
  );
  if (!definition) throw invalid('请选择已适配的 Work-Fisher 模型与生成模式。');
  const mode = definition[modesKey].find(
    (item) =>
      (!modeId || item.value === modeId) && definition.endpoint[item.value]?.model === modelId,
  );
  const submitUrl = definition.endpoint[mode.value].url;
  const profileId = submitUrl.includes('/midjourney/')
    ? 'midjourney'
    : submitUrl.includes('/music/')
      ? 'music'
      : kind;
  return {
    apiKey,
    modelId,
    definition,
    mode,
    profileId,
    submitUrl,
    providerName: definition.provider,
    queryUrl:
      profileId === 'music'
        ? ROOT + '/v1/music/tasks/'
        : profileId === 'midjourney'
          ? ROOT + '/v1/midjourney/tasks/'
          : submitUrl + '/',
  };
}
