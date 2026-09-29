import type { NodeRegistry } from '../kernel/nodeRegistry.js';
export interface NodeDirectoryState { directory: string; packages: Array<{ packageId: string; directory: string; manifest: Record<string, unknown> }>; errors: Array<{ directory: string; message: string }>; }
export interface NodeDirectoryLoader { readonly directory: string; reload(): Promise<NodeDirectoryState>; list(): NodeDirectoryState; ui(packageId: string, nodeType: string): Promise<string>; }
export declare function createNodeDirectoryLoader(options: { directory: string; builtinDirectory?: string; registry: NodeRegistry; logger?: Pick<Console, 'info' | 'warn' | 'error'> }): NodeDirectoryLoader;
