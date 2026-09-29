export const AGENT_SESSION_VERSION = 2;
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function isAgentSession(value) {
  if (!(
    value &&
    value.version === AGENT_SESSION_VERSION &&
    /^[\w-]{1,128}$/.test(value.id || '') &&
    /^[\w-]{1,128}$/.test(value.projectId || '') &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    Array.isArray(value.entries) &&
    object(value.branches) &&
    Object.hasOwn(value.branches, value.activeBranch) &&
    object(value.runs) &&
    object(value.receipts) &&
    object(value.metadata)
  ))
    return false;
  // Entry parents must already exist. This rejects cycles, duplicate IDs and
  // dangling branch tips without knowing any internal model message types.
  const seen = new Set();
  for (const entry of value.entries) {
    if (
      !object(entry) ||
      typeof entry.id !== 'string' ||
      seen.has(entry.id) ||
      (entry.parentId !== null && !seen.has(entry.parentId)) ||
      !['message', 'compaction'].includes(entry.kind)
    )
      return false;
    seen.add(entry.id);
  }
  return Object.values(value.branches).every(
    (branch) => object(branch) && (branch.tipId === null || seen.has(branch.tipId)),
  );
}
