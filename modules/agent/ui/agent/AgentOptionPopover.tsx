import { useEffect, useId, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import './agentComposerOptions.css';

function useOptionPopover(disabled: boolean) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"], select:not(:disabled), [role="switch"]:not(:disabled)')?.focus();
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return { open, setOpen, root, trigger, close };
}

function navigateMenu(event: KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)')];
  if (!items.length) return;
  event.preventDefault();
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
    : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
}

export function AgentOptionPopover({ label, title, icon: Icon, disabled, menu, children }: {
  label: string; title: string; icon: LucideIcon; disabled: boolean; menu?: boolean;
  children(close: () => void): ReactNode;
}) {
  const { open, setOpen, root, trigger, close } = useOptionPopover(disabled);
  const id = useId();
  return <div className="relative shrink-0" ref={root}>
    <button ref={trigger} type="button" aria-label={label} title={title} disabled={disabled}
      aria-expanded={open} aria-haspopup={menu ? 'menu' : 'dialog'} aria-controls={open ? id : undefined}
      className="nako-agent-composer-tool" onClick={() => setOpen(!open)}>
      <Icon size={18} aria-hidden="true" />
    </button>
    {open && <div id={id} role={menu ? 'menu' : 'dialog'} aria-label={label}
      className="nako-agent-option-popover" onKeyDown={menu ? navigateMenu : undefined}>
      {children(close)}
    </div>}
  </div>;
}
