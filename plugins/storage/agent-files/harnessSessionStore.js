import crypto from 'node:crypto';
import { mkdir, readFile, readdir, rename, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { isAgentSession } from '../../../modules/contracts/agentSession.js';
const failure = (message, code, status = 409) =>
  Object.assign(new Error(message), { name: 'AgentSessionStoreError', code, status });
const hash = (id) => crypto.createHash('sha256').update(id).digest('hex');
/** Atomic version-2 storage. No pi imports and no version-1 reader. */
export function createHarnessSessionStore({ privateDirectory }) {
  const directory = path.join(privateDirectory, 'agent-harness-v2'),
    queues = new Map();
  const file = (id) => {
    if (!/^[\w-]{1,128}$/.test(id)) throw failure('会话标识无效', 'AGENT_SESSION_INVALID', 400);
    return path.join(directory, hash(id) + '.json');
  };
  async function get(id) {
    try {
      const record = JSON.parse(await readFile(file(id), 'utf8'));
      if (!isAgentSession(record) || record.id !== id)
        throw failure('会话格式无效；原文件已保留', 'AGENT_SESSION_CORRUPT', 500);
      return record;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  function enqueue(id, fn) {
    const task = (queues.get(id) || Promise.resolve()).catch(() => {}).then(fn);
    queues.set(id, task);
    return task.finally(() => {
      if (queues.get(id) === task) queues.delete(id);
    });
  }
  return {
    get,
    commit(record, expectedRevision) {
      return enqueue(record.id, async () => {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
          throw failure('会话版本无效', 'AGENT_SESSION_INVALID', 400);
        const previous = await get(record.id);
        if ((previous?.revision || 0) !== expectedRevision)
          throw failure('会话版本已变化，请刷新后继续', 'AGENT_REVISION_CONFLICT');
        if (previous && previous.projectId !== record.projectId)
          throw failure('不能改变会话所属项目', 'AGENT_PROJECT_MISMATCH');
        const next = {
          ...record,
          version: 2,
          revision: expectedRevision + 1,
          updatedAt: new Date().toISOString(),
        };
        if (!isAgentSession(next)) throw failure('会话记录格式无效', 'AGENT_SESSION_INVALID', 400);
        await mkdir(directory, { recursive: true });
        const target = file(record.id),
          temporary = target + '.' + crypto.randomUUID() + '.tmp';
        try {
          const handle = await open(temporary, 'wx');
          try {
            await handle.writeFile(JSON.stringify(next), 'utf8');
            await handle.sync();
          } finally {
            await handle.close();
          }
          await rename(temporary, target);
        } finally {
          await rm(temporary, { force: true });
        }
        return next;
      });
    },
    async list(projectId) {
      await mkdir(directory, { recursive: true });
      const records = [];
      for (const name of await readdir(directory)) {
        if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
        try {
          const record = JSON.parse(await readFile(path.join(directory, name), 'utf8'));
          if (isAgentSession(record) && (!projectId || record.projectId === projectId))
            records.push({
              id: record.id,
              projectId: record.projectId,
              topic: record.metadata.topic,
              messageCount: record.metadata.messageCount || 0,
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
              revision: record.revision,
              branch: record.activeBranch,
              run: record.lastRunId ? record.runs[record.lastRunId] : null,
            });
        } catch {
          /* Corrupt files are preserved. */
        }
      }
      return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    remove(id) {
      return enqueue(id, async () => {
        if (!(await get(id))) return false;
        const trash = path.join(directory, 'trash');
        await mkdir(trash, { recursive: true });
        await rename(file(id), path.join(trash, hash(id) + '-' + Date.now() + '.json'));
        return true;
      });
    },
  };
}
