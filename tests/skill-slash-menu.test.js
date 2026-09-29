// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { installSkillCommunity } from '../modules/agent/ui/skills/skillCommunity';
let dispose;
afterEach(() => { dispose?.(); document.body.replaceChildren(); });
const skills = [{ name: '剧本文戏', slug: 'very-long-drama-skill-command', category: '视频制作' }];
function setup(list = async () => skills) {
  dispose = installSkillCommunity({ list });
  const panel = document.createElement('section'), input = document.createElement('textarea');
  input.setAttribute('data-nako-agent-composer', ''); panel.append(input); document.body.append(panel);
  input.focus(); fireEvent.input(input, { target: { value: '/' } });
  return { panel, input };
}
it('removes the slash menu when the Agent panel is removed', async () => {
  const { panel } = setup(); await screen.findByRole('listbox');
  panel.remove(); await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
});
it.each(['escape', 'outside', 'blur', 'remove'])('cancels pending menu loading on %s', async action => {
  let resolve;
  const { input, panel } = setup(() => new Promise(done => { resolve = done; }));
  if (action === 'escape') fireEvent.keyDown(input, { key: 'Escape' });
  if (action === 'outside') fireEvent.pointerDown(document.body);
  if (action === 'blur') input.blur();
  if (action === 'remove') panel.remove();
  resolve(skills); await new Promise(done => setTimeout(done, 0));
  expect(screen.queryByRole('listbox')).toBeNull();
});
it('selects by keyboard and consumes only the slash query', async () => {
  const listener = vi.fn(); window.addEventListener('nako:select-agent-skill', listener);
  try {
    const { input } = setup(); await screen.findByRole('listbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe(''); expect(listener).toHaveBeenCalledOnce();
    expect(screen.queryByRole('listbox')).toBeNull(); expect(document.activeElement).toBe(input);
  } finally { window.removeEventListener('nako:select-agent-skill', listener); }
});

it('does not let a failed lookup from an old composer close a newer menu', async () => {
  const pending = [];
  setup(() => new Promise((resolve, reject) => pending.push({ resolve, reject })));
  const second = document.createElement('textarea');
  second.setAttribute('data-nako-agent-composer', ''); document.body.append(second); second.focus();
  fireEvent.input(second, { target: { value: '/' } });
  pending[1].resolve(skills); await screen.findByRole('listbox');
  pending[0].reject(new Error('old network request failed'));
  await new Promise(done => setTimeout(done, 0));
  expect(screen.getByRole('listbox')).toBeTruthy();
  fireEvent.keyDown(second, { key: 'Enter' }); expect(second.value).toBe('');
});

it('moves keyboard highlight in place and scrolls the selected option into view', async () => {
  const list = vi.fn(async () => ['first', 'second', 'third'].map(slug => ({ name: slug, slug })));
  const { input } = setup(list);
  const menu = await screen.findByRole('listbox');
  const options = screen.getAllByRole('option');
  options.forEach(option => { option.scrollIntoView = vi.fn(); });
  for (const [key, selected] of [['ArrowDown', 1], ['ArrowDown', 2], ['ArrowDown', 0],
    ['ArrowUp', 2], ['ArrowUp', 1]]) {
    fireEvent.keyDown(input, { key });
    expect(screen.getByRole('listbox')).toBe(menu);
    expect(menu.querySelectorAll('.is-active')).toHaveLength(1);
    expect(options[selected].classList.contains('is-active')).toBe(true);
    expect(options[selected].getAttribute('aria-selected')).toBe('true');
    expect(menu.getAttribute('aria-activedescendant')).toBe(options[selected].id);
    expect(options[selected].scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
  }
  expect(list).toHaveBeenCalledOnce();
  fireEvent.scroll(menu);
  expect(screen.getByRole('listbox')).toBe(menu);
  const listener = vi.fn();
  window.addEventListener('nako:select-agent-skill', listener);
  try {
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(listener).toHaveBeenCalledOnce();
    expect(screen.queryByRole('listbox')).toBeNull();
  } finally { window.removeEventListener('nako:select-agent-skill', listener); }
});
