import type { DesktopUpdateBridge } from './desktopUpdates';
export interface NakoDesktopBridge {
  readonly version: string; readonly updates?: DesktopUpdateBridge; readonly integratedTitleBar?: boolean;
  setTheme?(theme: 'dark' | 'light'): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  pathForFile(file: File): string;
  onBackendState(listener: (state: 'ready' | 'reconnecting') => void): () => void;
}
export type UploadRequestInit = RequestInit & { duplex?: 'half' };
export interface DesktopBrowserService {
  bridge(windowObject?: Window | null): NakoDesktopBridge | null;
  localFilePath(file: File, bridge?: Pick<NakoDesktopBridge, 'pathForFile'> | null): string;
  fileUploadBody(file: Blob): UploadRequestInit;
  projectArchiveRestoreRequest(file: File, bridge?: Pick<NakoDesktopBridge, 'pathForFile'> | null): RequestInit;
}
