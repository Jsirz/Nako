const PROJECT_COVER_IMAGE = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|tiff?|webp)(?:[?#]|$)/iu;

export function projectCoverPreviewUrl(source: string): string | null {
  const value = String(source || '').trim();
  if (!value || value.startsWith('/api/media/thumbnail?')) return value || null;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/library/')) {
      return null;
    }
    const localUrl = `${parsed.pathname}${parsed.search}`;
    if (!PROJECT_COVER_IMAGE.test(localUrl)) return null;
    return `/api/media/thumbnail?url=${encodeURIComponent(localUrl)}&max=960`;
  } catch {
    return null;
  }
}
