export type DesktopUpdatePhase = 'disabled' | 'idle' | 'checking' | 'current' | 'available'
  | 'downloading' | 'downloaded' | 'installing' | 'error';

export interface DesktopUpdateState {
  version: string;
  phase: DesktopUpdatePhase;
  nextVersion?: string;
  releaseNotes?: string;
  percent?: number;
  checkedAt?: string;
  message: string;
}

export interface DesktopUpdateBridge {
  state(): Promise<DesktopUpdateState>;
  check(): Promise<DesktopUpdateState>;
  download(): Promise<DesktopUpdateState>;
  install(): Promise<DesktopUpdateState>;
  subscribe(listener: (state: DesktopUpdateState) => void): () => void;
}

export const PREPARE_DESKTOP_RESTART = 'nako:prepare-desktop-restart';
export interface PrepareDesktopRestart {
  waitUntil(promise: Promise<boolean>): void;
}
