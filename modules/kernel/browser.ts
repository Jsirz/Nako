import { PluginHost } from './index.js';
import type { PluginContext } from '../contracts/index.js';
import type { LocalRuntimeUiService } from '../contracts/localRuntimeUi';
import type { AccountUiService, GenerationUiService, MediaSettingsService, ProjectPreferencesService, PromptCompositionService } from '../contracts/browserCapabilities';
import type { ProjectMediaRecoveryService } from '../contracts/projectWorkflow';
import type { ModelCatalogService, GenerationPreparationService } from '../contracts/generationCapabilities';
import type { NodeRunUiService } from '../contracts/nodeRunUi';
import type { AgentCanvasService } from '../contracts/agentCanvasWorkspace';
import type { CanvasEditingService } from '../contracts/canvasEditing';
import type { ProjectCatalogService } from '../contracts/projectCatalog';
import type { MediaCanvasService } from '../contracts/mediaCanvas';
import type { AccountPreferencesService } from '../contracts/browserCapabilities';
import type { DesktopBrowserService } from '../contracts/desktopBrowser';
import type { GenerationInteractionService } from '../contracts/generationCapabilities';
import type { CanvasPresentationService } from '../contracts/canvasPresentation';
import type { AgentDocumentService } from '../contracts/agentDocuments';

export const browserHost = new PluginHost();
export function localRuntimeUi(): LocalRuntimeUiService {
  return browserHost.services.get<LocalRuntimeUiService>('ui.local-runtime');
}
export const generationUi = () => browserHost.services.get<GenerationUiService>('ui.generation');
export const projectPreferences = () => browserHost.services.get<ProjectPreferencesService>('ui.project.preferences');
export const accountUi = () => browserHost.services.get<AccountUiService>('ui.account');
export const mediaSettings = () => browserHost.services.get<MediaSettingsService>('ui.media.settings');
export const promptComposition = () => browserHost.services.get<PromptCompositionService>('ui.prompt.composition');
export const mediaRecovery = () => browserHost.services.get<ProjectMediaRecoveryService>('ui.media.recovery');
export const modelCatalog = () => browserHost.services.get<ModelCatalogService>('ui.generation.catalog');
export const generationPreparation = () => browserHost.services.get<GenerationPreparationService>('ui.generation.preparation');
export const nodeRuns = () => browserHost.services.get<NodeRunUiService>('ui.nodes.runs');
export const agentCanvas = () => browserHost.services.optional<AgentCanvasService>('ui.agent.canvas');
export const canvasEditing = () => browserHost.services.get<CanvasEditingService>('ui.canvas.editing');
export const projectCatalog = () => browserHost.services.get<ProjectCatalogService>('ui.project.catalog');
export const mediaCanvas = () => browserHost.services.get<MediaCanvasService>('ui.media.canvas');
export const accountPreferences = () => browserHost.services.get<AccountPreferencesService>('ui.account.preferences');
export const desktopBrowser = () => browserHost.services.get<DesktopBrowserService>('ui.desktop.capabilities');
export const generationInteraction = () => browserHost.services.get<GenerationInteractionService>('ui.generation.interaction');
export const canvasPresentation = () => browserHost.services.get<CanvasPresentationService>('ui.canvas.presentation');
export const agentDocuments = () => browserHost.services.get<AgentDocumentService>('ui.agent.documents');
/** Existing adapter declarations remain type-only until each UI surface gets its own API file. */
type AdapterKeys = Extract<keyof Window, `__NAKO_${string}`>;
type BrowserServices = Pick<Window, AdapterKeys>;
const disposers = new Map<PropertyKey, () => void>();
let activatingContext: PluginContext | undefined;
const tracked = new WeakMap<object, Set<object>>();
export function trackBrowserResource<T>(context: PluginContext, value: T): T {
  if (value && typeof value === 'object') {
    const resource = value as { destroy?: () => void; dispose?: () => void };
    const method = resource.destroy || resource.dispose;
    let resources = tracked.get(context);
    if (!resources) {
      resources = new Set();
      tracked.set(context, resources);
    }
    if (typeof method === 'function' && !resources.has(value)) {
      resources.add(value);
      context.onDispose(() => method.call(value));
    }
  }
  return value;
}
export async function activateBrowserModule(context: PluginContext, activate: () => Promise<void>) {
  const previous = activatingContext;
  activatingContext = context;
  try {
    await activate();
  } finally {
    activatingContext = previous;
  }
}
export const browserServices = new Proxy({} as BrowserServices, {
  get: (_target, name) => browserHost.services.optional(`canvas.${String(name)}`),
  set: (_target, name, value) => {
    disposers.get(name)?.();
    if (value !== undefined) {
      const dispose = browserHost.services.register(
        `canvas.${String(name)}`,
        value,
        activatingContext?.pluginId || 'browser-session',
      );
      disposers.set(name, dispose);
      activatingContext?.onDispose(dispose);
      if (activatingContext) trackBrowserResource(activatingContext, value);
    } else disposers.delete(name);
    return true;
  },
  deleteProperty: (_target, name) => {
    disposers.get(name)?.();
    disposers.delete(name);
    return true;
  },
});
const isolatedServices = new WeakMap<Window, BrowserServices>();
/** Preserve injectable-window tests without storing any services on the Window object. */
export function getBrowserServices(target: Window): BrowserServices {
  if (typeof window !== 'undefined' && target === window) return browserServices;
  let services = isolatedServices.get(target);
  if (!services) {
    const host = new PluginHost();
    const release = new Map<PropertyKey, () => void>();
    services = new Proxy({} as BrowserServices, {
      get: (_object, key) => host.services.optional(String(key)),
      set: (_object, key, value) => {
        release.get(key)?.();
        if (value !== undefined) release.set(key, host.services.register(String(key), value));
        return true;
      },
    });
    isolatedServices.set(target, services);
  }
  return services;
}
