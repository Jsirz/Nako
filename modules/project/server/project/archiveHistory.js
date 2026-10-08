import path from 'node:path';
import { validateAgentArchive, agentArchiveError } from '../../../contracts/agentArchive.js';

const MAX_HISTORY_BYTES = 32 * 1024 * 1024;
export async function writeAgentHistories(files, directory, projectIds, service) {
  if (!service) return [];
  const projects = [];
  for (const id of projectIds) projects.push(await service.exportProject(id));
  const json = JSON.stringify({ projects });
  if (Buffer.byteLength(json) > MAX_HISTORY_BYTES)
    throw agentArchiveError('聊天记录超过 32 MB，无法打包');
  await files.writeText(path.join(directory, 'agent.json'), json);
  return ['agent.json'];
}

export async function readAgentHistories(files, directory, projectIds, service) {
  const file = path.join(directory, 'agent.json');
  let size;
  try {
    size = await files.size(file);
  } catch (error) {
    if (error.code === 'ENOENT') return new Map();
    throw error;
  }
  if (size > MAX_HISTORY_BYTES) throw agentArchiveError('聊天记录超过 32 MB，无法导入');
  let data;
  try {
    data = JSON.parse(await files.readText(file));
  } catch {
    throw agentArchiveError('聊天记录 JSON 已损坏');
  }
  if (!Array.isArray(data?.projects) || data.projects.length > projectIds.length)
    throw agentArchiveError('聊天记录项目清单无效');
  const histories = new Map();
  for (const archive of data.projects) {
    if (!projectIds.includes(archive?.projectId) || histories.has(archive.projectId))
      throw agentArchiveError('聊天记录包含重复或不属于备份的项目');
    validateAgentArchive(archive, archive.projectId);
    if (archive.sessions.length && !service)
      throw agentArchiveError('备份包含聊天记录，请启用 Agent 插件后导入');
    histories.set(archive.projectId, archive);
  }
  return histories;
}
