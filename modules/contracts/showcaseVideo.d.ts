export type ShowcaseVideoContentType = 'video/mp4' | 'video/webm';
export interface ShowcaseVideoCacheRequest { video: string }
/** Same-origin URL serving the completed cache; local paths are never sent to the client. */
export interface ShowcaseVideoCacheResult { url: string }
export function showcaseVideoSource(value: unknown): string;
