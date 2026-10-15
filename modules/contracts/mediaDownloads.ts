export type DownloadableMediaNode = {
  id?: unknown;
  type?: unknown;
  title?: unknown;
  resultUrls?: unknown;
};

export type MediaDownloadFileNameAdapter = {
  fileName: (node: DownloadableMediaNode, sourceUrl: unknown, extension: unknown) => string;
  download: (
    node: DownloadableMediaNode,
    sourceUrl: unknown,
    extension: unknown,
    button?: HTMLButtonElement | null,
    suggestedFileName?: string,
  ) => Promise<MediaDownloadResult>;
  getSettings: () => Promise<MediaDownloadSettings>;
  chooseDirectory: () => Promise<MediaDownloadSettings | { status: 'cancelled' }>;
  resetDirectory: () => Promise<MediaDownloadSettings>;
  setAskEachTime: (enabled: boolean) => Promise<MediaDownloadSettings>;
  openDirectory: () => Promise<MediaDownloadOpenResult>;
};

export type MediaDownloadOpenResult = {
  status: 'opened';
  foreground: boolean;
  fileName: string | null;
  directory: string;
};

export type MediaDownloadSettings = {
  directory: string;
  defaultDirectory: string;
  customDirectory: boolean;
  askEachTime: boolean;
  directoryAvailable: boolean;
};

export type MediaDownloadResult =
  | { status: 'saved'; fileName: string; directory: string }
  | { status: 'cancelled' | 'busy' }
  | { status: 'failed'; code: string; message: string };
