export interface ShowcaseArchiveRequest { archive: string }
/** Returns a supported /share/*.nako path or HTTPS archive URL, otherwise an empty string. */
export function showcaseArchiveSource(value: unknown): string;
