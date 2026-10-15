/** Service boundary for module.agent.drama; no pi implementation types cross it. */
export interface DramaPlanValidation {
  assertDramaObject<T extends Record<string, unknown>>(value: T, keys: string[], label?: string): T;
  assertDramaPlanReviewable(plan: Record<string, unknown>): void;
  requireDramaPlanId(value: unknown): string;
  requireDramaProjectId(value: unknown): string;
  requireDramaRevision(value: unknown): number;
  validateDramaPlan(value: unknown): Record<string, unknown>;
}
export interface DramaPlanStoreOptions {
  libraryDirectory: string;
  validation: DramaPlanValidation;
}
export interface DramaSession {
  id: string;
  workflow?: Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
export interface DramaSessionAccess {
  get(id: string): Promise<DramaSession | null>;
  save(session: DramaSession): Promise<DramaSession>;
}
export interface DramaSnapshot {
  session: DramaSession;
  plan: Record<string, unknown> | null;
  execution: Record<string, unknown> | null;
  composition?: Record<string, unknown>;
}
export interface DramaTurnInput {
  session: DramaSession;
  turn: { message: string; nodes?: Array<Record<string, unknown>> };
  instructions: string;
}
export interface DramaBusinessTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  executionMode: 'sequential';
  replay: 'never';
  execute(
    callId: string,
    args: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    details: Record<string, unknown>;
  }>;
}
export interface DramaConversation {
  snapshot(sessionId: string, projectId: string): Promise<DramaSnapshot>;
  attachScript(sessionId: string, input: Record<string, unknown>): Promise<DramaSnapshot>;
  action(
    sessionId: string,
    input: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<DramaSnapshot>;
  prepareTurn(input: DramaTurnInput): Promise<{
    instructions: string;
    message: string;
    tools: DramaBusinessTool[];
  }>;
}
export interface AgentDramaService {
  createConversation(store: DramaSessionAccess): DramaConversation;
}
