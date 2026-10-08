import { canvasProjectUi } from '../projectUiServices';

export type SettingsSection = 'models' | 'local-service' | 'profile';

/** Open the existing React settings panel, then select its source-owned section. */
export function openSettings(section: SettingsSection = 'models') {
  const subscription: { stop?: () => void } = {};
  let selected = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const select = () => {
    const button = document.querySelector<HTMLButtonElement>(
      `[data-nako-settings="true"] button[data-nako-settings-section="${section}"]`,
    );
    if (!button || selected) return;
    selected = true;
    button.click();
    button.focus();
    subscription.stop?.();
    if (timer) clearTimeout(timer);
  };
  window.dispatchEvent(new CustomEvent('nako:open-settings'));
  subscription.stop = canvasProjectUi().observeStableEnhancement(select);
  if (selected) subscription.stop();
  else timer = setTimeout(() => subscription.stop?.(), 5_000);
}
