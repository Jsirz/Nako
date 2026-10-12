/** Video sources in the application-owned showcase catalog. */
export function showcaseVideoSource(value) {
  if (typeof value !== 'string' || !value || value.length > 8192 || /[\u0000-\u001f\\]/.test(value)) return '';
  try {
    if (value.startsWith('/share/') && /\.(mp4|webm)$/.test(value)) {
      const parts = value.slice('/share/'.length).split('/').map(decodeURIComponent);
      return parts.every(part => part && part !== '.' && part !== '..' && !/[\u0000-\u001f/\\:]/.test(part)) ? value : '';
    }
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash ? value : '';
  } catch { return ''; }
}
