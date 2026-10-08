import type { NodePackageManifest } from './nodeSdk.js';
import type { CanvasNode } from './canvasDocument';
import type { MediaDeliveryReference } from './mediaDelivery.js';
export type PluginType = 'module' | 'provider' | 'workflow' | 'storage' | 'media' | 'platform';
export interface PluginManifest {
  id: string; version: string; apiVersion: string; type: PluginType;
  dependencies?: Record<string, string>; capabilities?: string[];
  services?: { provides?: string[]; requires?: string[]; optional?: string[] };
  credentials?: string[]; reloadRequired?: boolean;
  contextKeys?: string[]; configPrefixes?: string[];
  providers?: ProviderDescriptor[];
  nodePackages?: NodePackageManifest[];
}
export interface ServiceRegistry {
  register<T>(id: string, value: T, owner?: string): () => void;
  get<T = unknown>(id: string): T;
  optional<T = unknown>(id: string): T | undefined;
  has(id: string): boolean;
  list(): { id: string; owner: string }[];
  removeOwner(owner: string): void;
}
export interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}
export interface ProviderCredentialManager {
  read(): Promise<Record<string, string>>;
  update(patch: Record<string, string>): Promise<Record<string, string>>;
}
export interface PluginContext {
  readonly pluginId: string;
  readonly signal: AbortSignal;
  readonly services: Pick<ServiceRegistry, 'register' | 'get' | 'optional' | 'has' | 'list'>;
  readonly events: { on(name: string, listener: (value: unknown) => void): () => void; emit(name: string, value?: unknown): void };
  readonly config: { get<T = unknown>(key: string, fallback?: T): T };
  readonly credentials: { get(providerId: string): unknown };
  readonly logger: Logger;
  onDispose(dispose: () => void | Promise<void>): void;
}
export interface PluginDefinition {
  manifest: PluginManifest;
  activate(context: PluginContext): Promise<void> | void;
  canDeactivate?(): boolean;
  deactivate?(): Promise<void> | void;
}
export interface NakoPlugin extends PluginDefinition {
  id: string;
  version: string;
  type: PluginType;
  deactivate(): Promise<void> | void;
}
export interface MediaAsset { id: string; type: 'image' | 'video' | 'audio'; url: string; projectId: string; metadata?: Record<string, unknown> }
export interface MediaInput { projectId: string; type: MediaAsset['type']; data: Uint8Array; name?: string }
export interface MediaStore {
  save(input: MediaInput): Promise<MediaAsset>;
  read(id: string): Promise<MediaAsset>;
  remove(id: string): Promise<void>;
}
export interface MediaOperationInput { params: Record<string, string>; query: Record<string, unknown>; body?: Record<string, unknown> }
export interface MediaOperationResult { status: number; body: unknown }
export type MediaLibraryOperation = 'save' | 'list' | 'importAsset' | 'update' | 'remove' | 'listWorkflows' | 'importWorkflow' | 'removeWorkflow' | 'listPublicWorkflows' | 'readPublicWorkflow';
export type MediaLibraryOperations = Readonly<Record<MediaLibraryOperation, (input: MediaOperationInput) => Promise<MediaOperationResult>>>;
export interface MediaDownloadScope { libraryDirectory: string; configDirectory: string }
export type MediaDownloadOperation = 'settings' | 'updateSettings' | 'selectDirectory' | 'resetDirectory' | 'save' | 'openDirectory';
export type MediaDownloadOperations = Readonly<Record<MediaDownloadOperation, (input: { scope: MediaDownloadScope; body?: Record<string, unknown> }) => Promise<MediaOperationResult>>>;
export interface CropInput { assetId: string; left: number; top: number; width: number; height: number }
export interface TrimInput { assetId: string; start: number; end: number }
export interface MediaProcessor {
  crop(input: CropInput): Promise<MediaAsset>;
  trimVideo(input: TrimInput): Promise<MediaAsset>;
  compose(input: { projectId: string; images: Array<{ url: string }>; columns?: number; cellWidth?: number; signal?: AbortSignal }): Promise<MediaAsset>;
  thumbnail(sourceUrl: string, maxSize?: unknown): Promise<MediaDeliveryReference>;
}
export interface ProjectMediaStore {
  saveMediaToFile(dataUrl: string, projectId: string, prompt?: string, nodeId?: string | null): { id: string; url: string } | null;
  sanitizeWorkflowNodes(nodes: CanvasNode[], projectId: string): CanvasNode[];
}
export interface Project { id: string; title: string; revision: number; nodes: CanvasNode[]; [key: string]: unknown }
export interface SaveResult { id: string; revision: number }
export interface ProjectRepository {
  get(id: string): Promise<Project | null>; list(): Promise<Project[]>;
  save(project: Project): Promise<SaveResult>; delete(id: string): Promise<void>;
}
export type GenerationKind = 'image' | 'video' | 'audio' | 'text';
export interface GenerationRequest { nodeId: string; projectId?: string; prompt?: string; signal?: AbortSignal; [key: string]: unknown }
export interface GenerationResult { url?: string; text?: string; [key: string]: unknown }
export interface ModelCapability { id: string; kinds: GenerationKind[]; execution: 'immediate' | 'polling'; recoverable?: boolean }
export interface ProviderContext { signal?: AbortSignal; [key: string]: unknown }
export interface ProviderDescriptor {
  name: string; kinds: GenerationKind[]; execution: 'immediate' | 'polling'; requiredSecrets: string[]; pluginId?: string;
}
export type RecoveryReceipt = Readonly<Record<string, unknown>>;
export type RecoveryPredicate = (receipt: RecoveryReceipt, request: GenerationRequest, context: ProviderContext) => boolean;
export type RecoveryHandler = (receipt: RecoveryReceipt, request: GenerationRequest, context: ProviderContext, signal?: AbortSignal) => Promise<GenerationResult>;
export interface GenerationHandler {
  id: string; capabilities(): ModelCapability[];
  generateImage?(request: GenerationRequest, context: ProviderContext): Promise<GenerationResult>;
  generateVideo?(request: GenerationRequest, context: ProviderContext): Promise<GenerationResult>;
  generateAudio?(request: GenerationRequest, context: ProviderContext): Promise<GenerationResult>;
  generateText?(request: GenerationRequest, context: ProviderContext): Promise<GenerationResult>;
  canRecoverImage?: RecoveryPredicate; recoverImage?: RecoveryHandler;
  canRecoverVideo?: RecoveryPredicate; recoverVideo?: RecoveryHandler;
  canRecoverAudio?: RecoveryPredicate; recoverAudio?: RecoveryHandler;
  canRecoverText?: RecoveryPredicate; recoverText?: RecoveryHandler;
}
export interface GenerationProvider { descriptor: Readonly<ProviderDescriptor>; handler: Readonly<GenerationHandler> }
export interface GenerationTaskStore { get(nodeId: string): unknown; upsert(task: unknown): unknown }
export interface WorkflowDefinition { id: string; runtimeKind: string; [key: string]: unknown }
export interface WorkflowRunRequest { runId: string; definitionId: string; deploymentId: string; bindingSetId: string; projectId: string; values: Record<string, unknown>; instanceType?: string; signal?: AbortSignal }
export interface WorkflowRunResult { [key: string]: unknown }
export interface WorkflowResumeRequest { task: Record<string, unknown>; signal?: AbortSignal }
export interface WorkflowInputCleanup { runId: string; deployment: Record<string, unknown>; stageLedger: Record<string, unknown>; code?: string }
export interface WorkflowExecutor {
  id: string; canExecute(definition: WorkflowDefinition): boolean;
  execute(request: WorkflowRunRequest): Promise<WorkflowRunResult | void>;
  resume?(request: WorkflowResumeRequest): Promise<WorkflowRunResult | void>;
  retryInputCleanup?(runId: string): Promise<unknown>;
  markRecoveryInputsOrphaned?(task: Record<string, unknown>, code: string): Promise<void>;
  markInputsOrphaned?(request: WorkflowInputCleanup): Promise<void>;
  cleanupInputs?(request: WorkflowInputCleanup): Promise<void>;
}
export type WorkflowClientMethod = 'getSystemStats' | 'getObjectInfo' | 'supportsAtomicJobCancel' | 'uploadInput' | 'getWebAppInfoForProtocol' | 'getWebAppInfo' | 'getWorkflowApiFormat' | 'getGlobalAiAppPageInfo' | 'getWebAppCover' | 'openOutput' | 'validateCredential' | 'resolveWebAppInfo';
export type WorkflowClient = Readonly<Partial<Record<WorkflowClientMethod, (...args: unknown[]) => unknown>>>;
export interface WorkflowExecutors {
  createClient(id: string, options: Record<string, unknown>): WorkflowClient;
  createAll(options: Record<string, unknown>): Array<[string, WorkflowExecutor]>;
  list(): string[];
}
export const GENERATION_KINDS: readonly GenerationKind[];
export const WORKFLOW_CLIENT_METHODS: readonly WorkflowClientMethod[];
export const WORKFLOW_EXECUTOR_METHODS: readonly (keyof WorkflowExecutor)[];
export function validatePluginManifest(value: unknown): PluginManifest;
export function validateProviderDescriptor(value: unknown): ProviderDescriptor;
export const PLUGIN_API_VERSION: string;
export * from './agentProtocol.js';
export * from './agentSession.js';
export type * from './agentDrama';
export * from './browserCapabilities';
export * from './nodeSdk.js';
export * from './canvasDocument';
export * from './generationScheduler';
export * from './mediaDelivery.js';
export type * from './localRuntimeService';
export * from './generationAdmission.js';
export * from './agentTextGeneration.js';
export * from './generationService.js';
export type * from './generationUi';
export type * from './httpSecurity';
export type * from './projectUi';
export type * from './projectWorkflow';
export type * from './projectRepositoryExtensions';
export const PLUGIN_TYPES: readonly PluginType[];
export const SERVICES: Readonly<Record<string, string>>;
export { ERRORS, PluginError, type ErrorCode, type ErrorOptions } from './errors.js';
export * from './identityErrors.js';
export * from './desktopErrors.js';
export * from './providerErrors.js';
export * from './generationErrors.js';
export * from './localRuntimeErrors.js';
export * from './agentErrors.js';
export * from './canvasErrors.js';
export * from './projectErrors.js';
export * from './storageErrors.js';
