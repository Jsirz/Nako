export type NodeMediaType = 'text' | 'image' | 'video' | 'audio' | 'json' | 'any';
export type NodeCategory = 'generation' | 'asset' | 'tool' | 'workflow' | 'utility';
export type NodeRendererKind = 'native' | 'generic' | 'iframe' | 'missing';
export type NodeAgentSideEffect = 'none' | 'read' | 'write' | 'network';
export interface NodePort { id: string; media: NodeMediaType[]; required?: boolean; multiple?: boolean; maximum?: number; schema?: Record<string, unknown>; }
export interface NodeExecutorDeclaration { method: string; transport?: 'rpc'; timeoutMs?: number; }
export interface NodeAgentDeclaration { exposed: boolean; name?: string; description?: string; requiresConfirmation?: boolean; sideEffect?: NodeAgentSideEffect; }
export interface NodeDefinition { capabilities?: string[]; type: string; version: string; category: NodeCategory; title?: string; description?: string; inputs: NodePort[]; outputs: NodePort[]; parameters?: Record<string, unknown>; render: { kind: NodeRendererKind; component?: string; entry?: string }; executor?: NodeExecutorDeclaration; agent?: NodeAgentDeclaration; initialStatus?: string; migrations?: NodeMigration[]; missing?: boolean; owner?: string; }
export interface NodeMigration { from: string; to: string; renameParameters?: Record<string, string>; renameInputs?: Record<string, string>; renameOutputs?: Record<string, string>; defaults?: Record<string, unknown>; }
export interface NodePackageManifest { id: string; version: string; apiVersion: string; title: string; entry?: string; nodes: NodeDefinition[]; capabilities?: string[]; }
export interface NodePackage { manifest: NodePackageManifest; migrate?: (node: Record<string, unknown>, from: string, to: string) => Record<string, unknown>; executors?: Record<string, (input: unknown, context: unknown) => Promise<unknown> | unknown>; }
export interface NodeEndpoint { nodeId: string; portId: string; }
export interface NodeEdge { id?: string; source: NodeEndpoint; target: NodeEndpoint; }
export declare const NODE_SDK_VERSION: string;
export declare const NODE_MEDIA_TYPES: readonly NodeMediaType[];
export declare const NODE_CATEGORIES: readonly NodeCategory[];
export declare const NODE_RENDERERS: readonly NodeRendererKind[];
export declare const NODE_AGENT_SIDE_EFFECTS: readonly NodeAgentSideEffect[];
export declare function validateNodeDefinition(value: unknown, path?: string): NodeDefinition;
export declare function validateNodePackageManifest(value: unknown): NodePackageManifest;
export declare function createMissingNodeDefinition(type: string, version?: string, owner?: string): NodeDefinition;
export declare function cloneNodeDefinition(definition: NodeDefinition): NodeDefinition | undefined;
