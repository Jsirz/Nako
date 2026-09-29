import type { NodeDefinition, NodeEdge, NodePackage, NodePackageManifest } from '../contracts/nodeSdk.js';
export interface NodeRegistryOptions { sdkVersion?: string; onChange?: (event: Record<string, unknown>) => void; }
export interface NodeResolution { packageId: string; owner: string; definition: NodeDefinition; }
export declare class NodeRegistry {
  readonly sdkVersion: string;
  constructor(options?: NodeRegistryOptions);
  register(nodePackage: NodePackage | NodePackageManifest, owner?: string): () => boolean;
  unregister(packageId: string): boolean;
  unregisterOwner(owner: string): number;
  listPackages(): Array<NodePackageManifest & { owner: string }>;
  listDefinitions(): NodeDefinition[];
  getDefinition(type: string, owner?: string): NodeDefinition | undefined;
  getExecutor(type: string, owner?: string): ((input: unknown, context: unknown) => Promise<unknown> | unknown) | undefined;
  resolveNode(type: string, owner?: string): NodeResolution | undefined;
  createMissing(type: string, version?: string, owner?: string): NodeDefinition;
  migrate(node: Record<string, unknown>): { node: Record<string, unknown>; migrated: boolean; missing: boolean; migrationRequired?: boolean };
  validateNode(node: Record<string, unknown>): string[];
  validateEdge(edge: NodeEdge, nodes: Array<Record<string, unknown>>): { valid: boolean; code?: string };
  diagnostics(): { packageCount: number; definitionCount: number; missingCount: number };
}
export declare function createNodeRegistry(options?: NodeRegistryOptions): NodeRegistry;
