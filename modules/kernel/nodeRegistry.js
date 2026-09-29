import { satisfiesVersion } from './index.js';
import { migrateNodeRecord } from '../contracts/nodeMigrations.js';
import {
  NODE_SDK_VERSION,
  cloneNodeDefinition,
  createMissingNodeDefinition,
  validateNodePackageManifest,
} from '../contracts/nodeSdk.js';

const clone = value => JSON.parse(JSON.stringify(value));
const keyFor = (owner, type) => `${owner}:${type}`;
const endpoint = value => value && typeof value === 'object' && typeof value.nodeId === 'string' && typeof value.portId === 'string';

export class NodeRegistry {
  #packages = new Map();
  #nodes = new Map();
  #missing = new Map();
  #events;

  constructor({ sdkVersion = NODE_SDK_VERSION, onChange = () => {} } = {}) {
    this.sdkVersion = sdkVersion;
    this.#events = onChange;
  }

  register(nodePackage, owner = nodePackage?.manifest?.id || 'host') {
    const manifest = validateNodePackageManifest(nodePackage?.manifest || nodePackage);
    if (!satisfiesVersion(this.sdkVersion, manifest.apiVersion)) throw new TypeError(`Incompatible node SDK: ${manifest.id}`);
    if (this.#packages.has(manifest.id)) throw new TypeError(`Node package already registered: ${manifest.id}`);
    const record = { manifest, owner, migrate: typeof nodePackage?.migrate === 'function' ? nodePackage.migrate : undefined, executors: nodePackage?.executors || {} };
    this.#packages.set(manifest.id, record);
    for (const definition of manifest.nodes) {
      const key = keyFor(manifest.id, definition.type);
      if (this.#nodes.has(key)) throw new TypeError(`Duplicate node type: ${key}`);
      this.#nodes.set(key, { ...record, definition: { ...definition, capabilities: definition.capabilities ?? manifest.capabilities, owner: manifest.id } });
    }
    this.#events({ kind: 'registered', packageId: manifest.id, nodeTypes: manifest.nodes.map(node => node.type) });
    return () => this.unregister(manifest.id);
  }

  unregister(packageId) {
    const record = this.#packages.get(packageId);
    if (!record) return false;
    this.#packages.delete(packageId);
    for (const key of [...this.#nodes.keys()]) if (key.startsWith(`${packageId}:`)) this.#nodes.delete(key);
    this.#events({ kind: 'unregistered', packageId });
    return true;
  }

  unregisterOwner(owner) {
    const packageIds = [...this.#packages.values()]
      .filter(record => record.owner === owner)
      .map(record => record.manifest.id);
    for (const packageId of packageIds) this.unregister(packageId);
    return packageIds.length;
  }

  listPackages() { return [...this.#packages.values()].map(({ manifest, owner }) => ({ ...clone(manifest), owner })); }

  listDefinitions() {
    return [...this.#nodes.values()].map(record => cloneNodeDefinition(record.definition));
  }

  getDefinition(type, owner) {
    const record = this.#resolve(type, owner);
    return record ? cloneNodeDefinition(record.definition) : undefined;
  }

  getExecutor(type, owner) {
    const record = this.#resolve(type, owner);
    if (!record?.definition.executor) return undefined;
    const handler = record.executors[record.definition.executor.method];
    return typeof handler === 'function' ? handler : undefined;
  }

  resolveNode(type, owner) {
    const record = this.#resolve(type, owner);
    return record ? { packageId: record.manifest.id, owner: record.owner, definition: cloneNodeDefinition(record.definition) } : undefined;
  }

  createMissing(type, version, owner = 'unknown') {
    const key = `${owner}:${type}:${version || '0.0.0'}`;
    if (!this.#missing.has(key)) this.#missing.set(key, createMissingNodeDefinition(type, version, owner));
    return cloneNodeDefinition(this.#missing.get(key));
  }

  migrate(node) {
    if (!node || typeof node !== 'object') return { node, migrated: false, missing: true };
    const record = this.#resolve(String(node.type || ''), String(node.pluginId || node.owner || ''));
    if (!record) return { node: { ...node, missing: true, nodeVersion: node.nodeVersion || '0.0.0' }, migrated: false, missing: true };
    const from = typeof node.nodeVersion === 'string' ? node.nodeVersion : record.definition.version;
    if (from === record.definition.version) return { node: { ...node, pluginId: record.manifest.id, nodeVersion: from }, migrated: false, missing: false };
    if (!record.migrate) {
      try { return { ...migrateNodeRecord(node, record.definition), migrated: true, missing: false }; }
      catch { return { node: { ...node, pluginId: record.manifest.id, nodeVersion: from }, migrated: false, missing: false, migrationRequired: true }; }
    }
    const migrated = record.migrate(clone(node), from, record.definition.version);
    return { node: { ...migrated, pluginId: record.manifest.id, nodeVersion: record.definition.version }, migrated: true, missing: false };
  }

  validateNode(node) {
    const errors = [];
    if (!node || typeof node !== 'object') return ['node must be an object'];
    if (typeof node.id !== 'string' || !node.id) errors.push('node id is required');
    if (typeof node.type !== 'string' || !node.type) errors.push('node type is required');
    const definition = this.getDefinition(node.type, node.pluginId || node.owner);
    if (!definition) errors.push(`missing node definition: ${node.type}`);
    if (node.x !== undefined && !Number.isFinite(node.x)) errors.push('node x must be finite');
    if (node.y !== undefined && !Number.isFinite(node.y)) errors.push('node y must be finite');
    if (node.inputLinks !== undefined && !Array.isArray(node.inputLinks)) errors.push('node inputLinks must be an array');
    return errors;
  }

  validateEdge(edge, nodes) {
    if (!edge || !endpoint(edge.source) || !endpoint(edge.target)) return { valid: false, code: 'INVALID_EDGE' };
    const source = nodes.find(node => node.id === edge.source.nodeId);
    const target = nodes.find(node => node.id === edge.target.nodeId);
    if (!source || !target) return { valid: false, code: 'NODE_NOT_FOUND' };
    const sourceDefinition = this.getDefinition(source.type, source.pluginId || source.owner);
    const targetDefinition = this.getDefinition(target.type, target.pluginId || target.owner);
    const sourcePort = sourceDefinition?.outputs.find(port => port.id === edge.source.portId);
    const targetPort = targetDefinition?.inputs.find(port => port.id === edge.target.portId);
    if (!sourcePort || !targetPort) return { valid: false, code: 'PORT_NOT_FOUND' };
    const compatible = targetPort.media.includes('any') || sourcePort.media.includes('any') || sourcePort.media.some(media => targetPort.media.includes(media));
    return compatible ? { valid: true } : { valid: false, code: 'MEDIA_MISMATCH' };
  }

  diagnostics() { return { packageCount: this.#packages.size, definitionCount: this.#nodes.size, missingCount: this.#missing.size }; }

  #resolve(type, owner) {
    if (owner) return this.#nodes.get(keyFor(owner, type));
    const matches = [...this.#nodes.values()].filter(record => record.definition.type === type);
    return matches.length === 1 ? matches[0] : matches.find(record => record.manifest.id === owner);
  }
}

export function createNodeRegistry(options) { return new NodeRegistry(options); }
