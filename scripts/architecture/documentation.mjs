import fs from 'node:fs';
import path from 'node:path';
import { INVENTORY_START, INVENTORY_END, sourceInventory } from './sourceInventory.mjs';

const architecture = 'docs/architecture';
const modules = fs.readdirSync('modules', { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const write = process.argv.includes('--write');
const failures = [];
for (const module of modules) {
  const file = `${architecture}/${module}.md`;
  if (!fs.existsSync(file)) { failures.push(`Missing module document: ${file}`); continue; }
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const start = text.indexOf(INVENTORY_START), end = text.indexOf(INVENTORY_END);
  if (start < 0 || end < start) { failures.push(`Missing source inventory markers: ${file}`); continue; }
  const next = text.slice(0, start) + sourceInventory(module) + text.slice(end + INVENTORY_END.length);
  if (write) fs.writeFileSync(file, next);
  else if (next !== text) failures.push(`Stale source inventory: ${file} (run node scripts/architecture/documentation.mjs --write)`);
  for (const heading of ['职责与边界', '接口契约', '数据模型', '功能结构']) {
    if (!text.includes(`## ${heading}`)) failures.push(`${file}: missing ${heading}`);
  }
}
function documents(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = `${directory}/${entry.name}`;
    return entry.isDirectory() ? documents(file) : /\.md$/.test(file) ? [file] : [];
  });
}
for (const file of ['README.md', ...documents('docs')]) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(?:https?:|mailto:|data:)/i.test(target)) continue;
    let decoded;
    try { decoded = decodeURIComponent(target); } catch { failures.push(`${file}: invalid link ${target}`); continue; }
    if (!fs.existsSync(path.resolve(path.dirname(file), decoded))) failures.push(`${file}: missing link target ${target}`);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.info(`Documentation passed: ${modules.length} module documents; source inventories and local links verified.`);
