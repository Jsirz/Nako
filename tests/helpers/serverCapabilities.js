import { beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serverServices } from '../../modules/kernel/server.js';
import mediaPlugin from '../../modules/asset-media/runtimePlugin.js';
import mediaFilesPlugin from '../../plugins/media/filesystem/runtimePlugin.js';
import mediaProbePlugin from '../../plugins/media/ffmpeg-sharp/probePlugin.js';
import { createModuleLogger } from '../../modules/kernel/logger.js';
import workflowPlugin from '../../modules/workflow-runtime/registryPlugin.js';
import { matchesRemoteTask, remoteTaskReference } from '../../modules/generation-core/server/generation/generationTaskRecovery.js';

const disposers = [];
export function clearServerCapabilities() {
  disposers.splice(0).reverse().forEach(dispose => dispose());
}
/** Direct implementation tests provide the same public services as the backend host. */
export function useServerCapabilities({ media = false, workflows = false, probe } = {}) {
  let directory;
  beforeEach(async () => {
    const register = (id, value) => disposers.push(serverServices.register(id, value, 'test.capabilities'));
    register('generation.receipts', { matchesRemoteTask, remoteTaskReference });
    if (!media && !workflows) return;
    directory = await mkdtemp(path.join(os.tmpdir(), 'nako-capabilities-'));
    register('platform.paths', {
      runtime: { BIN_DIR: fileURLToPath(new URL('../../bin', import.meta.url)) },
      workspace: () => ({ LIBRARY_DIR: directory, LIBRARY_MEDIA_DIR: path.join(directory, 'media'),
        WORKFLOWS_DIR: path.join(directory, 'media'), LIBRARY_ASSETS_DIR: path.join(directory, 'assets') }),
      publicLibraryPrefix: () => '/library',
    });
    const context = { logger: createModuleLogger('test.capabilities'), services: {
      get: id => serverServices.get(id), register,
    } };
    mediaProbePlugin.activate(context);
    mediaFilesPlugin.activate(context);
    mediaPlugin.activate({ ...context, services: { ...context.services,
      register: (id, value) => register(id, probe ? { ...value, createMetadataProbe: () => probe } : value),
    } });
    if (workflows) workflowPlugin.activate({ services: { register } });
  });
  afterEach(async () => {
    clearServerCapabilities();
    if (directory) await rm(directory, { recursive: true, force: true });
    directory = undefined;
  });
}
