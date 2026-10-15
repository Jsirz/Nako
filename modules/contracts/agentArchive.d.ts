import type { PluginError } from './errors.js';
export interface AgentHistoryEntry {
  id: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  stopped: boolean;
  media: { type: 'image' | 'video' | 'audio'; url: string }[];
  tools: { name: string; action: string; status: string }[];
}
export interface AgentHistoryArchive {
  format: 'nako-agent-history';
  version: 1;
  projectId: string;
  activeSessionId: string | null;
  sessions: {
    id: string;
    topic: string;
    createdAt: string;
    activeBranch: string;
    branches: { id: string; tipId: string | null }[];
    entries: AgentHistoryEntry[];
  }[];
}
export interface AgentArchiveService {
  exportProject(projectId: string): Promise<AgentHistoryArchive>;
  /** Restores new sessions and returns a rollback callback for the enclosing project import. */
  importProject(
    archive: AgentHistoryArchive,
    targetProjectId: string,
  ): Promise<() => Promise<void>>;
}
export const AGENT_ARCHIVE_FORMAT: 'nako-agent-history';
export function agentArchiveError(message: string): PluginError & { status: number };
export function validateAgentArchive(archive: unknown, projectId: string): AgentHistoryArchive;
