import type { AgentSkill } from './skillClient';
const MENU_ATTRIBUTE = 'data-nako-skill-menu';
function setReactTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(value.length, value.length);
}

function currentSlashQuery(textarea: HTMLTextAreaElement) {
  const cursor = textarea.selectionStart ?? textarea.value.length;
  const prefix = textarea.value.slice(0, cursor);
  const match = prefix.match(/(?:^|\s)\/([a-z0-9-]*)$/i);
  return match
    ? { query: match[1].toLowerCase(), start: cursor - match[1].length - 1, end: cursor }
    : null;
}

/** Owns the portal and every pending lookup for one focused composer. */
export class SkillSlashMenu {
  private disposed = false;
  private menu: HTMLElement | null = null;
  private owner: HTMLTextAreaElement | null = null;
  private activeIndex = 0;
  private menuSkills: AgentSkill[] = [];
  private requestId = 0;
  private getSkills: () => Promise<AgentSkill[]>;
  private selectSkill: (skill: AgentSkill) => void;
  private observer = new MutationObserver(() => {
    if (
      this.owner &&
      (!this.owner.isConnected ||
        document.activeElement !== this.owner ||
        this.owner.closest('[hidden], [aria-hidden="true"]'))
    )
      this.close();
  });
  constructor(getSkills: () => Promise<AgentSkill[]>, selectSkill: (skill: AgentSkill) => void) {
    this.getSkills = getSkills;
    this.selectSkill = selectSkill;
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'aria-hidden'],
    });
    document.addEventListener('input', this.onInput, true);
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('focusout', this.onFocusOut, true);
    document.addEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.close);
  }
  close = () => {
    this.requestId++;
    this.owner = null;
    this.menu?.remove();
    this.menu = null;
    this.menuSkills = [];
    this.activeIndex = 0;
  };
  dispose() {
    this.disposed = true;
    this.close();
    this.observer.disconnect();
    document.removeEventListener('input', this.onInput, true);
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('pointerdown', this.onPointerDown, true);
    document.removeEventListener('focusout', this.onFocusOut, true);
    document.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.close);
  }
  private onPointerDown = (event: Event) => {
    if (event.target !== this.owner && !this.menu?.contains(event.target as Node)) this.close();
  };
  private onFocusOut = (event: FocusEvent) => {
    if (event.target === this.owner) this.close();
  };
  private onScroll = (event: Event) => {
    if (!this.menu?.contains(event.target as Node)) this.close();
  };
  private onInput = (event: Event) => {
    if (
      event.target instanceof HTMLTextAreaElement &&
      event.target.matches('[data-nako-agent-composer]')
    )
      void this.render(event.target);
  };
  private onKeyDown = (event: KeyboardEvent) => {
    const textarea = event.target;
    if (!(textarea instanceof HTMLTextAreaElement) || textarea !== this.owner) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (!this.menu || !this.menuSkills.length || event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      this.activeIndex =
        (this.activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + this.menuSkills.length) %
        this.menuSkills.length;
      this.updateActiveOption();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.choose(textarea, this.menuSkills[this.activeIndex]);
    }
  };
  private updateActiveOption() {
    if (!this.menu) return;
    const options = [...this.menu.querySelectorAll<HTMLElement>('[role="option"]')];
    options.forEach((option, index) => {
      const active = index === this.activeIndex;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', String(active));
    });
    const active = options[this.activeIndex];
    if (active) this.menu.setAttribute('aria-activedescendant', active.id);
    active?.scrollIntoView?.({ block: 'nearest' });
  }
  choose(textarea: HTMLTextAreaElement, skill: AgentSkill) {
    const slash = currentSlashQuery(textarea);
    if (!slash) return;
    // The menu is a selection control, not text inserted into the next model turn.
    // Consume only its query so a later explicit picker choice cannot be shadowed
    // by an old /slug left in the user's otherwise unchanged draft.
    const next = `${textarea.value.slice(0, slash.start)}${textarea.value.slice(slash.end)}`;
    setReactTextareaValue(textarea, next);
    this.close();
    this.selectSkill(skill);
  }
  async render(textarea: HTMLTextAreaElement) {
    const request = ++this.requestId;
    this.owner = textarea;
    const slash = currentSlashQuery(textarea);
    if (!slash) {
      this.close();
      return;
    }
    let available: AgentSkill[];
    try {
      available = await this.getSkills();
    } catch {
      if (request === this.requestId) this.close();
      return;
    }
    const skills = available.filter(
      (skill) =>
        !slash.query ||
        skill.slug.includes(slash.query) ||
        skill.name.toLowerCase().includes(slash.query),
    );
    if (
      this.disposed ||
      request !== this.requestId ||
      !textarea.isConnected ||
      document.activeElement !== textarea ||
      currentSlashQuery(textarea)?.query !== slash.query
    )
      return;
    const requestedActiveIndex = this.activeIndex;
    this.close();
    if (!skills.length) return;
    this.owner = textarea;
    this.menuSkills = skills;
    this.activeIndex = Math.min(requestedActiveIndex, skills.length - 1);
    this.menu = document.createElement('div');
    this.menu.className = 'nako-skill-menu';
    this.menu.setAttribute(MENU_ATTRIBUTE, 'true');
    this.menu.setAttribute('role', 'listbox');
    const rect = textarea.getBoundingClientRect();
    this.menu.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - 372))}px`;
    this.menu.style.maxHeight = `${Math.max(48, Math.min(300, rect.top - 20))}px`;
    skills.forEach((skill, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', String(index === this.activeIndex));
      option.id = `nako-skill-option-${this.requestId}-${index}`;
      option.classList.toggle('is-active', index === this.activeIndex);
      const name = document.createElement('strong');
      name.textContent = skill.name;
      name.title = skill.name;
      option.append(name);
      option.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.choose(textarea, skill);
      });
      this.menu?.append(option);
    });
    document.body.append(this.menu);
    this.menu.style.top = `${Math.max(12, rect.top - this.menu.getBoundingClientRect().height - 8)}px`;
    this.menu.setAttribute('aria-activedescendant', `nako-skill-option-${this.requestId}-${this.activeIndex}`);
  }
}
