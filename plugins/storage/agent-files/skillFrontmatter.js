// Read the scalar fields used by SKILL metadata, including YAML block scalars.
export function skillDisplayMetadata(fields) {
  return {
    name: String(fields['display-name'] || fields.name || '未命名技能').trim().slice(0, 120),
    description: String(fields['display-description'] || fields.description || '').trim().slice(0, 500),
  };
}

export function skillFrontmatter(text) {
  const match = String(text).replace(/^\uFEFF/, '').match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return {};
  const lines = match[1].split(/\r?\n/), fields = {};
  for (let index = 0; index < lines.length; index += 1) {
    const entry = lines[index].match(/^([A-Za-z][\w-]*):\s*(.+)$/);
    if (!entry) continue;
    const key = entry[1].toLowerCase(), value = entry[2].trim();
    if (/^[>|][-+]?$/.test(value)) {
      const block = [];
      while (index + 1 < lines.length && /^(?:\s|$)/.test(lines[index + 1])) {
        block.push(lines[++index]);
      }
      const indent = Math.min(...block.filter(line => line.trim()).map(line => line.match(/^\s*/)[0].length));
      fields[key] = block.map(line => line.slice(indent)).join(value[0] === '>' ? ' ' : '\n').trim();
    } else if (value.startsWith('"') && value.endsWith('"')) {
      try { fields[key] = JSON.parse(value); } catch { fields[key] = value.slice(1, -1); }
    } else {
      fields[key] = value.replace(/^'|'$/g, '').replaceAll("''", "'");
    }
  }
  return fields;
}
