import { ERRORS, PluginError } from '../../../contracts/errors.js';
import type {
  DefaultModelsClient,
  DefaultModelsSnapshot,
  DefaultModelValues,
  ModelKind,
} from '../../../contracts/defaultModels';

export function createDefaultModelsClient(
  fetcher: typeof fetch = globalThis.fetch,
): DefaultModelsClient {
  let snapshot: DefaultModelsSnapshot | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const perform = async (method: string, values?: Partial<DefaultModelValues>) => {
    const response = await fetcher('/api/generation/default-models', {
      method,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      ...(values ? { body: JSON.stringify(values) } : {}),
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (!response.ok) throw new PluginError(ERRORS.invalidConfiguration, data.error || '默认模型读取或保存失败。', {
      status: response.status, context: { moduleId: 'generation-core', operation: 'defaultModelsRequest', method },
    });
    if (
      !data.defaults ||
      !data.candidates ||
      ['text', 'image', 'video', 'audio'].some(
        (kind) => typeof data.defaults[kind] !== 'string' || !Array.isArray(data.candidates[kind]),
      )
    )
      throw new PluginError(ERRORS.invalidConfiguration, 'Invalid default model response', {
        context: { moduleId: 'generation-core', operation: 'defaultModelsRequest', method },
      });
    snapshot = data;
    listeners.forEach((listener) => listener());
    return data as DefaultModelsSnapshot;
  };
  // A refresh started during a save must observe the saved value, not race it.
  const request = (method: string, values?: Partial<DefaultModelValues>) => {
    const next = queue.catch(() => {}).then(() => perform(method, values));
    queue = next;
    return next;
  };
  const get = (kind: ModelKind, requested?: string) =>
    requested?.trim() || snapshot?.defaults[kind] || '';
  return {
    get,
    resolve(kind, requested) {
      if (requested?.trim()) return requested.trim();
      const name = get(kind);
      if (!name) throw new PluginError(ERRORS.invalidModel, '请先在设置中选择默认模型，或为当前操作指定模型。', {
        context: { moduleId: 'generation-core', operation: 'resolveDefaultModel', kind },
      });
      if (!snapshot?.candidates[kind].some((model) => model.name === name && model.configured))
        throw new PluginError(ERRORS.invalidModel, `默认模型「${name}」未配置或已停用，请在设置中重新选择。`, {
          context: { moduleId: 'generation-core', operation: 'resolveDefaultModel', kind, modelName: name },
        });
      return name;
    },
    read: () => request('GET'),
    update: (values) => request('PUT', values),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
