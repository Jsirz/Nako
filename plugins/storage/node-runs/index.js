import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { NODE_ERROR, nodeError } from '../../../modules/contracts/nodeExecution.js';

export function createNodeRunStore({ privateDirectory }) {
  const root = path.resolve(privateDirectory, 'node-runs');
  const file = id => {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw nodeError(NODE_ERROR.INVALID, '运行 ID 无效');
    return path.join(root, id + '.json');
  };
  return {
    createId: randomUUID,
    async initialize() { await fs.mkdir(root, { recursive: true }); },
    async get(id) { try { return JSON.parse(await fs.readFile(file(id), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } },
    async list() {
      const names = await fs.readdir(root);
      const records = [];
      for (const name of names.filter(name => /^[a-f0-9-]{36}\.json$/.test(name))) records.push(await this.get(name.slice(0, -5)));
      return records;
    },
    async save(record) {
      const target = file(record.id), temp = target + '.' + randomUUID() + '.tmp';
      await fs.writeFile(temp, JSON.stringify(record), { mode: 0o600 });
      await fs.rename(temp, target);
    },
    async value(scope, pluginId, key, value) {
      if (typeof key !== 'string' || key.length > 200) throw nodeError(NODE_ERROR.INVALID, '存储键无效');
      const name = createHash('sha256').update(JSON.stringify([scope, pluginId, key])).digest('hex');
      const target = path.join(root, 'value-' + name + '.json');
      if (value === undefined) { try { return JSON.parse(await fs.readFile(target, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
      const data = JSON.stringify(value);
      if (Buffer.byteLength(data) > 64 * 1024) throw nodeError(NODE_ERROR.INVALID, '节点存储值不得超过 64 KB');
      const temp = target + '.' + randomUUID() + '.tmp';
      await fs.writeFile(temp, data, { mode: 0o600 }); await fs.rename(temp, target); return null;
    },
  };
}

export function createNodeRunStoragePlugin(options) {
  return {
    manifest: { id: 'storage.node-runs', version: '1.0.0', apiVersion: '^1.0.0', type: 'storage',
      services: { provides: ['nodes.store'] }, reloadRequired: true },
    async activate(context) {
      const store = createNodeRunStore(options); await store.initialize();
      context.services.register('nodes.store', store);
    },
  };
}
