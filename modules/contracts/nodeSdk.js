/** Stable, platform-free node package contract. */
import { NODE_CAPABILITIES, validateNodeSchema } from './nodeExecution.js';
export const NODE_SDK_VERSION = '2.0.0';
export const NODE_MEDIA_TYPES = Object.freeze(['text', 'image', 'video', 'audio', 'json', 'any']);
export const NODE_CATEGORIES = Object.freeze(['generation', 'asset', 'tool', 'workflow', 'utility']);
export const NODE_RENDERERS = Object.freeze(['native', 'generic', 'iframe', 'missing']);
export const NODE_AGENT_SIDE_EFFECTS = Object.freeze(['none', 'read', 'write', 'network']);

const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
const clone = value => JSON.parse(JSON.stringify(value));
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/i.test(value);
const validVersion = value => typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
const boundedText = (value, maximum) => typeof value === 'string' && value.length <= maximum;

function validatePort(port, path) {
  if (!isRecord(port) || !validId(port.id)) throw new TypeError(`${path}.id must be a stable identifier`);
  if (!Array.isArray(port.media) || !port.media.length || port.media.some(type => !NODE_MEDIA_TYPES.includes(type)))
    throw new TypeError(`${path}.media contains an unsupported media type`);
  if (port.required !== undefined && typeof port.required !== 'boolean') throw new TypeError(`${path}.required must be boolean`);
  if (port.multiple !== undefined && typeof port.multiple !== 'boolean') throw new TypeError(`${path}.multiple must be boolean`);
  if (port.maximum !== undefined && (!Number.isInteger(port.maximum) || port.maximum < 1)) throw new TypeError(`${path}.maximum must be positive`);
  if (port.schema) validateNodeSchema(port.schema);
  return { id: port.id, media: [...new Set(port.media)], ...(port.schema ? { schema: clone(port.schema) } : {}), ...(port.required === undefined ? {} : { required: port.required }), ...(port.multiple === undefined ? {} : { multiple: port.multiple }), ...(port.maximum === undefined ? {} : { maximum: port.maximum }) };
}

export function validateNodeDefinition(value, path = 'node') {
  if (!isRecord(value) || !validId(value.type)) throw new TypeError(`${path}.type must be a stable identifier`);
  if (!validVersion(value.version)) throw new TypeError(`${path}.version must be semver`);
  if (!NODE_CATEGORIES.includes(value.category)) throw new TypeError(`${path}.category is invalid`);
  if (!Array.isArray(value.inputs) || !Array.isArray(value.outputs)) throw new TypeError(`${path}.inputs and outputs are required`);
  const inputs = value.inputs.map((port, index) => validatePort(port, `${path}.inputs[${index}]`));
  const outputs = value.outputs.map((port, index) => validatePort(port, `${path}.outputs[${index}]`));
  if (new Set(inputs.map(port => port.id)).size !== inputs.length || new Set(outputs.map(port => port.id)).size !== outputs.length)
    throw new TypeError(`${path} port ids must be unique on each side`);
  const parameters = value.parameters === undefined ? undefined : clone(value.parameters);
  if (parameters !== undefined) validateNodeSchema(parameters);
  const render = value.render === undefined ? { kind: 'generic' } : value.render;
  if (!isRecord(render) || !NODE_RENDERERS.includes(render.kind)) throw new TypeError(`${path}.render.kind is invalid`);
  if (render.kind === 'iframe' && (typeof render.entry !== 'string' || !/^[a-z0-9_./-]+\.html$/i.test(render.entry))) throw new TypeError(`${path}.render.entry must be a package HTML file`);
  const executor = value.executor === undefined ? undefined : clone(value.executor);
  if (executor !== undefined && (!isRecord(executor) || !validId(executor.method))) throw new TypeError(`${path}.executor.method is required`);
  if (executor?.transport !== undefined && executor.transport !== 'rpc') throw new TypeError(`${path}.executor.transport must be rpc`);
  if (executor?.timeoutMs !== undefined && (!Number.isInteger(executor.timeoutMs) || executor.timeoutMs < 1000 || executor.timeoutMs > 1800000)) throw new TypeError(`${path}.executor.timeoutMs must be 1000–1800000`);
  const agent = value.agent === undefined ? undefined : value.agent;
  if (value.capabilities !== undefined && (!Array.isArray(value.capabilities) || value.capabilities.some(name => !NODE_CAPABILITIES.includes(name)))) throw new TypeError(`${path}.capabilities is invalid`);
  for (const migration of value.migrations || []) {
    if (!validVersion(migration.from) || !validVersion(migration.to) || migration.from === migration.to) throw new TypeError(`${path}.migrations must advance an explicit version`);
    for (const map of [migration.renameParameters, migration.renameInputs, migration.renameOutputs]) {
      if (map && (!isRecord(map) || Object.entries(map).some(([key, target]) => !validId(key) || !validId(target) || [key, target].some(id => ['__proto__', 'constructor', 'prototype'].includes(id))))) throw new TypeError('Invalid migration mapping');
    }
  }
  if (agent !== undefined) {
    if (!isRecord(agent) || typeof agent.exposed !== 'boolean') throw new TypeError(`${path}.agent.exposed must be boolean`);
    if (agent.name !== undefined && !boundedText(agent.name, 200)) throw new TypeError(`${path}.agent.name is invalid`);
    if (agent.description !== undefined && !boundedText(agent.description, 1000)) throw new TypeError(`${path}.agent.description is invalid`);
    if (agent.requiresConfirmation !== undefined && typeof agent.requiresConfirmation !== 'boolean') throw new TypeError(`${path}.agent.requiresConfirmation must be boolean`);
    if (agent.sideEffect !== undefined && !NODE_AGENT_SIDE_EFFECTS.includes(agent.sideEffect)) throw new TypeError(`${path}.agent.sideEffect is invalid`);
  }
  return Object.freeze({
    type: value.type,
    ...(value.capabilities === undefined ? {} : { capabilities: [...value.capabilities] }),
    version: value.version,
    category: value.category,
    title: typeof value.title === 'string' ? value.title : value.type,
    description: typeof value.description === 'string' ? value.description : '',
    inputs, outputs, ...(parameters === undefined ? {} : { parameters }),
    render: { ...render }, ...(executor === undefined ? {} : { executor }), ...(agent === undefined ? {} : { agent: clone(agent) }),
    initialStatus: typeof value.initialStatus === 'string' ? value.initialStatus : 'idle',
    migrations: Array.isArray(value.migrations) ? clone(value.migrations) : [],
  });
}

