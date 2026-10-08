import { IDENTITY_ERRORS, identityError, identityFailure } from '../../contracts/identityErrors.js';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { writeFileAtomically } from './atomicFile.mjs';

const validId = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function chooseLocalWorkspace({ usersDirectory, choose, forceChoice = false }) {
  let entries;
  try {
    entries = await readdir(usersDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return randomUUID();
    throw identityFailure(error, IDENTITY_ERRORS.workspaceRead, '本机工作区读取失败', 'workspace.choose');
  }
  const ids = entries
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && validId(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (!ids.length) return randomUUID();
  if (ids.length === 1 && !forceChoice) return ids[0];
  const selected = await choose(ids);
  if (selected === 'new') return randomUUID();
  if (!ids.includes(selected)) throw identityError(IDENTITY_ERRORS.workspaceSelection, '尚未选择本机工作区；原项目仍保留。', 'workspace.choose', 409);
  return selected;
}

/** Local workspace selection only. No device proof, account, token or network client. */
export function createLocalWorkspace({ installation, selectWorkspace }) {
  const file = path.join(installation.state, 'workspace.json');
  let userId, ready;
  const save = async (id) => {
    if (!validId(id)) throw identityError(IDENTITY_ERRORS.workspaceInvalid, '工作区标识无效', 'workspace.save', 400);
    await writeFileAtomically(file, JSON.stringify({ version: 1, localUserId: id }));
    userId = id;
  };
  async function initialize() {
    try {
      const record = JSON.parse(await readFile(file, 'utf8'));
      if (!validId(record.localUserId)) throw identityError(IDENTITY_ERRORS.workspaceInvalid, '本机工作区记录损坏', 'workspace.initialize');
      userId = record.localUserId;
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw identityFailure(error, IDENTITY_ERRORS.workspaceRead, '本机工作区记录损坏', 'workspace.initialize');
    }
    await save(installation.devUserId || await selectWorkspace());
  }
  const ensureReady = () =>
    (ready ??= initialize().catch((error) => {
      ready = null;
      throw identityFailure(error, IDENTITY_ERRORS.workspaceRead, '本机工作区读取失败', 'workspace.initialize');
    }));
  const restore = async () => {
    await ensureReady();
    return { state: 'ready', ready: true, message: '本机工作区已就绪。' };
  };
  return {
    restore,
    status: restore,
    userId: () => userId ?? null,
    async selectLocalUser(id) {
      await ensureReady();
      await save(id);
    },
  };
}
