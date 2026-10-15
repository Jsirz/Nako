import fs from 'node:fs';
import ts from 'typescript';
import { MAX_FUNCTION_LINES } from './fileLimits.mjs';

const skip = new Set(['api', 'builtin', 'node_modules', 'dist', '.git', '.verification', '.desktop-dev']);
const roots = ['apps', 'modules', 'plugins'];
const bareErrors = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'URIError', 'EvalError', 'AggregateError']);
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (skip.has(entry.name)) return [];
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? files(file) : /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.ts$/.test(file) ? [file] : [];
  });
}
const issues = [];
for (const file of roots.flatMap(files)) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const line = node => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const report = (node, rule, detail) => issues.push({ file, line: line(node), rule, detail });
  function visit(node) {
    if (ts.isFunctionLike(node) && node.body) {
      const length = source.getLineAndCharacterOfPosition(node.end).line + 2 - line(node);
      if (length > MAX_FUNCTION_LINES) report(node, 'function-lines', `${node.name?.getText(source) || '(closure)'}: ${length} > ${MAX_FUNCTION_LINES}`);
    }
    if ((ts.isNewExpression(node) || ts.isCallExpression(node))
      && ts.isIdentifier(node.expression) && bareErrors.has(node.expression.text)) {
      report(node, 'bare-error', `${node.expression.text}；使用 contracts 的结构化错误及上下文`);
    }
    if (ts.isCallExpression(node)
      && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'console') {
      report(node, 'direct-console', `${node.expression.getText(source)}；使用 kernel Logger`);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const counts = Object.fromEntries(['function-lines', 'bare-error', 'direct-console'].map(rule => [rule, issues.filter(issue => issue.rule === rule).length]));
if (process.argv.includes('--json')) console.info(JSON.stringify({ roots, counts, issues }, null, 2));
else {
  console.info(`Convention audit: ${JSON.stringify(counts)}. Findings are unresolved conventions, not syntax/type diagnostics.`);
  if (process.argv.includes('--details')) for (const issue of issues) console.info(`${issue.file}:${issue.line}: ${issue.rule}: ${issue.detail}`);
}
if (issues.length && process.argv.includes('--strict')) process.exitCode = 1;