export function validateNodePackageManifest(value) {
  if (!isRecord(value) || !validId(value.id)) throw new TypeError('node package id must be a stable identifier');
  if (!validVersion(value.version)) throw new TypeError('node package version must be semver');
  if (value.apiVersion !== undefined && typeof value.apiVersion !== 'string') throw new TypeError('node package apiVersion must be a range');
  if (!Array.isArray(value.nodes) || !value.nodes.length) throw new TypeError('node package nodes are required');
  const nodes = value.nodes.map((node, index) => validateNodeDefinition(node, `nodes[${index}]`));
  if (new Set(nodes.map(node => node.type)).size !== nodes.length) throw new TypeError('node package contains duplicate node types');
  const capabilities = value.capabilities || [];
  if (!Array.isArray(capabilities) || capabilities.some(name => !NODE_CAPABILITIES.includes(name))) throw new TypeError('node package declares an unsupported capability');
  if (nodes.some(node => node.capabilities?.some(name => !capabilities.includes(name)))) throw new TypeError('node capability is not declared by the package');
  return Object.freeze({
    id: value.id,
    version: value.version,
    apiVersion: value.apiVersion || `^${NODE_SDK_VERSION}`,
    title: typeof value.title === 'string' ? value.title : value.id,
    ...(typeof value.entry === 'string' ? { entry: value.entry } : {}),
    nodes,
    capabilities: [...new Set(capabilities)],
  });
}

export function createMissingNodeDefinition(type, version = '0.0.0', owner = 'missing') {
  return Object.freeze({
    type: validId(type) ? type : 'missing.node', version: validVersion(version) ? version : '0.0.0',
    category: 'utility', title: `Missing node: ${type}`, description: `Node provided by ${owner} is unavailable`,
    inputs: [{ id: 'dynamic-input', media: ['any'], multiple: true }],
    outputs: [{ id: 'dynamic-output', media: ['any'], multiple: true }],
    render: { kind: 'missing' }, initialStatus: 'error', missing: true, owner,
  });
}

export function cloneNodeDefinition(definition) {
  return definition ? clone(definition) : undefined;
}
