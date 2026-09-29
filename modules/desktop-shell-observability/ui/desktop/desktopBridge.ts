import type { DesktopUpdateBridge } from '../../../contracts/desktopUpdates';
/** Capabilities exposed by the isolated Electron preload. */
export interface NakoDesktopBridge {
  readonly version: string;
  readonly updates?: DesktopUpdateBridge;
  readonly integratedTitleBar?: boolean;
  setTheme?(theme: 'dark' | 'light'): Promise<void>;
  showItemInFolder(path: string): Promise<void>;
  pathForFile(file: File): string;
  onBackendState(listener: (state: 'ready' | 'reconnecting') => void): () => void;
}
declare global {
  interface Window {
    nakoDesktop?: NakoDesktopBridge;
  }
}
export function desktopBridge(windowObject: Window | null = window): NakoDesktopBridge | null {
  return windowObject?.nakoDesktop ?? null;
}
