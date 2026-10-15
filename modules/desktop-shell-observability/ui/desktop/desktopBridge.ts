import type { NakoDesktopBridge } from '../../../contracts/desktopBrowser';
export type { NakoDesktopBridge } from '../../../contracts/desktopBrowser';
declare global {
  interface Window {
    nakoDesktop?: NakoDesktopBridge;
  }
}
export function desktopBridge(windowObject: Window | null = window): NakoDesktopBridge | null {
  return windowObject?.nakoDesktop ?? null;
}
