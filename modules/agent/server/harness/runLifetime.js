import { harnessError } from './session.js';

/** HTTP connections observe runs; project/application lifecycle owns cancellation. */
export function createRunLifetime(harness) {
  const runs = new Map();
  let closed = false;
  function stopSession(id) {
    runs.get(id)?.controller.abort();
    harness.stop(id);
  }
  return {
    begin(sessionId, projectId) {
      if (closed) throw harnessError('Agent 已关闭', 'AGENT_UNAVAILABLE', 503);
      const controller = new AbortController();
      let settle;
      const done = new Promise((resolve) => {
        settle = resolve;
      });
      const record = { projectId, controller, done };
      runs.set(sessionId, record);
      return {
        signal: controller.signal,
        finish() {
          controller.abort();
          if (runs.get(sessionId) === record) runs.delete(sessionId);
          settle();
        },
      };
    },
    stopSession,
    async stopProject(projectId) {
      const selected = [...runs].filter(([, run]) => run.projectId === projectId);
      for (const [id] of selected) stopSession(id);
      await Promise.all(selected.map(([, run]) => run.done));
    },
    async close() {
      closed = true;
      const pending = [...runs.values()];
      for (const id of runs.keys()) stopSession(id);
      await harness.close();
      await Promise.all(pending.map((run) => run.done));
    },
  };
}
