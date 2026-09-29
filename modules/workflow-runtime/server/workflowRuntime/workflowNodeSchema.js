export const MODEL_FIELDS = Object.freeze({
  ckpt_name: 'checkpoints',
  unet_name: 'diffusionModels',
  clip_name: 'textEncoders',
  vae_name: 'vaes',
  lora_name: 'loras',
});
import { isPlainObject } from './workflowJson.js';

export function directSchemaInput(nodeDefinition, fieldName) {
  return (
    nodeDefinition?.input?.required?.[fieldName] ||
    nodeDefinition?.input?.optional?.[fieldName] ||
    null
  );
}

export function conditionalSchemaInput(nodeDefinition, fieldName, nodeInputs) {
  for (const [selectorName, selectorValue] of Object.entries(nodeInputs || {})) {
    if (typeof selectorValue !== 'string') continue;
    const selector = directSchemaInput(nodeDefinition, selectorName);
    const entries = selector?.[1]?.formats?.[selectorValue];
    if (!Array.isArray(entries)) continue;
    const entry = entries.find(
      (candidate) => Array.isArray(candidate) && candidate[0] === fieldName,
    );
    if (!entry) continue;
    if (Array.isArray(entry[1])) return [entry[1], isPlainObject(entry[2]) ? entry[2] : {}];
    if (typeof entry[1] === 'string') return [entry[1], isPlainObject(entry[2]) ? entry[2] : {}];
  }
  return null;
}

export function autogrowSchemaInput(nodeDefinition, fieldName) {
  const separator = fieldName.indexOf('.');
  if (separator <= 0) return null;
  const containerName = fieldName.slice(0, separator);
  const childName = fieldName.slice(separator + 1);
  const container = directSchemaInput(nodeDefinition, containerName);
  if (!/^COMFY_AUTOGROW/i.test(String(container?.[0] || ''))) return null;
  const template = container?.[1]?.template;
  const fields = {
    ...(template?.input?.required || {}),
    ...(template?.input?.optional || {}),
  };
  if (fields[childName]) return fields[childName];
  if (Array.isArray(template?.names) && template.names.includes(childName)) {
    return Object.values(fields)[0] || null;
  }
  if (typeof template?.prefix === 'string' && childName.startsWith(template.prefix)) {
    return Object.values(fields)[0] || null;
  }
  return null;
}

export function schemaInput(nodeDefinition, fieldName, nodeInputs = null) {
  return (
    directSchemaInput(nodeDefinition, fieldName) ||
    autogrowSchemaInput(nodeDefinition, fieldName) ||
    conditionalSchemaInput(nodeDefinition, fieldName, nodeInputs) ||
    null
  );
}

export function schemaOptions(specification) {
  if (Array.isArray(specification?.[0])) return specification[0];
  if (
    String(specification?.[0] || '').toUpperCase() === 'COMBO' &&
    Array.isArray(specification?.[1]?.options)
  )
    return specification[1].options;
  return null;
}

export function schemaType(specification, value) {
  const declared = specification?.[0];
  if (Array.isArray(declared)) return 'COMBO';
  if (typeof declared === 'string') {
    const normalized = declared.toUpperCase();
    if (normalized === 'COMBO') return 'COMBO';
    if (normalized.includes(',')) {
      if (typeof value === 'boolean' && normalized.split(',').includes('BOOLEAN')) return 'BOOLEAN';
      if (Number.isInteger(value) && normalized.split(',').includes('INT')) return 'INT';
      if (typeof value === 'number' && normalized.split(',').includes('FLOAT')) return 'FLOAT';
      if (typeof value === 'string' && normalized.split(',').includes('STRING')) return 'STRING';
    }
    return normalized;
  }
  if (typeof value === 'string') return 'STRING';
  if (typeof value === 'boolean') return 'BOOLEAN';
  if (Number.isInteger(value)) return 'INT';
  if (typeof value === 'number') return 'FLOAT';
  return 'UNKNOWN';
}

