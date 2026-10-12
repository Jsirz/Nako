import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { browserServices } from '../../../kernel/browser';
import type { AgentSkill, AgentSkillFile, AgentSkillDocument, AgentSkillEditRequest } from '../../../contracts/skillCatalog.js';
import { SKILL_CATALOG_CHANGED } from '../../../contracts/skillCatalog.js';
import { AgentSkillError } from '../../../contracts/agentSkillError.js';
export type { AgentSkill } from '../../../contracts/skillCatalog.js';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new AgentOperationError(`无法读取 ${file.name}`, { operation: 'read-skill-file' }));
    reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
    reader.readAsDataURL(file);
  });
}

async function uploadFiles(files: readonly File[]): Promise<AgentSkillFile[]> {
  return Promise.all(files.map(async (file) => ({
    path: String((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name),
    contentBase64: await fileToBase64(file),
  })));
}

export function extractSkillMentions(text: string) {
  return [...String(text || '').matchAll(/(?:^|\s)\/([a-z0-9][a-z0-9-]{0,63})(?=\s|$)/gi)]
    .map((match) => match[1].toLowerCase());
}

export function createAgentSkillClient(fetcher: typeof fetch = globalThis.fetch) {
  async function mutate(url: string, method: string, value?: unknown) {
    const response = await fetcher(url, { method, headers: { 'Content-Type': 'application/json' },
      body: value === undefined ? undefined : JSON.stringify(value) });
    const body = await response.json();
    if (!response.ok) throw new AgentSkillError(body.error || '更新技能失败', response.status, body.code);
    window.dispatchEvent(new Event(SKILL_CATALOG_CHANGED));
    return body;
  }
  return {
    async list(): Promise<AgentSkill[]> {
      const response = await fetcher('/api/agent-skills');
      const body = await response.json() as { skills?: AgentSkill[]; error?: string };
      if (!response.ok) throw new AgentOperationError(body.error || '读取技能社区失败', { operation: 'list-skills', status: response.status });
      return body.skills || [];
    },
    async importFolders(files: readonly File[], category?: string): Promise<AgentSkill[]> {
      const body = await mutate('/api/agent-skills/import', 'POST', { files: await uploadFiles(files), category });
      if (!body.skills?.length) throw new AgentSkillError(body.error || '导入技能失败');
      return body.skills;
    },
    async remove(slug: string): Promise<void> { await mutate(`/api/agent-skills/${encodeURIComponent(slug)}`, 'DELETE'); },
    async readDocument(slug: string): Promise<AgentSkillDocument> {
      const response = await fetcher(`/api/agent-skills/${encodeURIComponent(slug)}/edit`);
      const body = await response.json();
      if (!response.ok) throw new AgentSkillError(body.error || '读取技能失败', response.status, body.code);
      return body;
    },
    async update(slug: string, request: Omit<AgentSkillEditRequest, 'files'>, files: readonly File[]): Promise<AgentSkill> {
      return (await mutate(`/api/agent-skills/${encodeURIComponent(slug)}`, 'PUT', { ...request, files: await uploadFiles(files) })).skill;
    },
    async updateCategory(slug: string, category: string): Promise<AgentSkill> {
      return (await mutate(`/api/agent-skills/${encodeURIComponent(slug)}`, 'PATCH', { category })).skill;
    },
    mentions: extractSkillMentions,
  };
}

export type AgentSkillClient = ReturnType<typeof createAgentSkillClient>;

declare global {
  interface Window {
    __NAKO_SKILLS__?: AgentSkillClient;
  }
}

export function installAgentSkillClient(client = createAgentSkillClient()) {
  browserServices.__NAKO_SKILLS__ = client;
  return client;
}
