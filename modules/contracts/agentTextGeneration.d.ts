import { PluginError, type ErrorCode } from './index.js';

export const AGENT_TEXT_GENERATION_SERVICE: 'generation.textTransport';
export class AgentTextGenerationError extends PluginError {
  constructor(code: ErrorCode, message: string, options?: {
    status?: number; context?: Record<string, unknown>;
  });
}
export interface AgentTextModelReference { name: string; provider: string }
/** Display/capability metadata only: never endpoints, proxy settings or secrets. */
export interface AgentTextModel {
  reference: AgentTextModelReference;
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  languageModes?: Array<{ value: string; allowedInputs?: Record<string, number> }>;
}
export type AgentTextContent =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType: string; data: string }
  | { type: 'thinking'; thinking: string }
  | { type: 'toolCall'; id: string; name: string; arguments: Record<string, unknown> };
export type AgentTextMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string | AgentTextContent[] }
  | { role: 'toolResult'; toolCallId: string; content: AgentTextContent[] };
/** UI parameter vocabulary; mapping to provider fields belongs to the adapter. */
export interface AgentTextParameters {
  temperature?: number;
  top_p?: number;
  max_output_tokens?: number;
  reasoning_effort?: string;
  reasoning?: string;
  detail?: string;
  enable_thinking?: boolean | 'true' | 'false';
}
export interface AgentTextGenerationRequest {
  model: AgentTextModelReference;
  messages: AgentTextMessage[];
  tools?: Array<{ name: string; description?: string; parameters: Record<string, unknown> }>;
  params?: AgentTextParameters;
  /** Per-turn ceiling, also used by harness compaction. */
  maxTokens?: number;
}
export interface AgentTextGenerationResult {
  content: AgentTextContent[];
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number };
  stopReason: 'stop' | 'toolUse';
}
export interface AgentTextGenerationService {
  /** Resolves one catalog entry; rejects ambiguity and never reads credentials. */
  resolveModel(requested: string): Promise<AgentTextModel>;
  /** One submission, no retry. Deltas are provisional; only the resolved result
   * contains validated complete tool calls. Reject on truncation/invalid JSON.
   * AbortSignal covers credential resolution, submission and body consumption.
   * Errors expose contracts ErrorCode and safe context, never upstream bodies. */
  generate(request: AgentTextGenerationRequest, options?: {
    signal?: AbortSignal;
    onEvent?: (event: { type: 'textDelta'; text: string }) => void;
  }): Promise<AgentTextGenerationResult>;
}
