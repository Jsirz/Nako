/** Keep explicit per-kind or generic selections; only an absent selection inherits. */
export function declaredModel(kind, node) {
  const specific = node?.[`${kind}Model`];
  return (
    (typeof specific === 'string' ? specific.trim() : '') ||
    (typeof node?.model === 'string' ? node.model.trim() : '')
  );
}
