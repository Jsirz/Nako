import {
  SECRET_MASK,
  SECRET_KEYS,
  NETWORK_KEYS,
  LOCAL_ONLY_DISABLED_KEYS,
  isAllowedKey,
  normalizeNetworkConfigValue,
  parseEnvironment,
  safeValue,
  serializeEnvironment,
  USER_PROVIDER_SECRET_KEYS,
} from '../config/environmentConfig.js';
export { SECRET_MASK, USER_PROVIDER_SECRET_KEYS } from '../config/environmentConfig.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { RUNTIME_PATHS } from '../../../project/api/server/workspace/runtimePaths.js';
import { loadModelNames as loadCatalogModelNames } from '../config/modelCatalog.js';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { createModuleLogger } from '../../../kernel/logger.js';

const DEFAULT_ENV_PATH = RUNTIME_PATHS.ENV_PATH;
const DEFAULT_MODEL_CONFIG_PATH = path.join(
  RUNTIME_PATHS.APP_DIR,
  'modules',
  'generation-core',
  'models',
  'catalog.ts',
);

function loadModelNames(modelConfigPath) {
  // 与 /api/generate-* 共用同一份目录读取逻辑，避免两处解析器漂移：
  // 一旦口径不一致，就会出现「设置页列得出这个模型、生成时却说不支持」。
  return loadCatalogModelNames({ sourcePath: modelConfigPath });
}

function writePrivateFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, content, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    try {
      fs.chmodSync(temporaryPath, 0o600);
    } catch {
      /* Windows may not support POSIX modes. */
    }
    fs.renameSync(temporaryPath, filePath);
    try {
      fs.chmodSync(filePath, 0o600);
    } catch {
      /* Windows may not support POSIX modes. */
    }
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}


export function createConfigRouter({
  envPath = DEFAULT_ENV_PATH,
  modelConfigPath = DEFAULT_MODEL_CONFIG_PATH,
  modelNames = loadModelNames(modelConfigPath),
  credentialStore,
  logger = createModuleLogger('generation-core'),
} = {}) {
  if (!credentialStore) throw new PluginError(ERRORS.serviceMissing, 'Provider credential manager is required', { context: { moduleId: 'generation-core', service: 'identity.providerCredentials' } });
  const router = express.Router();
  let migrationPromise = null;

  const readConfig = () =>
    parseEnvironment(fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '');

  const ensureSecretsMigrated = () => {
    if (!migrationPromise) {
      migrationPromise = (async () => {
        const current = readConfig();
        const secretPatch = Object.fromEntries(
          [...SECRET_KEYS].filter((key) => current[key]).map((key) => [key, current[key]]),
        );
        if (Object.keys(secretPatch).length === 0) return;
        await credentialStore.update(secretPatch);
        const nonSecret = Object.fromEntries(
          Object.entries(current).filter(([key]) => !SECRET_KEYS.has(key)),
        );
        writePrivateFile(envPath, serializeEnvironment(nonSecret));
        Object.assign(process.env, secretPatch);
      })().catch((error) => {
        migrationPromise = null;
        throw error;
      });
    }
    return migrationPromise;
  };

  router.get('/keys', async (_request, response) => {
    try {
      await ensureSecretsMigrated();
      const config = readConfig();
      const credentials = await credentialStore.read();
      for (const name of modelNames) {
        const proxyKey = `MODEL_PROXY_${name.replace(/[\s.-]/g, '_').toUpperCase()}`;
        if (config[proxyKey] === undefined) config[proxyKey] = 'false';
      }
      for (const key of SECRET_KEYS) {
        if (credentials[key] || process.env[key]) config[key] = SECRET_MASK;
      }
      response.json(config);
    } catch {
      response.status(500).json({ error: 'Failed to read config' });
    }
  });

  router.post('/keys', async (request, response) => {
    try {
      await ensureSecretsMigrated();
      const current = readConfig();
      const submitted = request.body && typeof request.body === 'object' ? request.body : {};
      const next = { ...current };
      const secretPatch = {};
      for (const [key, rawValue] of Object.entries(submitted)) {
        if (!isAllowedKey(key) || LOCAL_ONLY_DISABLED_KEYS.has(key)) continue;
        if (SECRET_KEYS.has(key) && rawValue === SECRET_MASK) continue;
        const value = safeValue(rawValue);
        if (
          key.startsWith('MODEL_ID_') &&
          value &&
          !/^[a-zA-Z0-9][a-zA-Z0-9_./:@+-]{0,199}$/.test(value)
        ) {
          return response
            .status(400)
            .json({ error: '模型 ID 无效，不能包含空格或换行，最多 200 个字符。' });
        }
        if (SECRET_KEYS.has(key)) {
          secretPatch[key] = value;
          continue;
        }
        next[key] = NETWORK_KEYS.has(key) ? normalizeNetworkConfigValue(key, value) : value;
      }
      if (Object.keys(secretPatch).length > 0) await credentialStore.update(secretPatch);
      const nextContent = serializeEnvironment(next);
      const currentContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
      if (currentContent !== nextContent) writePrivateFile(envPath, nextContent);
      for (const [key, value] of Object.entries(next)) process.env[key] = value;
      logger.info('Model source configuration updated', { changedKeys: Object.keys(submitted).filter(isAllowedKey).join(', ') });
      response.json({ success: true });
    } catch (error) {
      logger.error('Model source configuration update failed', { errorType: error?.name, code: error?.code });
      response.status(error?.status || 500).json({ error: 'Failed to update config', code: error?.code });
    }
  });

  return router;
}

export default createConfigRouter;
