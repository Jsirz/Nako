/** Restore replaced controls only when focus was lost; never steal a user's newer focus. */
export function restoreSkillManagerFocus(dialog: HTMLElement, fallback: HTMLElement) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const label = previous?.getAttribute('aria-label');
  const slug = previous?.closest<HTMLElement>('[data-nako-skill]')?.dataset.nakoSkill;
  return () => {
    if (!dialog.isConnected) return;
    const current = document.activeElement;
    if (current instanceof HTMLElement && dialog.contains(current)
      && current !== previous && !current.matches(':disabled') && !current.closest('[hidden], [inert]')) return;
    const replacement = label && [...dialog.querySelectorAll<HTMLElement>('[aria-label]')]
      .find(node => node.getAttribute('aria-label') === label);
    const category = slug && [...dialog.querySelectorAll<HTMLElement>('[data-nako-skill]')]
      .find(node => node.dataset.nakoSkill === slug)?.querySelector<HTMLInputElement>('input');
    const target = previous?.isConnected ? previous : replacement || category || fallback;
    if (!target.closest('[hidden], [inert]') && !target.matches(':disabled')) target.focus({ preventScroll: true });
  };
}
