// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { installSkillCommunity } from '../modules/agent/ui/skills/skillCommunity';
import { installDramaConversationShortcut } from '../modules/agent/ui/agent/dramaConversationShortcut';
import { SKILL_CATALOG_CHANGED } from '../modules/contracts/skillCatalog.js';
import { skillManagerCard } from '../modules/agent/ui/skills/skillManagerCards';
const disposers = [];
afterEach(() => { disposers.splice(0).reverse().forEach(close => close()); document.body.replaceChildren(); vi.restoreAllMocks(); });
const records = () => [
  { slug: 'builtin', source: 'official', name: '视频技能', description: '', category: '视频制作', fileCount: 1 },
  { slug: 'custom', source: 'local', name: '文本技能', description: '', category: '文本创作', fileCount: 1 },
];
function client() {
  let catalog = records();
  return { list: vi.fn(async () => structuredClone(catalog)),
    remove: vi.fn(async slug => { catalog = catalog.filter(skill => skill.slug !== slug); }),
    updateCategory: vi.fn(async (slug, category) => { catalog.find(skill => skill.slug === slug).category = category; }),
    importFolders: vi.fn(async () => []), mentions: vi.fn(),
    set(value) { catalog = value; },
  };
}
it('shows all sources together, filters by category and supports deletion and category changes', async () => {
  const api = client(); disposers.push(installSkillCommunity(api));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('文本技能');
  expect(screen.getByText('视频技能')).toBeTruthy();
  expect(screen.queryByText('官方推荐')).toBeNull(); expect(screen.queryByText('我的 SKILL')).toBeNull();
  fireEvent.change(screen.getByLabelText('筛选 SKILL 分类'), { target: { value: '文本创作' } });
  expect(screen.queryByText('视频技能')).toBeNull();
  fireEvent.change(screen.getByLabelText('文本技能分类'), { target: { value: '脚本创作' } });
  fireEvent.click(screen.getByText('保存分类'));
  await waitFor(() => expect(api.updateCategory).toHaveBeenCalledWith('custom', '脚本创作'));
  await screen.findByText('分类已保存');
  await waitFor(() => expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('false'));
  fireEvent.change(screen.getByLabelText('筛选 SKILL 分类'), { target: { value: '' } });
  const confirm = vi.spyOn(window, 'confirm');
  fireEvent.click(screen.getByLabelText('删除 视频技能')); expect(api.remove).not.toHaveBeenCalled();
  fireEvent.keyDown(document.activeElement, { key: 'Escape' });
  expect(document.activeElement).toBe(screen.getByLabelText('删除 视频技能'));
  fireEvent.click(screen.getByLabelText('删除 视频技能'));
  fireEvent.click(screen.getByRole('button', { name: '确认删除' }));
  await waitFor(() => expect(screen.queryByText('视频技能')).toBeNull());
  expect(api.remove).toHaveBeenCalledWith('builtin');
  expect(confirm).not.toHaveBeenCalled();
});
it('opens a single Skill import form and imports edited metadata with an optional cover', async () => {
  const api = client(); disposers.push(installSkillCommunity(api));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('文本技能');
  expect(screen.getByRole('button', { name: '导入 Skill' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '导入文件' })).toBeNull();
  expect(screen.queryByRole('button', { name: '导入文件夹' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '导入 Skill' }));
  await screen.findByRole('dialog', { name: '导入 Skill' });
  const file = new File(['---\nname: Original\ndescription: Short description\n---\n# Skill body'], 'SKILL.md');
  fireEvent.change(screen.getByLabelText('选择 SKILL.md'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText('Skill 内容').value).toContain('# Skill body'));
  fireEvent.change(screen.getByLabelText('Skill 名称'), { target: { value: 'Edited skill' } });
  fireEvent.change(screen.getByLabelText('简介'), { target: { value: 'Edited summary' } });
  fireEvent.change(screen.getByLabelText('分类'), { target: { value: '动画' } });
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cover');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const cover = new File(['image'], 'cover.webp', { type: 'image/webp' });
  fireEvent.change(screen.getByLabelText('选择封面图片'), { target: { files: [cover] } });
  expect(createUrl).toHaveBeenCalledWith(cover);
  expect(screen.getByAltText('自定义 Skill 封面').getAttribute('src')).toBe('blob:cover');
  fireEvent.click(document.querySelector('.nako-skill-import-dialog button.is-primary'));
  await waitFor(() => expect(api.importFolders).toHaveBeenCalled());
  const [uploaded, selectedCategory] = api.importFolders.mock.calls[0];
  expect(selectedCategory).toBe('动画');
  expect(uploaded.map(item => item.webkitRelativePath || item.name)).toEqual(['SKILL.md', 'cover.webp']);
  const text = await uploaded[0].text();
  expect(text).toContain('name: "Edited skill"');
  expect(text).toContain('description: "Edited summary"');
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '导入 Skill' })).toBeNull());
  expect(screen.queryByText('添加预置')).toBeNull();
});
it('keeps a failed deletion visible and reports the server error', async () => {
  const api = client(); api.remove.mockRejectedValue(new Error('存储暂不可用'));
  disposers.push(installSkillCommunity(api)); window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('文本技能'); fireEvent.click(screen.getByLabelText('删除 文本技能'));
  fireEvent.click(screen.getByRole('button', { name: '确认删除' }));
  await screen.findByText('存储暂不可用'); expect(screen.getByText('文本技能')).toBeTruthy();
});
it('uses identical image card markup for bundled and imported skills', () => {
  const api = client(), options = { client: api, select: vi.fn(), mutate: vi.fn() };
  const data = { ...records()[0], slug: 'minimax-drama-prompt' };
  const bundled = skillManagerCard(data, options);
  const imported = skillManagerCard({ ...data, source: 'local' }, options);
  expect(bundled.outerHTML).toBe(imported.outerHTML);
  expect(bundled.querySelector('img').getAttribute('src')).toBe('/share/Default_cover.png');
  expect(bundled.querySelector('[data-nako-skill-guide]')).toBeNull();
  expect(bundled.querySelector('.nako-skill-name').textContent).toBe('视频技能');
  expect(bundled.querySelector('.nako-skill-description').textContent).toBe('暂无简介');
  const withCover = skillManagerCard({ ...data, coverUrl: '/api/agent-skills/video/cover' }, options);
  expect(withCover.querySelector('.nako-skill-cover').getAttribute('src')).toBe('/api/agent-skills/video/cover');
});
it('opens a detail view before selecting a Skill and omits like actions', async () => {
  const api = client(), select = vi.fn(); disposers.push(installSkillCommunity(api));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('文本技能');
  fireEvent.click(document.querySelector('[data-nako-skill="custom"] .nako-skill-card'));
  await screen.findByRole('dialog', { name: '文本技能' });
  expect(screen.queryByText('喜欢')).toBeNull();
  expect(screen.queryByText('对话指令')).toBeNull();
  expect(screen.queryByText('/custom')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '添加到对话' }));
  await waitFor(() => expect(document.querySelector('[data-nako-skill-community]')).toBeNull());
});
it('restores replaced inputs after save and releases modal focus after repeated open and close', async () => {
  const launcher = document.createElement('input'); document.body.append(launcher); launcher.focus();
  const api = client(); disposers.push(installSkillCommunity(api));
  for (let i = 0; i < 2; i++) {
    window.dispatchEvent(new Event('nako:open-skill-community'));
    await screen.findByText('文本技能');
    const category = screen.getByLabelText('文本技能分类'); category.focus();
    fireEvent.change(category, { target: { value: '新分类' } });
    fireEvent.click(document.querySelector('[data-nako-skill="custom"] .nako-skill-card-controls button'));
    await waitFor(() => expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('false'));
    expect(document.activeElement).toBe(screen.getByLabelText('文本技能分类'));
    fireEvent.click(screen.getByLabelText('关闭 SKILL 管理'));
    launcher.focus(); expect(document.activeElement).toBe(launcher); expect(launcher.closest('[inert]')).toBeNull();
  }
});
it('does not steal text input focus when a removed selected skill finishes cancelling in the background', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); let finish;
  const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: false, restoring: false };
  const conversation = { snapshot: () => state, subscribe: () => () => {}, dispose: vi.fn(),
    selectSkill: vi.fn(() => new Promise(resolve => { finish = () => { state.selectedSkill = null; resolve(true); }; })) };
  disposers.push(installDramaConversationShortcut({ projectId: () => 'test' }, conversation, api));
  await waitFor(() => expect(document.querySelector('[data-nako-skill="custom"]')).toBeTruthy());
  disposers.push(installSkillCommunity(api)); window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByRole('dialog');
  api.set([records()[0]]); window.dispatchEvent(new Event(SKILL_CATALOG_CHANGED));
  await waitFor(() => expect(conversation.selectSkill).toHaveBeenCalledWith(null));
  const search = screen.getByLabelText('搜索 SKILL'); search.focus();
  finish();
  await waitFor(() => expect(document.querySelector('[data-nako-agent-selected-skill]').hidden).toBe(true));
  expect(document.activeElement).toBe(search);
});
it('shows local skills in the conversation picker and refreshes on catalog changes', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: false, restoring: false };
  const conversation = { snapshot: () => state, subscribe: () => () => {}, dispose: vi.fn(),
    selectSkill: vi.fn(async slug => { state.selectedSkill = slug ? { slug, source: 'local' } : null; return true; }) };
  disposers.push(installDramaConversationShortcut({ projectId: () => 'test' }, conversation, api));
  await waitFor(() => expect(document.querySelector('[data-nako-skill="custom"]')).toBeTruthy());
  expect(document.querySelector('[data-nako-skill="custom"]').getAttribute('aria-pressed')).toBe('true');
  fireEvent.change(screen.getByLabelText('技能分类'), { target: { value: '文本创作' } });
  expect(document.querySelector('[data-nako-skill="builtin"]')).toBeNull();
  api.set([records()[0]]); window.dispatchEvent(new Event(SKILL_CATALOG_CHANGED));
  await waitFor(() => expect(conversation.selectSkill).toHaveBeenCalledWith(null));
  expect(document.querySelector('[data-nako-skill="custom"]')).toBeNull();
});
it('defers clearing a removed skill until idle and does not retry a failed cancellation in a loop', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); api.set([records()[0]]);
  const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: true, restoring: false };
  let notify;
  const conversation = { snapshot: () => state, subscribe: listener => { notify = listener; return () => {}; }, dispose: vi.fn(),
    selectSkill: vi.fn(async () => { throw Error('后端不可用'); }) };
  disposers.push(installDramaConversationShortcut({ projectId: () => 'test' }, conversation, api));
  await waitFor(() => expect(document.querySelector('[data-nako-skill="builtin"]')).toBeTruthy());
  expect(conversation.selectSkill).not.toHaveBeenCalled();
  state.busy = false; notify();
  await screen.findByText('后端不可用');
  for (let i = 0; i < 3; i++) notify();
  expect(conversation.selectSkill).toHaveBeenCalledTimes(1);
});