export function mediaKindFor(type, fieldName, specification, classType) {
  const declared = String(type || '')
    .toUpperCase()
    .split(',')
    .map((item) => item.trim());
  if (declared.includes('MASK')) return 'mask';
  if (declared.includes('IMAGE')) return 'image';
  if (declared.includes('AUDIO')) return 'audio';
  if (declared.includes('VIDEO')) return 'video';

  const options = isPlainObject(specification?.[1]) ? specification[1] : {};
  const uploadKind = Object.entries(options)
    .find(
      ([key, enabled]) => enabled === true && /^(?:image|mask|audio|video)_upload$/i.test(key),
    )?.[0]
    ?.replace(/_upload$/i, '')
    .toLowerCase();
  if (['image', 'mask', 'audio', 'video'].includes(uploadKind)) return uploadKind;

  // A loader also has rate, size, format and other scalar settings. Its class
  // name alone does not make every field a media upload input.
  if (
    !['STRING', 'COMBO'].includes(String(type).toUpperCase()) ||
    !/^(?:(?:image|mask|audio|video)(?:_path|_file|_filename)?|file|filename|path|file_path)$/i.test(
      fieldName,
    )
  )
    return null;
  const loader = `${classType || ''} ${fieldName}`.toLowerCase();
  if (/load.*mask/.test(loader)) return 'mask';
  if (/load.*image/.test(loader)) return 'image';
  if (/load.*audio/.test(loader)) return 'audio';
  if (/load.*video/.test(loader)) return 'video';
  return null;
}

export function controlFor(type, specification, fieldName, classType) {
  const options = specification?.[1] || {};
  if (mediaKindFor(type, fieldName, specification, classType)) return 'asset';
  if (/seed/i.test(fieldName)) return 'seed';
  if (schemaOptions(specification)) return 'select';
  if (type === 'BOOLEAN') return 'toggle';
  if (type === 'INT' || type === 'FLOAT' || type === 'NUMBER') {
    return Number.isFinite(options.min) && Number.isFinite(options.max) ? 'slider' : 'number';
  }
  if (type === 'STRING') return options.multiline ? 'textarea' : 'text';
  return 'text';
}

export function candidateBinding(nodeId, node, fieldName, value, objectInfo) {
  const definition = objectInfo?.[node.class_type];
  const specification = schemaInput(definition, fieldName, node.inputs);
  const type = schemaType(specification, value);
  const options = isPlainObject(specification?.[1]) ? specification[1] : {};
  return {
    nodeId,
    classType: node.class_type,
    nodeTitle: node?._meta?.title || definition?.display_name || node.class_type,
    fieldName,
    value,
    valueType: type,
    required: Boolean(definition?.input?.required?.[fieldName]),
    connected: false,
    control: controlFor(type, specification, fieldName, node.class_type),
    mediaKind: mediaKindFor(type, fieldName, specification, node.class_type),
    modelKind: MODEL_FIELDS[fieldName] || null,
    options: schemaOptions(specification),
    minimum: Number.isFinite(options.min) ? options.min : null,
    maximum: Number.isFinite(options.max) ? options.max : null,
    step: Number.isFinite(options.step) ? options.step : null,
    confidence: specification ? 'high' : 'low',
  };
}

export function definitionFieldOrder(definition) {
  const requiredOrder = Array.isArray(definition?.input_order?.required)
    ? definition.input_order.required
    : Object.keys(definition?.input?.required || {});
  const optionalOrder = Array.isArray(definition?.input_order?.optional)
    ? definition.input_order.optional
    : Object.keys(definition?.input?.optional || {});
  return [...requiredOrder, ...optionalOrder];
}

export function acceptsWidgetValue(specification, value) {
  const type = schemaType(specification, value);
  const options = schemaOptions(specification);
  if (options) return options.includes(value);
  if (type === 'STRING') return typeof value === 'string';
  if (type === 'BOOLEAN') return typeof value === 'boolean';
  if (type === 'INT') return Number.isInteger(value);
  if (type === 'FLOAT' || type === 'NUMBER') return typeof value === 'number';
  if (type === 'JSON') return value !== null && typeof value === 'object';
  return false;
}

export function explicitSchemaDefault(specification) {
  const options = isPlainObject(specification?.[1]) ? specification[1] : null;
  if (!options || !Object.hasOwn(options, 'default')) return { found: false };
  return { found: true, value: options.default };
}
