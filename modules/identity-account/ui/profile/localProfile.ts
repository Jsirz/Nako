import { IDENTITY_ERRORS, identityError, avatarCancelled } from '../../../contracts/identityErrors.js';
import { browserServices } from '../../../kernel/browser';
import { accountPreferences as preferenceStorage } from '../../../kernel/browser';

const AVATAR_STORAGE_KEY = 'nako-local-avatar';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface StableLocalProfileAdapter {
  getAvatar(): string;
  setAvatarDataUrl(dataUrl: string): void;
  setAvatarFile(file: File, options?: { signal?: AbortSignal }): Promise<string>;
  clearAvatar(): void;
  refresh(): void;
}

declare global {
  interface Window {
    __NAKO_LOCAL_PROFILE__?: StableLocalProfileAdapter;
  }
}

function isAllowedAvatarDataUrl(value: string): boolean {
  return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function readStoredAvatar(): string {
  try {
    const value = preferenceStorage().getItem(AVATAR_STORAGE_KEY) ?? '';
    return isAllowedAvatarDataUrl(value) ? value : '';
  } catch {
    return '';
  }
}

function applyAvatarToElement(element: HTMLElement, avatar: string): void {
  if (!avatar) {
    element.style.removeProperty('background-image');
    element.style.removeProperty('background-position');
    element.style.removeProperty('background-size');
    element.style.removeProperty('color');
    element.removeAttribute('data-has-custom-avatar');
    return;
  }
  element.style.backgroundImage = `url("${avatar}")`;
  element.style.backgroundPosition = 'center';
  element.style.backgroundSize = 'cover';
  element.style.color = 'transparent';
  element.setAttribute('data-has-custom-avatar', 'true');
}

export function applyStoredAvatar(root: ParentNode = document): void {
  const avatar = readStoredAvatar();
  root
    .querySelectorAll<HTMLElement>('[data-nako-profile-avatar="local"]')
    .forEach((element) => applyAvatarToElement(element, avatar));
}

function fileToDataUrl(file: File, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
    };
    const cancel = () => {
      cleanup();
      reader.abort();
      reject(avatarCancelled('avatar.read'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reader.abort();
      reject(identityError(IDENTITY_ERRORS.avatarTimeout, '头像读取超时，请重试。', 'avatar.read', 504));
    }, 15_000);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    reader.onerror = () => {
      cleanup();
      reject(identityError(IDENTITY_ERRORS.avatarRead, '头像文件读取失败。', 'avatar.read'));
    };
    reader.onload = () => {
      cleanup();
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    try {
      reader.readAsDataURL(file);
    } catch (error) {
      cleanup();
      reject(identityError(IDENTITY_ERRORS.avatarRead, '头像文件读取失败。', 'avatar.read', 500, error));
    }
  });
}

export function installLocalProfile(): StableLocalProfileAdapter {
  if (browserServices.__NAKO_LOCAL_PROFILE__) return browserServices.__NAKO_LOCAL_PROFILE__;
  const refresh = () => applyStoredAvatar();
  let pendingRead: AbortController | null = null;
  const cancelRead = () => {
    pendingRead?.abort();
    pendingRead = null;
  };
  const adapter: StableLocalProfileAdapter = {
    getAvatar: readStoredAvatar,
    setAvatarDataUrl(dataUrl) {
      cancelRead();
      if (!isAllowedAvatarDataUrl(dataUrl)) throw identityError(IDENTITY_ERRORS.avatarInvalid, '请选择 PNG、JPEG 或 WebP 图片。', 'avatar.set', 415);
      if (new Blob([dataUrl]).size > MAX_AVATAR_BYTES * 1.4) {
        throw identityError(IDENTITY_ERRORS.avatarTooLarge, '头像图片不能超过 2 MB。', 'avatar.set', 413);
      }
      preferenceStorage().setItem(AVATAR_STORAGE_KEY, dataUrl);
      refresh();
    },
    async setAvatarFile(file, options = {}) {
      cancelRead();
      if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
        throw identityError(IDENTITY_ERRORS.avatarInvalid, '请选择 PNG、JPEG 或 WebP 图片。', 'avatar.set', 415);
      }
      if (file.size > MAX_AVATAR_BYTES) throw identityError(IDENTITY_ERRORS.avatarTooLarge, '头像图片不能超过 2 MB。', 'avatar.set', 413);
      const controller = new AbortController();
      pendingRead = controller;
      const cancel = () => controller.abort();
      options.signal?.addEventListener('abort', cancel, { once: true });
      if (options.signal?.aborted) cancel();
      try {
        const dataUrl = await fileToDataUrl(file, controller.signal);
        if (controller.signal.aborted || pendingRead !== controller)
          throw avatarCancelled('avatar.set');
        pendingRead = null;
        this.setAvatarDataUrl(dataUrl);
        return dataUrl;
      } finally {
        options.signal?.removeEventListener('abort', cancel);
        if (pendingRead === controller) pendingRead = null;
      }
    },
    clearAvatar() {
      cancelRead();
      preferenceStorage().removeItem(AVATAR_STORAGE_KEY);
      refresh();
    },
    refresh,
  };

  profileObservation = observeStableEnhancement((records) => {
    if (
      records.some((record) =>
        [...record.addedNodes].some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches('[data-nako-profile-avatar="local"]') ||
              node.querySelector('[data-nako-profile-avatar="local"]')),
        ),
      )
    ) {
      refresh();
    }
  });
  browserServices.__NAKO_LOCAL_PROFILE__ = Object.freeze(adapter);
  refresh();
  return browserServices.__NAKO_LOCAL_PROFILE__;
}

let profileObservation: (() => void) | null = null;

export function uninstallLocalProfileForTests() {
  profileObservation?.();
  profileObservation = null;
  delete browserServices.__NAKO_LOCAL_PROFILE__;
}
import { observeStableEnhancement } from '../../../kernel/ui/enhancementLifecycle';
