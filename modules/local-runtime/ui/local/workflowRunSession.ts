export const RUN_SESSION_KEY = 'nako.workflow-manager.active-run.v1';

export function persistRunReference(definitionId: string, runId: string) {
  try {
    sessionStorage.setItem(RUN_SESSION_KEY, JSON.stringify({ definitionId, runId }));
  } catch {
    // Session recovery is best-effort and must never block a local run.
  }
}

export function readRunReference(): { definitionId: string; runId: string } | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RUN_SESSION_KEY) || 'null');
    if (
      typeof value?.definitionId === 'string' &&
      value.definitionId.length <= 200 &&
      typeof value?.runId === 'string' &&
      value.runId.length <= 200
    )
      return value;
  } catch {
    // Ignore stale or externally modified session state.
  }
  return null;
}

export function clearRunReference() {
  try {
    sessionStorage.removeItem(RUN_SESSION_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}
