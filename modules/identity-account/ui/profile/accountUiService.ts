import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { AccountUiService } from '../../../contracts/browserCapabilities';
import { applyStoredAvatar, installLocalProfile } from './localProfile';
import { CanvasAppearanceSettings } from '../appearance/CanvasAppearanceSettings';

export function createAccountUiService(): AccountUiService {
  const profile = installLocalProfile();
  return Object.freeze({
    applyAvatar: applyStoredAvatar,
    setAvatarFile: (file: File, options?: { signal?: AbortSignal }) => profile.setAvatarFile(file, options),
    clearAvatar: () => profile.clearAvatar(),
    mountAppearance(host: HTMLElement) {
      const root = createRoot(host);
      root.render(createElement(CanvasAppearanceSettings));
      return () => root.unmount();
    },
  });
}
