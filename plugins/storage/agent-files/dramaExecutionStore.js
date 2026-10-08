import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { DramaExecutionError } from '../../../modules/contracts/dramaExecutionError.js';
import { assertPrivateStorageDirectory, resolvePrivateStorageDirectory } from './privateStoragePaths.js';
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_RECORD_BYTES = 4 * 1024 * 1024;
const COMMIT_RETRY_DELAYS_MS = [10, 25, 50, 100, 200];
const TRANSIENT_COMMIT_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
function id(value) {
  if (typeof value !== 'string' || !SAFE_ID.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value)) {
    throw new DramaExecutionError('制作任务标识无效', 'DRAMA_REFERENCE_INVALID', 400);
  }
  return value;
}


async function commitRecord(temporary, target) {
  for (let attempt = 0; ; attempt += 1) {
    try { await fs.rename(temporary, target); return; }
    catch (error) {
      if (!TRANSIENT_COMMIT_CODES.has(error?.code) || attempt >= COMMIT_RETRY_DELAYS_MS.length) throw error;
      // Windows may briefly deny replacing a record while a reader holds it open.
      // Retry only this immutable local write, never the generation that produced it.
      await delay(COMMIT_RETRY_DELAYS_MS[attempt]);
    }
  }
}


export function createDramaExecutionStore({ libraryDirectory, executionDirectory }) {
  const root = resolvePrivateStorageDirectory({ libraryDirectory, storageDirectory: executionDirectory || path.join(path.dirname(libraryDirectory), 'private', 'agent-drama-executions') });
  async function ensureRoot() {
    const userRoot = path.resolve(path.dirname(libraryDirectory));
    const relative = path.relative(userRoot, root);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new DramaExecutionError('制作存储必须位于当前用户私有目录');
    }
    await fs.mkdir(userRoot, { recursive: true });
    let cursor = userRoot;
    for (const component of relative.split(path.sep)) {
      cursor = path.join(cursor, component);
      await fs.mkdir(cursor).catch((error) => { if (error.code !== 'EEXIST') throw error; });
      const stat = await fs.lstat(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new DramaExecutionError('制作存储不能是链接');
    }
    await assertPrivateStorageDirectory({ libraryDirectory, storageDirectory: root });
    if ((await fs.lstat(root)).isSymbolicLink()) throw new DramaExecutionError('制作存储不能是链接');
  }

  async function read(planId, projectId) {
    await ensureRoot();
    const filename = path.join(root, `${id(planId)}.json`);
    try {
      const stat = await fs.lstat(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_RECORD_BYTES) throw new DramaExecutionError('执行记录类型或大小无效', 'DRAMA_EXECUTION_RECORD_INVALID');
      const data = JSON.parse(await fs.readFile(filename, 'utf8'));
      if (data.schemaVersion !== 1 || data.planId !== planId || data.projectId !== projectId || !Array.isArray(data.attempts)) {
        throw new DramaExecutionError('执行记录与制作任务或项目不匹配', 'DRAMA_EXECUTION_RECORD_INVALID');
      }
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return { schemaVersion: 1, planId, projectId, attempts: [] };
      throw new DramaExecutionError('制作执行记录不可读取；为避免重复付费，已停止提交', 'DRAMA_EXECUTION_RECORD_INVALID');
    }
  }

  async function write(data) {
    const content = JSON.stringify(data);
    if (Buffer.byteLength(content) > MAX_RECORD_BYTES) throw new DramaExecutionError('制作记录超过安全上限');
    const target = path.join(root, `${id(data.planId)}.json`);
    const temp = `${target}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temp, content, { flag: 'wx', mode: 0o600 });
      await commitRecord(temp, target);
    } finally { await fs.rm(temp, { force: true }); }
  }


  return Object.freeze({ root, read, write });
}
