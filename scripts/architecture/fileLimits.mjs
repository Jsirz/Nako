export const MAX_SOURCE_LINES = 1000;
export const MAX_FUNCTION_LINES = 200;

export function sourceLineCount(text) {
  return text === '' ? 0 : text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length;
}

/** AGENTS.md applies to every source file; recorded debt does not waive the limit. */
export function checkFileLimits(sources) {
  const failures = [];
  for (const [file, text] of sources) {
    const lines = sourceLineCount(text);
    if (lines > MAX_SOURCE_LINES) failures.push(`${file}: ${lines} lines exceeds ${MAX_SOURCE_LINES}`);
  }
  return { failures };
}
