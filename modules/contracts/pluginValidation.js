import { ERRORS, PluginError, PLUGIN_TYPES } from './index.js';
import { validateNodePackageManifest } from './nodeSdk.js';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9.-]+$/.test(value);
const version = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
const range = value => typeof value === 'string' && version(value.replace(/^(\^|>=)/, ''));
const invalid = field => { throw new PluginError(ERRORS.invalidManifest, `Invalid plugin contract: ${field}`); };
function strings(value, field, test = item => typeof item === 'string' && item.trim() === item && item.length > 0) {
  if (!Array.isArray(value) || value.some(item => !test(item)) || new Set(value).size !== value.length) invalid(field);
}

export const GENERATION_KINDS = Object.freeze(['image', 'video', 'audio', 'text']);
export const WORKFLOW_EXECUTOR_METHODS = Object.freeze(['execute', 'resume', 'retryInputCleanup', 'markRecoveryInputsOrphaned', 'markInputsOrphaned', 'cleanupInputs']);
export const WORKFLOW_CLIENT_METHODS = Object.freeze(['getSystemStats', 'getObjectInfo', 'supportsAtomicJobCancel', 'uploadInput', 'getWebAppInfoForProtocol', 'getWebAppInfo', 'getWorkflowApiFormat', 'getGlobalAiAppPageInfo', 'getWebAppCover', 'openOutput', 'validateCredential', 'resolveWebAppInfo']);

export function validateProviderDescriptor(value) {
  if (!record(value) || typeof value.name !== 'string' || !/^[A-Za-z][A-Za-z0-9]+$/.test(value.name)) invalid('provider.name');
  strings(value.kinds, 'provider.kinds', kind => GENERATION_KINDS.includes(kind));
  if (!value.kinds.length || !['immediate', 'polling'].includes(value.execution)) invalid('provider.execution');
  strings(value.requiredSecrets, 'provider.requiredSecrets', key => typeof key === 'string' && /^[A-Z][A-Z0-9_]*$/.test(key));
  return value;
}

export function validatePluginManifest(value) {
  if (!record(value) || !identifier(value.id) || !version(value.version) || !range(value.apiVersion) || !PLUGIN_TYPES.includes(value.type)) invalid('manifest');
  if (value.dependencies !== undefined) {
    if (!record(value.dependencies)) invalid('dependencies');
    for (const [id, wanted] of Object.entries(value.dependencies)) if (!identifier(id) || !range(wanted)) invalid('dependencies');
  }
  if (value.services !== undefined) {
    if (!record(value.services) || Object.keys(value.services).some(key => !['requires', 'optional', 'provides'].includes(key))) invalid('services');
    for (const [key, names] of Object.entries(value.services)) strings(names, `services.${key}`);
  }
  for (const key of ['capabilities', 'credentials', 'contextKeys', 'configPrefixes']) {
    if (value[key] !== undefined) strings(value[key], key);
  }
  if (value.reloadRequired !== undefined && typeof value.reloadRequired !== 'boolean') invalid('reloadRequired');
  if (value.providers !== undefined) {
    if (value.type !== 'provider' || !Array.isArray(value.providers) || !value.providers.length) invalid('providers');
    value.providers.forEach(validateProviderDescriptor);
    strings(value.providers.map(item => item.name), 'providers.name');
    for (const item of value.providers) if (!value.services?.provides?.includes(`provider.${item.name}`)) invalid('providers.services');
  }
  if (value.nodePackages !== undefined) {
    if (!Array.isArray(value.nodePackages) || !value.nodePackages.length) invalid('nodePackages');
    value.nodePackages.forEach(validateNodePackageManifest);
  }
  return value;
}
