export const MAX_SOURCE_LINES = 500;

export function sourceLineCount(text) {
  return text === '' ? 0 : text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
}

/** Existing debt may shrink, but new files and increases must fail the gate. */
export function checkFileLimits(sources, baseline = {}, { strict = false } = {}) {
  const failures = [];
  const debt = [];
  for (const [file, text] of sources) {
    const lines = sourceLineCount(text);
    if (lines <= MAX_SOURCE_LINES) continue;
    debt.push({ file, lines });
    const recorded = baseline[file];
    const limit = !strict && Number.isInteger(recorded) ? recorded : MAX_SOURCE_LINES;
    if (lines > limit)
      failures.push(`${file}: ${lines} lines exceeds ${limit} (target ${MAX_SOURCE_LINES})`);
  }
  for (const [file, cap] of Object.entries(baseline)) {
    if (!Number.isInteger(cap) || cap <= MAX_SOURCE_LINES)
      failures.push(`${file}: invalid line debt ceiling ${cap}`);
    else if (!sources.has(file) || sourceLineCount(sources.get(file)) < cap)
      failures.push(`${file}: remove or reduce the stale line debt ceiling ${cap}`);
  }
  return { failures, debt: debt.sort((a, b) => b.lines - a.lines) };
}
