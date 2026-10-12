// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import { installSkillCommunity } from '../modules/agent/ui/skills/skillCommunity';
import { installDramaConversationShortcut } from '../modules/agent/ui/agent/dramaConversationShortcut';
import { SKILL_CATALOG_CHANGED } from '../modules/contracts/skillCatalog.js';
import { skillManagerCard } from '../modules/agent/ui/skills/skillManagerCards';
import { createAgentSkillPicker } from '../modules/agent/ui/agent/AgentSkillPicker';
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
it('separates official presets and user custom skills while keeping category and search filters', async () => {
  const api = client(); disposers.push(installSkillCommunity(api));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('视频技能');
  expect(screen.getByText('视频技能')).toBeTruthy();
  expect(screen.queryByText('文本技能')).toBeNull();
  expect(screen.getByRole('button', { name: '官方预设' }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: '用户自定义' }));
  expect(screen.getByText('文本技能')).toBeTruthy();
  expect(screen.queryByText('视频技能')).toBeNull();
  expect(screen.queryByText('官方推荐')).toBeNull(); expect(screen.queryByText('我的技能')).toBeNull();
  expect(screen.queryByLabelText('文本技能分类')).toBeNull();
  expect(screen.queryByText('保存分类')).toBeNull();
  expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  fireEvent.change(screen.getByLabelText('筛选技能分类'), { target: { value: '文本创作' } });
  expect(screen.queryByText('视频技能')).toBeNull();
  fireEvent.change(screen.getByLabelText('筛选技能分类'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: '官方预设' }));
  fireEvent.input(screen.getByLabelText('搜索技能'), { target: { value: '视频' } });
  expect(screen.getByText('视频技能')).toBeTruthy();
  expect(screen.queryByText('文本技能')).toBeNull();
  expect(api.updateCategory).not.toHaveBeenCalled();
  expect(api.remove).not.toHaveBeenCalled();
});
it('opens a single Skill import form and imports edited metadata with an optional cover', async () => {
  const api = client(); disposers.push(installSkillCommunity(api));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByText('视频技能');
  expect(screen.getByRole('button', { name: '导入技能' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '导入文件' })).toBeNull();
  expect(screen.queryByRole('button', { name: '导入文件夹' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '导入技能' }));
  await screen.findByRole('dialog', { name: '导入技能' });
  const file = new File(['---\nname: Original\ndescription: Short description\n---\n# Skill body'], 'SKILL.md');
  fireEvent.change(screen.getByLabelText('选择 SKILL.md'), { target: { files: [file] } });
  await waitFor(() => expect(screen.getByLabelText('技能内容').value).toContain('# Skill body'));
  const metadata = new File([JSON.stringify({ name: '目录名称', description: '目录简介', category: '图像设计' })], 'metadata.json');
  fireEvent.change(screen.getByLabelText('选择技能文件夹'), { target: { files: [file, metadata] } });
  await waitFor(() => expect(screen.getByLabelText('技能名称').value).toBe('目录名称'));
  expect(screen.getByLabelText('简介').value).toBe('目录简介');
  expect(screen.getByLabelText('分类').value).toBe('图像设计');
  fireEvent.change(screen.getByLabelText('技能名称'), { target: { value: 'Edited skill' } });
  fireEvent.change(screen.getByLabelText('简介'), { target: { value: 'Edited summary' } });
  fireEvent.change(screen.getByLabelText('分类'), { target: { value: '动画' } });
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cover');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  const cover = new File(['GIF89a'], 'cover.gif', { type: 'image/gif' });
  expect(screen.getByLabelText('选择封面图片').accept).toContain('image/gif');
  fireEvent.change(screen.getByLabelText('选择封面图片'), { target: { files: [cover] } });
  expect(createUrl).toHaveBeenCalledWith(cover);
  expect(screen.getByAltText('自定义技能封面').getAttribute('src')).toBe('blob:cover');
  fireEvent.click(document.querySelector('.nako-skill-import-dialog button.is-primary'));
  await waitFor(() => expect(api.importFolders).toHaveBeenCalled());
  const [uploaded, selectedCategory] = api.importFolders.mock.calls[0];
  expect(selectedCategory).toBe('动画');
  expect(uploaded.map(item => item.webkitRelativePath || item.name)).toEqual(['SKILL.md', 'metadata.json', 'cover.gif']);
  const text = await uploaded[0].text();
  expect(text).toContain('name: Original');
  expect(text).toContain('description: Short description');
  expect(JSON.parse(await uploaded[1].text())).toEqual({ name: 'Edited skill', description: 'Edited summary', category: '动画' });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '导入技能' })).toBeNull());
  expect(screen.queryByText('添加预置')).toBeNull();
});
it('uses identical image card markup for bundled and imported skills', () => {
  const options = { select: vi.fn() };
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
  await screen.findByText('视频技能');
  fireEvent.click(screen.getByRole('button', { name: '用户自定义' }));
  await screen.findByText('文本技能');
  fireEvent.click(document.querySelector('[data-nako-skill="custom"] .nako-skill-card'));
  await screen.findByRole('dialog', { name: '文本技能' });
  expect(screen.queryByText('喜欢')).toBeNull();
  expect(screen.queryByText('对话指令')).toBeNull();
  expect(screen.queryByText('/custom')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '使用技能' }));
  await waitFor(() => expect(document.querySelector('[data-nako-skill-community]')).toBeNull());
});
it('releases modal focus after repeated open and close', async () => {
  const launcher = document.createElement('input'); document.body.append(launcher); launcher.focus();
  const api = client(); disposers.push(installSkillCommunity(api));
  for (let i = 0; i < 2; i++) {
    window.dispatchEvent(new Event('nako:open-skill-community'));
    await screen.findByText('视频技能');
    fireEvent.click(screen.getByLabelText('关闭技能管理'));
    expect(document.activeElement).toBe(launcher); expect(launcher.closest('[inert]')).toBeNull();
  }
});
it('does not steal text input focus when a removed selected skill finishes cancelling in the background', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); let finish;
  const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: false, restoring: false, ready: true };
  const conversation = { snapshot: () => state, subscribe: () => () => {}, dispose: vi.fn(),
    selectSkill: vi.fn(() => new Promise(resolve => { finish = () => { state.selectedSkill = null; resolve(true); }; })) };
  disposers.push(installDramaConversationShortcut({ projectId: () => 'test' }, conversation, api));
  await waitFor(() => expect(document.querySelector('[data-nako-skill="custom"]')).toBeTruthy());
  disposers.push(installSkillCommunity(api)); window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByRole('dialog');
  api.set([records()[0]]); window.dispatchEvent(new Event(SKILL_CATALOG_CHANGED));
  await waitFor(() => expect(conversation.selectSkill).toHaveBeenCalledWith(null));
  const search = within(screen.getByRole('dialog', { name: '技能管理' })).getByLabelText('搜索技能'); search.focus();
  finish();
  await waitFor(() => expect(document.querySelector('[data-nako-agent-selected-skill]').hidden).toBe(true));
  expect(document.activeElement).toBe(search);
});
it('shows local skills in the conversation picker and refreshes on catalog changes', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: false, restoring: false, ready: true };
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
it('previews skill covers without selecting and uses the existing detail confirmation', async () => {
  const useSkill = vi.fn(), beforeDetails = vi.fn();
  const picker = createAgentSkillPicker(useSkill, beforeDetails); disposers.push(() => picker.dispose());
  const skill = { ...records()[0], description: '参考角色和脚本规划分镜', coverUrl: '/api/agent-skills/builtin/cover' };
  const row = picker.createRow(skill, false, false); document.body.append(row);
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ left: 700, right: 1000, top: 100 });
  fireEvent.mouseEnter(row);
  const preview = screen.getByRole('tooltip');
  expect(preview.querySelector('img').getAttribute('src')).toBe(skill.coverUrl);
  expect(Number.parseFloat(preview.style.left)).toBeLessThan(700);
  expect(useSkill).not.toHaveBeenCalled();
  fireEvent.mouseLeave(row); expect(screen.queryByRole('tooltip')).toBeNull();
  row.querySelector('button').focus(); expect(screen.getByRole('tooltip')).toBeTruthy();
  fireEvent.scroll(window); expect(screen.queryByRole('tooltip')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '视频技能详情' }));
  expect(beforeDetails).toHaveBeenCalledOnce();
  expect(screen.getByRole('dialog', { name: '视频技能' })).toBeTruthy();
  expect(useSkill).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '使用技能' }));
  expect(useSkill).toHaveBeenCalledExactlyOnceWith('builtin');
  expect(screen.queryByRole('dialog')).toBeNull();
  picker.dispose(); expect(screen.queryByRole('tooltip')).toBeNull();
});
it('opens more skills and collapses the compact picker on outside click without selecting', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(), onMore = vi.fn();
  const state = { selectedSkill: null, projectId: 'test', sessionId: 'session', busy: false, restoring: false, ready: true };
  const conversation = { snapshot: () => state, subscribe: () => () => {}, dispose: vi.fn(), selectSkill: vi.fn() };
  disposers.push(installDramaConversationShortcut({ projectId: () => 'test' }, conversation, api));
  window.addEventListener('nako:open-skill-community', onMore);
  disposers.push(() => window.removeEventListener('nako:open-skill-community', onMore));
  const toggle = screen.getByRole('button', { name: '技能库' });
  fireEvent.click(toggle); await screen.findByText('文本技能');
  const root = document.querySelector('[data-nako-agent-skills]');
  expect(root.dataset.expanded).toBe('true');
  fireEvent.mouseDown(document.querySelector('textarea')); expect(root.dataset.expanded).toBe('false');
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole('button', { name: /查看更多/ }));
  expect(onMore).toHaveBeenCalledOnce();
  expect(root.dataset.expanded).toBe('false');
  expect(conversation.selectSkill).not.toHaveBeenCalled();
});
it('defers clearing a removed skill until idle and does not retry a failed cancellation in a loop', async () => {
  document.body.innerHTML = '<section data-nako-agent-panel><div data-nako-agent-welcome-skills-slot></div><textarea data-nako-agent-composer></textarea></section>';
  const api = client(); api.set([records()[0]]);
  const state = { selectedSkill: { slug: 'custom', source: 'local' }, projectId: 'test', sessionId: 'session', busy: true, restoring: false, ready: true };
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
