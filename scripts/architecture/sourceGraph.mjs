import ts from 'typescript';

export function moduleOwner(file) {
  return file.startsWith('modules/') ? file.split('/')[1] : null;
}

export function isBackendSource(file) {
  return /\/server\/|\/[a-zA-Z]*[sS]erverPlugin\.[cm]?[jt]s$|\/api\/serverHost\.[cm]?[jt]s$/.test(
    file,
  );
}

export function findDependencyCycles(edges) {
  const graph = new Map();
  for (const { from, to } of edges) {
    if (from === to) continue;
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from).add(to);
  }
  let sequence = 0;
  const indices = new Map(),
    low = new Map(),
    active = new Set(),
    stack = [],
    cycles = [];
  function visit(node) {
    indices.set(node, sequence);
    low.set(node, sequence++);
    active.add(node);
    stack.push(node);
    for (const target of graph.get(node) || []) {
      if (!indices.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
    }
    if (indices.get(node) !== low.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      active.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1) cycles.push(component.sort());
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return cycles;
}

export function forbiddenModuleImport(source, target) {
  const normalized = target.replaceAll('\\', '/');
  return (
    source.replaceAll('\\', '/').startsWith('modules/') && /^(scripts|apps)\//.test(normalized)
  );
}

export function importSpecifiers(source) {
  const specs = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      const p = node.parent;
      if (
        ts.isImportDeclaration(p) ||
        ts.isExportDeclaration(p) ||
        (ts.isLiteralTypeNode(p) && ts.isImportTypeNode(p.parent)) ||
        (ts.isCallExpression(p) &&
          (p.expression.kind === ts.SyntaxKind.ImportKeyword ||
            p.expression.getText(source) === 'require'))
      )
        specs.push(node.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return specs;
}
