export type MidjourneyReferenceRole = 'cref' | 'sref' | 'dref';

export interface MidjourneyReferenceRoleDefinition {
  key: MidjourneyReferenceRole;
  label: string;
  description: string;
}

export interface MidjourneyReferenceNode {
  id: string;
  type: string;
  title?: unknown;
  prompt?: unknown;
  resultUrl?: unknown;
  networkUrl?: unknown;
  parentIds?: string[];
  midjourneyReferenceNodeIds?: Partial<Record<MidjourneyReferenceRole, string>>;
  [key: string]: unknown;
}

export type MidjourneyReferenceAssignments = Partial<Record<MidjourneyReferenceRole, string>>;

export type MidjourneyReferencePayload = Partial<Record<MidjourneyReferenceRole, string>>;

export interface MidjourneyReferenceAdapter {
  roles: readonly MidjourneyReferenceRoleDefinition[];
  assignments(
    node: MidjourneyReferenceNode,
    connectedNodes: readonly MidjourneyReferenceNode[],
  ): MidjourneyReferenceAssignments;
  assign(
    node: MidjourneyReferenceNode,
    connectedNodes: readonly MidjourneyReferenceNode[],
    role: MidjourneyReferenceRole,
    nodeId: string | null | undefined,
  ): MidjourneyReferenceAssignments;
  resolve(
    node: MidjourneyReferenceNode,
    nodes: readonly MidjourneyReferenceNode[],
  ): MidjourneyReferencePayload | null;
}
