import { WorkspaceError } from '../../../modules/contracts/storageErrors.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import express from 'express';

const empty = () => ({ prompt: '', modelId: '', apiSessionId: '', excludedNodes: [], generationApproval: 'confirm', thinkingEnabled: null, thinkingEffort: '' });
function normalize(value) {
  const result = empty();
  if (value?.generationApproval !== undefined) {
    if (!['confirm', 'direct'].includes(value.generationApproval)) throw new WorkspaceError('生成执行方式无效。');
    result.generationApproval = value.generationApproval;
  }
  if (value?.thinkingEnabled != null) {
    if (typeof value.thinkingEnabled !== 'boolean') throw new WorkspaceError('思考开关无效。');
    result.thinkingEnabled = value.thinkingEnabled;
  }
  if (value?.thinkingEffort !== undefined) {
    if (!['', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'].includes(value.thinkingEffort)) throw new WorkspaceError('思考强度无效。');
    result.thinkingEffort = value.thinkingEffort;
  }
  for (const key of ['prompt', 'modelId', 'apiSessionId']) {
    if (typeof value?.[key] !== 'string' || (key !== 'prompt' && value[key].length > 300)) throw new WorkspaceError('助手草稿内容无效或过长。');
    result[key] = value[key];
  }
  for (const key of ['excludedNodes']) {
    if (!Array.isArray(value[key]) || value[key].some(id => typeof id !== 'string' || !id || id.length > 255)) throw new WorkspaceError('助手引用节点无效。');
    result[key] = [...new Set(value[key])];
  }
  return result;
}
export function createAgentWorkspaceStore(privateDirectory) {
  const root = path.join(privateDirectory, 'agent-workspaces');
  const writes = new Map();
  const fileFor = project => {
    if (typeof project !== 'string' || !project.trim() || project.length > 255) throw new WorkspaceError('项目标识无效。');
    return path.join(root, crypto.createHash('sha256').update(project).digest('hex') + '.json');
  };
  const read = async project => {
    const file = fileFor(project);
    try {
      const result = JSON.parse(await readFile(file, 'utf8'));
      if (result.projectId !== project || !Number.isSafeInteger(result.revision) || result.revision < 0) throw new WorkspaceError('助手草稿记录格式无效。', 500);
      return { projectId: project, revision: result.revision, value: normalize(result.value) };
    } catch (error) {
      if (error.code === 'ENOENT') return { projectId: project, revision: 0, value: empty() };
      throw new WorkspaceError('助手草稿无法读取，原文件已保留。', 500);
    }
  };
  return {
    read,
    async write(project, revision, value) {
      const file = fileFor(project);
      const normalized = normalize(value);
      if (!Number.isSafeInteger(revision) || revision < 0) throw new WorkspaceError('助手草稿版本无效。');
      const previous = writes.get(file) || Promise.resolve();
      const pending = previous.catch(() => {}).then(async () => {
        const current = await read(project);
        if (current.revision !== revision) throw new WorkspaceError('另一窗口已更新助手草稿。请复制当前文字后重新打开项目，避免覆盖。', 409);
        const next = { projectId: project, revision: revision + 1, value: normalized };
        await mkdir(root, { recursive: true });
        const temporary = file + '.' + crypto.randomUUID() + '.tmp';
        await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
        await rename(temporary, file);
        return next;
      });
      writes.set(file, pending);
      try { return await pending; }
      finally { if (writes.get(file) === pending) writes.delete(file); }
    },
  };
}
export function createAgentWorkspaceRouter(store) {
  const router = express.Router();
  const handle = action => async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    try { response.json(await action(request)); }
    catch (error) { response.status(error instanceof WorkspaceError ? error.status : 500).json({ error: error instanceof WorkspaceError ? error.message : '助手草稿保存失败，请保留当前页面后重试。' }); }
  };
  router.get('/', handle(request => store.read(request.query.projectId)));
  router.put('/', handle(request => store.write(request.query.projectId, request.body?.revision, request.body?.value)));
  return router;
}
