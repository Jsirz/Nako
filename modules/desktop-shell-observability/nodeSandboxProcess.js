import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Only the trusted bootstrap runs as Node; package code remains inside QuickJS. */
export function launchNodeSandbox(runtime = process, launch = fork) {
  const electron = Boolean(runtime.versions.electron);
  return launch(fileURLToPath(new URL('./nodeSandboxChild.mjs', import.meta.url)), [], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true,
    execArgv: ['--max-old-space-size=128'],
    // Do not inherit provider credentials or application environment variables.
    env: electron ? { ELECTRON_RUN_AS_NODE: '1' } : {},
    execPath: electron && runtime.platform === 'darwin' && runtime.helperExecPath
      ? runtime.helperExecPath : runtime.execPath,
  });
}
