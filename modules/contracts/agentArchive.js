/** Portable display history. Contains no model SDK objects, credentials or execution grants. */
import { ERRORS, PluginError } from './errors.js';
export const AGENT_ARCHIVE_FORMAT = 'nako-agent-history';
export const agentArchiveError = (message) =>
  new PluginError(ERRORS.invalidProjectArchive, message, {
    status: 400,
    context: { moduleId: 'contracts', protocol: 'agentArchive', operation: 'validate' },
  });
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const id = (value) => typeof value === 'string' && /^[\w-]{1,128}$/.test(value);
const text = (value, max = 2_000_000) => typeof value === 'string' && value.length <= max;
const date = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function validateAgentArchive(archive, projectId) {
  const invalid = () => {
    throw agentArchiveError('聊天记录格式无效或超出限制');
  };
  if (
    !object(archive) ||
    archive.format !== AGENT_ARCHIVE_FORMAT ||
    archive.version !== 1 ||
    archive.projectId !== projectId ||
    !Array.isArray(archive.sessions) ||
    archive.sessions.length > 1000
  )
    invalid();
  const sessions = new Set();
  let count = 0;
  for (const session of archive.sessions) {
    if (
      !object(session) ||
      !id(session.id) ||
      sessions.has(session.id) ||
      !text(session.topic, 2000) ||
      !date(session.createdAt) ||
      !Array.isArray(session.entries) ||
      !Array.isArray(session.branches) ||
      !session.branches.length ||
      session.branches.length > 1000
    )
      invalid();
    sessions.add(session.id);
    const entries = new Set(),
      branches = new Set();
    for (const entry of session.entries) {
      if (
        ++count > 100_000 ||
        !object(entry) ||
        !id(entry.id) ||
        entries.has(entry.id) ||
        (entry.parentId !== null && !entries.has(entry.parentId)) ||
        !['user', 'assistant'].includes(entry.role) ||
        !text(entry.content) ||
        !date(entry.timestamp) ||
        typeof entry.stopped !== 'boolean' ||
        !Array.isArray(entry.media) ||
        entry.media.length > 100 ||
        !Array.isArray(entry.tools) ||
        entry.tools.length > 100
      )
        invalid();
      entries.add(entry.id);
      for (const media of entry.media) {
        if (
          !object(media) ||
          !['image', 'video', 'audio'].includes(media.type) ||
          !text(media.url) ||
          !/^(?:\/library\/|https?:\/\/|data:(?:image|video|audio)\/)/i.test(media.url)
        )
          invalid();
      }
      for (const tool of entry.tools) {
        if (
          !object(tool) ||
          !text(tool.name, 200) ||
          !text(tool.action, 200) ||
          !text(tool.status, 100)
        )
          invalid();
      }
    }
    for (const branch of session.branches) {
      if (
        !object(branch) ||
        !id(branch.id) ||
        branches.has(branch.id) ||
        (branch.tipId !== null && !entries.has(branch.tipId))
      )
        invalid();
      branches.add(branch.id);
    }
    if (!branches.has(session.activeBranch)) invalid();
  }
  if (archive.activeSessionId !== null && !sessions.has(archive.activeSessionId)) invalid();
  return archive;
}
