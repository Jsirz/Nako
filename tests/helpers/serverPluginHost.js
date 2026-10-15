import path from 'node:path';
import { fileURLToPath } from 'node:url';
import applications from '../../config/application-plugins.json' with { type: 'json' };
import { createServerPluginHost as createHost } from '../../modules/desktop-shell-observability/api/serverHost.js';
import { clearServerCapabilities } from './serverCapabilities.js';

export function createServerPluginHost(options) {
  clearServerCapabilities();
  const privateDirectory = path.join(path.dirname(options.libraryDirectory), 'private');
  return createHost({
    ...options,
    configuration: {
      ...options.configuration,
      disabled: [...(options.configuration?.disabled || []), ...applications
        .filter(entry => entry.id !== 'module.identity-account').map(entry => entry.id)],
    },
    runtime: { paths: {
      APP_DIR: fileURLToPath(new URL('../../', import.meta.url)),
      BIN_DIR: fileURLToPath(new URL('../../bin', import.meta.url)),
      PUBLIC_DIR: fileURLToPath(new URL('../../public', import.meta.url)),
      LIBRARY_DIR: options.libraryDirectory, PRIVATE_DIR: privateDirectory,
    } },
    routes: { contribute() {} },
  });
}
