import crypto from 'node:crypto';
import { constants } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { releasePaths } from './installation.mjs';
import { UserScopeError, USER_SCOPE_ERRORS } from '../../../modules/contracts/projectErrors.js';
import * as credentials from '../../../modules/identity-account/api/server/credentials/providerCredentialStore.mjs';

const OPAQUE_USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
// Values meant for other launchers or for a pending update handover, never for the backend.
const FOREIGN_VARIABLES = [
  'COLLAB_PORT',
  'VITE_COLLAB_PORT',
  'NAKO_COLLAB_INTERNAL_SECRET',
  'NAKO_CONTROLLER_PID',
  'SERVER_PORT',
  'ELECTRON_RUN_AS_NODE',
  'NAKO_UPDATE_STARTUP_TRANSACTION',
  'NAKO_UPDATE_STARTUP_TOKEN',
  'NAKO_UPDATE_STARTUP_VERSION',
  'NAKO_UPDATE_GUARD_CODE',
  'NAKO_UPDATE_GUARD_OWNER_PID',
];

// Release metadata comes from packaging; credential persistence belongs to identity-account.
export async function loadReleaseHelpers(toolsDirectory) {
  const load = (name) => import(pathToFileURL(path.join(toolsDirectory, name)).href);
  const runtime = await load('runtimeControl.mjs');
  return {
    providerSecretKeys: runtime.USER_PROVIDER_SECRET_KEYS,
    loadProductVersion: runtime.loadPackagedProductVersion,
    credentialFileName: credentials.PROVIDER_CREDENTIAL_FILE_NAME,
    createCredentialStore: ({ filePath, helperPath }) =>
      credentials.createProviderCredentialStore({
        filePath,
        allowedKeys: runtime.USER_PROVIDER_SECRET_KEYS,
        protector: credentials.createPlatformCredentialProtector({ helperPath }),
      }),
  };
}

export function parseEnvironment(text) {
  const result = {};
  for (const line of String(text || '').split(/\r?\n/u)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u.exec(line);
    if (!match) continue;
    let value = match[2];
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    )
      value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

function withoutKeys(text, keys) {
  const kept = String(text || '')
    .split(/\r?\n/u)
    .filter((line) => !keys.has(/^\s*([A-Z][A-Z0-9_]*)\s*=/u.exec(line)?.[1]));
  while (kept.length > 0 && kept.at(-1) === '') kept.pop();
  return `${kept.join('\n')}\n`;
}

async function readText(file) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

async function writeTextAtomic(file, contents) {
  const temporary = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await writeFile(temporary, contents, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await rename(temporary, file);
  } finally {
    await rm(temporary, { force: true });
  }
}

// Mirrors runtimeControl's start environment, plus the pipe and the Identity origin.
export async function createBackendEnvironment({
  installation,
  userId,
  pipe,
  helpers,
  baseEnvironment = process.env,
}) {
  if (!OPAQUE_USER_ID.test(String(userId)) || userId === '00000000-0000-0000-0000-000000000000') {
    throw new UserScopeError('INVALID_USER_SCOPE', USER_SCOPE_ERRORS.invalid);
  }
  await mkdir(installation.logs, { recursive: true });
  await mkdir(installation.config, { recursive: true });
  try {
    await copyFile(installation.envTemplate, installation.envFile, constants.COPYFILE_EXCL);
  } catch (error) {
    if (!['EEXIST', 'ENOENT'].includes(error?.code)) throw error;
  }
  const paths = releasePaths(installation);
  const environment = {
    ...baseEnvironment,
    ...parseEnvironment(await readText(installation.envFile)),
    NAKO_PRODUCT_VERSION: await helpers.loadProductVersion(paths),
  };
  for (const key of FOREIGN_VARIABLES) delete environment[key];

  const userRoot = path.join(installation.data, 'users', userId);
  const providerEnvironmentPath = path.join(userRoot, 'config', 'providers.env');
  const credentialPath = path.join(userRoot, 'private', helpers.credentialFileName);
  await mkdir(path.dirname(providerEnvironmentPath), { recursive: true });
  await mkdir(path.dirname(credentialPath), { recursive: true });
  const store = helpers.createCredentialStore({
    filePath: credentialPath,
    helperPath: installation.providerCredentialHelper,
  });
  const secretKeys = new Set(helpers.providerSecretKeys);
  const providerText = await readText(providerEnvironmentPath);
  const providerValues = parseEnvironment(providerText);
  const legacySecrets = Object.fromEntries(
    Object.entries(providerValues).filter(([key, value]) => secretKeys.has(key) && value),
  );
  if (Object.keys(legacySecrets).length > 0) {
    // Plaintext keys left by old versions move into the DPAPI store before the backend starts.
    await store.update(legacySecrets);
    await writeTextAtomic(providerEnvironmentPath, withoutKeys(providerText, secretKeys));
  }
  for (const key of secretKeys) {
    delete environment[key];
    delete providerValues[key];
  }
  Object.assign(environment, providerValues, await store.read(), {
    NODE_ENV: 'production',
    NAKO_APP_DIR: installation.code,
    NAKO_DATA_DIR: installation.data,
    NAKO_LIBRARY_DIR: path.join(userRoot, 'library'),
    NAKO_LOGS_DIR: installation.logs,
    NAKO_ENV_PATH: providerEnvironmentPath,
    NAKO_PROVIDER_CREDENTIAL_PATH: credentialPath,
    NAKO_PROVIDER_CREDENTIAL_HELPER: installation.providerCredentialHelper,
    NAKO_ACTIVE_USER_ID: userId,
    NAKO_BACKEND_PIPE: pipe,
  });
  for (const key of Object.keys(environment)) {
    if (/^(?:RELAY_|NAKO_(?:IDENTITY|ACCESS_TOKEN|SESSION|UPDATE)(?:_|$))/.test(key))
      delete environment[key];
  }
  return environment;
}
