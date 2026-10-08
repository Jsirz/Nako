import fs from 'node:fs';
import ts from 'typescript';

export const INVENTORY_START = '<!-- source-inventory:start -->';
export const INVENTORY_END = '<!-- source-inventory:end -->';
const skip = new Set(['api', 'builtin', 'node_modules', 'dist', '.git']);
const source = /\.(?:[cm]?[jt]sx?|css|json)$/;

export function moduleFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (skip.has(entry.name)) return [];
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? moduleFiles(file)
      : source.test(file) && !/\.generated\.|\/models\/catalog\.ts$/.test(file) ? [file] : [];
  }).sort();
}

function exportsOf(file, text) {
  if (/\.css$/.test(file)) return '样式';
  if (/\.json$/.test(file)) return '声明式配置';
  const node = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const names = [];
  for (const statement of node.statements) {
    if (ts.isExportAssignment(statement)) names.push('default');
    else if (ts.isExportDeclaration(statement)) {
      if (statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        names.push(...statement.exportClause.elements.map(item => item.name.text));
      } else names.push(`重导出 ${statement.moduleSpecifier?.text || ''}`);
    } else if (statement.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword)) {
      if (ts.isVariableStatement(statement)) names.push(...statement.declarationList.declarations.map(item => item.name.getText(node)));
      else if (statement.name) names.push(statement.name.getText(node));
      else names.push('default');
    }
  }
  return names.length ? names.map(name => `\`${name.replaceAll('|', '&#124;')}\``).join(', ') : '内部实现';
}

function roleOf(file) {
  if (/manifest\.json$/.test(file)) return '插件声明';
  if (/exports\.json$/.test(file)) return '公开 API 清单';
  if (/\.(?:d\.ts|json)$/.test(file)) return '类型或数据定义';
  if (/\.css$/.test(file)) return '界面样式';
  if (/Plugin\.|\/browser\.|\/index\./.test(file)) return '模块入口或装配';
  if (/Router\./i.test(file)) return 'HTTP 转换与校验';
  if (/Store\.|Repository\./i.test(file)) return '存储访问或状态管理';
  if (/Client\.|Transport\./i.test(file)) return '客户端或传输';
  if (/render|Card|Panel|View|Dialog|Composer/i.test(file)) return '界面呈现与交互';
  if (/Protocol|Schema|Validation|Types|Values|Format|Policy/i.test(file)) return '协议、校验或数据规则';
  if (/Scheduler|Coordinator|Runtime|Service|Execution|Recovery/i.test(file)) return '运行、调度或服务';
  if (/\/ui\//.test(file)) return '浏览器交互与状态辅助';
  if (/\/server\//.test(file)) return '服务端领域实现';
  if (/\/desktop\//.test(file)) return '桌面平台适配';
  return '模块内部辅助';
}

function effectsOf(file, text) {
  if (/\.(?:d\.ts|css|json)$/.test(file)) return '无业务运行副作用';
  const effects = [];
  if (/(?:from\s*|import\s*\()?['"](?:node:)?fs(?:\/promises)?['"]/.test(text)) effects.push('文件系统');
  if (/(?:node:)?child_process/.test(text)) effects.push('子进程');
  if (/\bfetch(?:Impl|er)?\s*\(|\b(?:express\.)?Router\s*\(|from ['"](?:node-fetch|undici|ws)['"]/.test(text)) effects.push('HTTP/网络');
  if (/\b(?:document|window)\.|useEffect\(|useLayoutEffect\(/.test(text)) effects.push('DOM/事件');
  if (/services\.register\(|onDispose\(/.test(text)) effects.push('服务注册/生命周期');
  return effects.length ? `含 ${effects.join('、')} 调用；时机见实现` : '未检出平台调用；不等于纯函数证明';
}

export function sourceInventory(module) {
  const files = moduleFiles(`modules/${module}`);
  const rows = files.map(file => {
    const text = fs.readFileSync(file, 'utf8');
    return `| [${file}](../../${file}) | ${roleOf(file)} | ${exportsOf(file, text)} | ${effectsOf(file, text)} |`;
  });
  return [INVENTORY_START, '## 文件目录', '',
    '此表由 `scripts/architecture/documentation.mjs` 从源码生成。职责为文件类别，具体流程以上文为准；副作用列仅标识源码中的调用，不承诺导入安全或运行时纯度。公共 API 转出清单以本模块 `exports.json` 为准。Skill、图片、模型聚合产物、测试及脚本不混入业务目录。', '',
    '| 源码 | 职责 | 主要导出 | 副作用 |', '| --- | --- | --- | --- |', ...rows, '', INVENTORY_END].join('\n');
}
