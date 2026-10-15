import { getBrowserServices } from '../../../kernel/browser';
import type { SourceSettingsClient } from './sourceSettingsClient';
import { openSettings } from '../../../kernel/ui/settingsNavigation';

type AgentModelCandidate = { id: string };

export type AgentModelAvailabilityBridge = {
  filter<T extends AgentModelCandidate>(models: readonly T[]): T[];
  refresh(): Promise<void>;
  subscribe(listener: () => void): () => void;
  emptyLabel(): string;
  openConnection(): void;
};

declare global {
  interface Window {
    __NAKO_AGENT_MODEL_AVAILABILITY__?: AgentModelAvailabilityBridge;
  }
}

export function installAgentModelAvailability(
  client: SourceSettingsClient,
  target: Window = window,
): AgentModelAvailabilityBridge {
  const services = getBrowserServices(target);
  if (services.__NAKO_AGENT_MODEL_AVAILABILITY__) {
    return services.__NAKO_AGENT_MODEL_AVAILABILITY__;
  }
  let availableNames = new Set<string>();
  let pending: Promise<void> | null = null;
  let refreshVersion = 0;
  let state: 'loading' | 'ready' | 'error' = 'loading';
  const listeners = new Set<() => void>();
  const bridge: AgentModelAvailabilityBridge = {
    emptyLabel: () =>
      state === 'loading'
        ? '正在读取模型…'
        : state === 'error'
          ? '读取失败，点击重试'
          : '连接模型服务',
    openConnection() {
      if (state === 'error') void bridge.refresh().catch(() => {});
      else if (state !== 'loading') openSettings('models');
    },
    filter(models) {
      return models.filter((model) => availableNames.has(model.id));
    },
    async refresh() {
      refreshVersion += 1;
      if (pending) return pending;
      state = 'loading';
      pending = (async () => {
        for (;;) {
          const version = refreshVersion;
          try {
            const blocks = await client.getBlocks();
            if (version !== refreshVersion) continue;
            availableNames = new Set(
              blocks.flatMap((block) =>
                block.media
                  .filter((media) => media.kind === 'text')
                  .flatMap((media) =>
                    media.models.filter((model) => model.configured).map((model) => model.name),
                  ),
              ),
            );
            state = 'ready';
            return;
          } catch (error) {
            if (version !== refreshVersion) continue;
            availableNames.clear();
            state = 'error';
            throw error;
          }
        }
      })().finally(() => {
        pending = null;
        listeners.forEach((listener) => listener());
      });
      return pending;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  services.__NAKO_AGENT_MODEL_AVAILABILITY__ = bridge;
  // Refresh cached availability after local provider settings change.
  const refreshOnSourceChange = () => {
    void bridge.refresh().catch(() => undefined);
  };
  target.addEventListener('nako:model-sources-changed', refreshOnSourceChange);
  void bridge.refresh().catch(() => undefined);
  return bridge;
}
