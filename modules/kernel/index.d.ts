import type { PluginDefinition, PluginManifest, ServiceRegistry as Registry } from '../contracts/index.js';
export class ServiceRegistry implements Registry {
  register<T>(id: string, value: T, owner?: string): () => void;
  get<T = unknown>(id: string): T; optional<T = unknown>(id: string): T | undefined;
  has(id: string): boolean; list(): { id: string; owner: string }[]; removeOwner(owner: string): void;
}
export class EventBus {
  constructor(onError?: (error: unknown) => void);
  on(name: string, listener: (value: unknown) => void): () => void; emit(name: string, value?: unknown): void;
}
export class PluginHost {
  constructor(options?: { config?: Record<string, Record<string, unknown>>; readConfig?: (id: string, key: string) => unknown; credentialStore?: { get(id: string): unknown }; credentialGrants?: Record<string, string[]>; logger?: Pick<Console, 'info' | 'warn' | 'error'> });
  readonly services: ServiceRegistry; readonly events: EventBus;
  register(plugin: PluginDefinition): this;
  list(): (PluginManifest & { state: string })[];
  discover(capability: string): (PluginManifest & { state: string })[];
  load(id: string): Promise<void>; unload(id: string, options?: { shutdown?: boolean }): Promise<void>;
  start(ids?: string[]): Promise<this>; stop(): Promise<void>;
}
export function satisfiesVersion(version: string, range: string): boolean;
export * from './nodeRegistry.js';
export * from './nodeDagScheduler.js';
