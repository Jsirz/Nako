import fs from 'node:fs';
import path from 'node:path';

export function installBackendLifecycleDiagnostics({ logsDirectory }) {
  const file = path.join(logsDirectory, 'backend-lifecycle.log');

  function record(event, detail) {
    try {
      fs.mkdirSync(logsDirectory, { recursive: true });
      fs.appendFileSync(
        file,
        `${JSON.stringify({ at: new Date().toISOString(), event, detail })}\n`,
        'utf8',
      );
    } catch {
      // Diagnostics must never interfere with backend startup or shutdown.
    }
  }

  record('started', { pid: process.pid });
  return {
    shutdownRequested(reason) {
      record('shutdown-requested', { reason });
    },
  };
}
