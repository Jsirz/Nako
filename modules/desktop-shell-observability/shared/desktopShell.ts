import { DESKTOP_ERRORS, desktopError } from '../../contracts/desktopErrors.js';
import type { OpenCanvasResult, PrepareCanvasResult } from './canvasEntry';
export interface WorkspaceView {
  state: 'ready';
  ready: boolean;
  message: string;
}
export interface NakoShell {
  info(): Promise<{
    version: string;
    productVersion: string | null;
    platform: string;
    architecture: string;
  }>;
  identity: {
    status(): Promise<WorkspaceView>;
    restore(): Promise<WorkspaceView>;
    recheck(): Promise<WorkspaceView>;
  };
  canvas: {
    prepare(): Promise<PrepareCanvasResult>;
    open(userInitiated: boolean): Promise<OpenCanvasResult>;
  };
  openExternal(url: string): Promise<void>;
  onClearSecrets(listener: () => void): () => void;
}
declare global {
  interface Window {
    nakoShell?: NakoShell;
  }
}
export function desktopShell(): NakoShell {
  if (!window.nakoShell) throw desktopError(DESKTOP_ERRORS.unavailable, '本机桌面环境不可用。', 'shell.access', 503);
  return window.nakoShell;
}
