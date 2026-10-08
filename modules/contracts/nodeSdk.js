/** Stable, platform-free node package contract. */
import { NODE_CAPABILITIES, validateNodeSchema } from './nodeExecution.js';
import { ERRORS, PluginError } from './errors.js';
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
const invalid = (message, path = 'package') => new PluginError(ERRORS.nodePackage, message, {
  status: 400, context: { moduleId: 'contracts', protocol: 'nodeSdk', operation: 'validate', path },
});

function validatePort(port, path) {
  if (!isRecord(port) || !validId(port.id)) throw invalid(`${path}.id must be a stable identifier`, path);
  if (!Array.isArray(port.media) || !port.media.length || port.media.some(type => !NODE_MEDIA_TYPES.includes(type)))
    throw invalid(`${path}.media contains an unsupported media type`, path);
  if (port.required !== undefined && typeof port.required !== 'boolean') throw invalid(`${path}.required must be boolean`, path);
  if (port.multiple !== undefined && typeof port.multiple !== 'boolean') throw invalid(`${path}.multiple must be boolean`, path);
  if (port.maximum !== undefined && (!Number.isInteger(port.maximum) || port.maximum < 1)) throw invalid(`${path}.maximum must be positive`, path);
  if (port.schema) validateNodeSchema(port.schema);
  return { id: port.id, media: [...new Set(port.media)], ...(port.schema ? { schema: clone(port.schema) } : {}), ...(port.required === undefined ? {} : { required: port.required }), ...(port.multiple === undefined ? {} : { multiple: port.multiple }), ...(port.maximum === undefined ? {} : { maximum: port.maximum }) };
}

export function validateNodeDefinition(value, path = 'node') {
  if (!isRecord(value) || !validId(value.type)) throw invalid(`${path}.type must be a stable identifier`, path);
  if (!validVersion(value.version)) throw invalid(`${path}.version must be semver`, path);
  if (!NODE_CATEGORIES.includes(value.category)) throw invalid(`${path}.category is invalid`, path);
  if (!Array.isArray(value.inputs) || !Array.isArray(value.outputs)) throw invalid(`${path}.inputs and outputs are required`, path);
  const inputs = value.inputs.map((port, index) => validatePort(port, `${path}.inputs[${index}]`));
  const outputs = value.outputs.map((port, index) => validatePort(port, `${path}.outputs[${index}]`));
  if (new Set(inputs.map(port => port.id)).size !== inputs.length || new Set(outputs.map(port => port.id)).size !== outputs.length)
    throw invalid(`${path} port ids must be unique on each side`, path);
  const parameters = value.parameters === undefined ? undefined : clone(value.parameters);
  if (parameters !== undefined) validateNodeSchema(parameters);
  const render = value.render === undefined ? { kind: 'generic' } : value.render;
  if (!isRecord(render) || !NODE_RENDERERS.includes(render.kind)) throw invalid(`${path}.render.kind is invalid`, path);
  if (render.kind === 'iframe' && (typeof render.entry !== 'string' || !/^[a-z0-9_./-]+\.html$/i.test(render.entry))) throw invalid(`${path}.render.entry must be a package HTML file`, path);
  const executor = value.executor === undefined ? undefined : clone(value.executor);
  if (executor !== undefined && (!isRecord(executor) || !validId(executor.method))) throw invalid(`${path}.executor.method is required`, path);
  if (executor?.transport !== undefined && executor.transport !== 'rpc') throw invalid(`${path}.executor.transport must be rpc`, path);
  if (executor?.timeoutMs !== undefined && (!Number.isInteger(executor.timeoutMs) || executor.timeoutMs < 1000 || executor.timeoutMs > 1800000)) throw invalid(`${path}.executor.timeoutMs must be 1000–1800000`, path);
  const agent = value.agent === undefined ? undefined : value.agent;
  if (value.capabilities !== undefined && (!Array.isArray(value.capabilities) || value.capabilities.some(name => !NODE_CAPABILITIES.includes(name)))) throw invalid(`${path}.capabilities is invalid`, path);
  for (const migration of value.migrations || []) {
    if (!validVersion(migration.from) || !validVersion(migration.to) || migration.from === migration.to) throw invalid(`${path}.migrations must advance an explicit version`, path);
    for (const map of [migration.renameParameters, migration.renameInputs, migration.renameOutputs]) {
      if (map && (!isRecord(map) || Object.entries(map).some(([key, target]) => !validId(key) || !validId(target) || [key, target].some(id => ['__proto__', 'constructor', 'prototype'].includes(id))))) throw invalid('Invalid migration mapping', path);
    }
  }
  if (agent !== undefined) {
    if (!isRecord(agent) || typeof agent.exposed !== 'boolean') throw invalid(`${path}.agent.exposed must be boolean`, path);
    if (agent.name !== undefined && !boundedText(agent.name, 200)) throw invalid(`${path}.agent.name is invalid`, path);
    if (agent.description !== undefined && !boundedText(agent.description, 1000)) throw invalid(`${path}.agent.description is invalid`, path);
    if (agent.requiresConfirmation !== undefined && typeof agent.requiresConfirmation !== 'boolean') throw invalid(`${path}.agent.requiresConfirmation must be boolean`, path);
    if (agent.sideEffect !== undefined && !NODE_AGENT_SIDE_EFFECTS.includes(agent.sideEffect)) throw invalid(`${path}.agent.sideEffect is invalid`, path);
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
  if (!isRecord(value) || !validId(value.id)) throw invalid('node package id must be a stable identifier');
  if (!validVersion(value.version)) throw invalid('node package version must be semver');
  if (value.apiVersion !== undefined && typeof value.apiVersion !== 'string') throw invalid('node package apiVersion must be a range');
  if (!Array.isArray(value.nodes) || !value.nodes.length) throw invalid('node package nodes are required');
  const nodes = value.nodes.map((node, index) => validateNodeDefinition(node, `nodes[${index}]`));
  if (new Set(nodes.map(node => node.type)).size !== nodes.length) throw invalid('node package contains duplicate node types');
  const capabilities = value.capabilities || [];
  if (!Array.isArray(capabilities) || capabilities.some(name => !NODE_CAPABILITIES.includes(name))) throw invalid('node package declares an unsupported capability');
  if (nodes.some(node => node.capabilities?.some(name => !capabilities.includes(name)))) throw invalid('node capability is not declared by the package');
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
