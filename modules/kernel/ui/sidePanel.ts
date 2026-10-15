/** Non-modal libraries keep the original prompt editable. */
export function activateSidePanel(surface: HTMLElement, dismiss: () => void) {
  const previous = document.activeElement as HTMLElement | null;
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault(); event.stopImmediatePropagation(); dismiss();
  };
  window.addEventListener('keydown', onKey, true);
  return () => {
    window.removeEventListener('keydown', onKey, true);
    if (surface.contains(document.activeElement) && previous?.isConnected) previous.focus({ preventScroll: true });
  };
}

