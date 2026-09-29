import crypto from 'node:crypto';
import { AGENT_ARCHIVE_FORMAT, validateAgentArchive } from '../../../contracts/agentArchive.js';
import { sessionView } from './session.js';
import { assistantMessage } from './modelAdapter.js';

function exportSession(record) {
  const visible = new Map();
  for (const branch of Object.keys(record.branches)) {
    for (const message of sessionView({ ...record, activeBranch: branch }).transcript)
      visible.set(message.id, message);
  }
  const parents = new Map(),
    entries = [];
  for (const entry of record.entries) {
    const message = visible.get(entry.id);
    const parentId = parents.get(entry.parentId) ?? null;
    parents.set(entry.id, message ? entry.id : parentId);
    if (!message) continue;
    entries.push({
      id: entry.id,
      parentId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      stopped: message.stopped,
      media: (message.media || []).map(({ type, url }) => ({ type, url })),
      tools: message.tools.map(({ name, action, status }) => ({
        name,
        action: action || '',
        status,
      })),
    });
  }
  return {
    id: record.id,
    topic: record.metadata.topic || 'New Chat',
    createdAt: record.createdAt,
    activeBranch: record.activeBranch,
    entries,
    branches: Object.values(record.branches).map((branch) => ({
      id: branch.id,
      tipId: parents.get(branch.tipId) ?? null,
    })),
  };
}

function restoreSession(session, sourceId, projectId) {
  const remap = (value) =>
    value.replaceAll(`/library/media/${sourceId}/`, `/library/media/${projectId}/`);
  const entryIds = new Map(session.entries.map((entry) => [entry.id, crypto.randomUUID()]));
  const branchIds = new Map(session.branches.map((branch) => [branch.id, crypto.randomUUID()]));
  const entries = session.entries.map((entry) => {
    const content = remap(entry.content),
      timestamp = Date.parse(entry.timestamp);
    // Archived activity is display-only. No tool calls, receipts, run IDs or approvals are restored.
    const history = entry.tools.length
      ? '\n[导入的历史工具记录，非执行授权]\n' +
        entry.tools.map((tool) => `${tool.name} ${tool.action}: ${tool.status}`).join('\n')
      : '';
    const message =
      entry.role === 'user'
        ? { role: 'user', content: content + history, timestamp }
        : {
            ...assistantMessage(
              { id: 'archive', provider: 'harness' },
              [{ type: 'text', text: content + history }],
              undefined,
              entry.stopped ? 'aborted' : 'stop',
            ),
            timestamp,
          };
    return {
      id: entryIds.get(entry.id),
      parentId: entryIds.get(entry.parentId) ?? null,
      kind: 'message',
      timestamp,
      message,
      displayContent: content,
      displayMedia: entry.media.map((media) => ({ type: media.type, url: remap(media.url) })),
      archivedTools: entry.tools.map((tool) => ({
        id: crypto.randomUUID(),
        name: tool.name,
        action: tool.action,
        status: ['settled', 'failed'].includes(tool.status) ? tool.status : 'interrupted',
        cards: [],
      })),
    };
  });
  const record = {
    version: 2,
    id: crypto.randomUUID(),
    projectId,
    revision: 0,
    createdAt: session.createdAt,
    entries,
    activeBranch: branchIds.get(session.activeBranch),
    branches: Object.fromEntries(
      session.branches.map((branch) => [
        branchIds.get(branch.id),
        {
          id: branchIds.get(branch.id),
          tipId: entryIds.get(branch.tipId) ?? null,
          createdAt: session.createdAt,
        },
      ]),
    ),
    runs: {},
    receipts: {},
    metadata: {
      topic: session.topic,
      skillProjectId: projectId,
      selectedSkill: null,
    },
  };
  record.metadata.messageCount = sessionView(record).transcript.length;
  return record;
}

/** @returns {import('../../../contracts/agentArchive.js').AgentArchiveService} */
export function createAgentArchiveService({ sessions, workspaces }) {
  return {
    async exportProject(projectId) {
      const records = [];
      for (const item of await sessions.list(projectId)) {
        const record = await sessions.get(item.id);
        if (record?.projectId === projectId) records.push(exportSession(record));
      }
      const workspace = await workspaces.read(projectId);
      const active = workspace.value.apiSessionId;
      return validateAgentArchive(
        {
          format: AGENT_ARCHIVE_FORMAT,
          version: 1,
          projectId,
          activeSessionId: records.some((record) => record.id === active)
            ? active
            : (records[0]?.id ?? null),
          sessions: records,
        },
        projectId,
      );
    },
    async importProject(archive, projectId) {
      validateAgentArchive(archive, archive.projectId);
      const previousWorkspace = await workspaces.read(projectId),
        created = [];
      let writtenWorkspace;
      const rollback = async () => {
        try {
          if (writtenWorkspace)
            await workspaces.write(projectId, writtenWorkspace.revision, previousWorkspace.value);
        } finally {
          for (const id of created) await sessions.remove(id);
        }
      };
      try {
        let activeId;
        for (const session of archive.sessions) {
          const record = restoreSession(session, archive.projectId, projectId);
          await sessions.commit(record, 0);
          created.push(record.id);
          if (session.id === archive.activeSessionId) activeId = record.id;
        }
        if (created.length)
          writtenWorkspace = await workspaces.write(projectId, previousWorkspace.revision, {
            prompt: '',
            modelId: '',
            apiSessionId: activeId || created[0],
            excludedNodes: [],
            generationApproval: 'confirm',
            thinkingEnabled: null,
            thinkingEffort: '',
          });
        return rollback;
      } catch (error) {
        await rollback();
        throw error;
      }
    },
  };
}
