import type { NodeDefinition } from './nodeSdk.js';
export declare function migrateNodeRecord<T extends Record<string, unknown>>(source: T, definition: NodeDefinition): { node: T; inputs: Record<string, string>; outputs: Record<string, string> };
