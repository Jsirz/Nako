// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/dom';
import { openSkillEditDialog } from '../modules/agent/ui/skills/skillEditDialog';
import { openSkillDetailView } from '../modules/agent/ui/skills/skillDetailView';
import { installSkillCommunity } from '../modules/agent/ui/skills/skillCommunity';
import { createAgentSkillClient } from '../modules/agent/ui/skills/skillClient';
import { SKILL_CATALOG_CHANGED } from '../modules/contracts/skillCatalog.js';

const cleanups = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(close => close()); document.body.replaceChildren(); vi.restoreAllMocks(); });
const custom = () => ({ slug: 'custom', source: 'local', name: '我的技能', description: '初始简介',
  category: '文本创作', updatedAt: '2026-10-12T00:00:00.000Z', fileCount: 4, coverUrl: '/api/agent-skills/custom/cover' });
function client() {
  return { readDocument: vi.fn(async () => ({ skill: custom(), coverFile: 'cover.gif', files: [
    { path: 'SKILL.md', text: '# 初始技能指令' }, { path: 'references/guide.md', text: '初始参考' },
    { path: 'cover.gif' }, { path: 'assets/media.bin' },
  ] })), update: vi.fn(async (_slug, request) => ({ ...custom(), ...request, updatedAt: '2026-10-12T00:00:01.000Z' })), remove: vi.fn(async () => {}) };
}
it('offers editing only for user skills in the detail actions', () => {
  const api = client(), use = vi.fn();
  const official = openSkillDetailView({ ...custom(), source: 'official' }, vi.fn(), use, api);
  expect(screen.queryByRole('button', { name: '编辑技能' })).toBeNull(); official();
  cleanups.push(openSkillDetailView(custom(), vi.fn(), use, api));
  expect([...document.querySelector('.nako-skill-detail-footer').children].map(button => button.textContent)).toEqual(['编辑技能', '使用技能']);
  fireEvent.click(screen.getByRole('button', { name: '编辑技能' }));
  expect(screen.getByRole('dialog', { name: '编辑技能' })).toBeTruthy();
  expect(api.readDocument).toHaveBeenCalledExactlyOnceWith('custom');
  expect(use).not.toHaveBeenCalled();
});
it('saves metadata, edited instructions, nested references and a new text file, preserving binary attachments', async () => {
  const api = client(), saved = vi.fn(); cleanups.push(openSkillEditDialog(custom(), saved, api));
  await waitFor(() => expect(screen.getByLabelText('文件内容').value).toBe('# 初始技能指令'));
  fireEvent.input(screen.getByLabelText('技能名称'), { target: { value: '新版技能' } });
  fireEvent.input(screen.getByLabelText('简介'), { target: { value: '新版简介' } });
  fireEvent.input(screen.getByLabelText('分类'), { target: { value: '自定义分类' } });
  fireEvent.input(screen.getByLabelText('文件内容'), { target: { value: '# 修改后的技能指令' } });
  fireEvent.change(screen.getByLabelText('技能文件'), { target: { value: 'references/guide.md' } });
  fireEvent.input(screen.getByLabelText('文件内容'), { target: { value: '修改后的参考' } });
  fireEvent.input(screen.getByLabelText('新文件路径'), { target: { value: 'templates/new.md' } });
  fireEvent.click(screen.getByRole('button', { name: '新建文本文件' }));
  fireEvent.input(screen.getByLabelText('文件内容'), { target: { value: '新模板' } });
  fireEvent.click(screen.getByRole('button', { name: '移除封面' }));
  fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  const [slug, request, files] = api.update.mock.calls[0];
  expect(slug).toBe('custom');
  expect(request).toEqual({ updatedAt: custom().updatedAt, name: '新版技能', description: '新版简介', category: '自定义分类', removedPaths: [], coverFile: null });
  const contents = await Promise.all(files.map(async file => [file.webkitRelativePath, await file.text()]));
  expect(contents).toEqual([['SKILL.md', '# 修改后的技能指令'], ['references/guide.md', '修改后的参考'], ['templates/new.md', '新模板']]);
  expect(screen.queryByRole('dialog', { name: '编辑技能' })).toBeNull();
});
it('supports GIF replacement and removes an attachment, but retains edits when saving fails', async () => {
  const api = client(), saved = vi.fn(); api.update.mockRejectedValueOnce(new Error('参考文件不存在'));
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:gif');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  cleanups.push(openSkillEditDialog(custom(), saved, api));
  await waitFor(() => expect(screen.getByLabelText('技能名称').value).toBe('我的技能'));
  const gif = new File(['GIF89a'], 'animation.gif', { type: 'image/gif' });
  fireEvent.change(screen.getByLabelText('更换封面图片'), { target: { files: [gif] } });
  expect(screen.getByAltText('技能封面').getAttribute('src')).toBe('blob:gif');
  fireEvent.change(screen.getByLabelText('技能文件'), { target: { value: 'assets/media.bin' } });
  expect(screen.getByLabelText('文件内容').disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '删除文件' }));
  fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
  await screen.findByText('参考文件不存在');
  expect(api.update.mock.calls[0][1]).toMatchObject({ coverFile: 'cover.gif', removedPaths: ['assets/media.bin'] });
  expect(await api.update.mock.calls[0][2][0].text()).toBe('GIF89a');
  expect(saved).not.toHaveBeenCalled();
  expect(screen.getByLabelText('技能名称').value).toBe('我的技能');
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(revoke).toHaveBeenCalledWith('blob:gif');
});
it('requires explicit deletion confirmation and restores the detail focus after dismissing without saving', async () => {
  const api = client(), saved = vi.fn();
  const launcher = document.createElement('button'); launcher.textContent = '编辑技能'; document.body.append(launcher); launcher.focus();
  cleanups.push(openSkillEditDialog(custom(), saved, api));
  await waitFor(() => expect(screen.getByLabelText('技能名称').value).toBe('我的技能'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(api.update).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(launcher);
  cleanups.push(openSkillEditDialog(custom(), saved, api));
  await waitFor(() => expect(screen.getByLabelText('技能名称').value).toBe('我的技能'));
  fireEvent.click(screen.getByRole('button', { name: '删除技能' }));
  expect(api.remove).not.toHaveBeenCalled();
  const confirmation = screen.getByRole('alertdialog', { name: '删除技能确认' });
  expect(confirmation.parentElement.parentElement).toBe(document.body);
  expect(confirmation.textContent).toContain('我的技能');
  expect(document.querySelector('.nako-skill-editor').closest('[inert]')).toBeTruthy();
  fireEvent.click(within(confirmation).getByRole('button', { name: '取消' }));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('dialog', { name: '编辑技能' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: '确认删除技能' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '删除技能' }));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(screen.getByRole('dialog', { name: '编辑技能' })).toBeTruthy();
  expect(api.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '删除技能' }));
  fireEvent.click(screen.getByRole('button', { name: '确认删除技能' }));
  await waitFor(() => expect(saved).toHaveBeenCalledExactlyOnceWith(null));
  expect(api.remove).toHaveBeenCalledExactlyOnceWith('custom');
});
it('refreshes the manager and open detail after the client saves an edited skill', async () => {
  let skill = custom();
  const fetcher = vi.fn(async (url, options) => {
    if (options?.method === 'PUT') {
      const { coverFile, ...request } = JSON.parse(options.body);
      skill = { ...skill, ...request }; if (coverFile === null) delete skill.coverUrl;
      return Response.json({ skill });
    }
    return url.endsWith('/edit') ? Response.json({ skill, files: [{ path: 'SKILL.md', text: '# Body' }] }) : Response.json({ skills: [skill] });
  });
  cleanups.push(installSkillCommunity(createAgentSkillClient(fetcher)));
  window.dispatchEvent(new Event('nako:open-skill-community'));
  await screen.findByRole('button', { name: '用户自定义' });
  fireEvent.click(screen.getByRole('button', { name: '用户自定义' }));
  await screen.findByText('我的技能');
  fireEvent.click(document.querySelector('[data-nako-skill="custom"] .nako-skill-card'));
  fireEvent.click(screen.getByRole('button', { name: '编辑技能' }));
  await waitFor(() => expect(screen.getByLabelText('技能名称').value).toBe('我的技能'));
  fireEvent.input(screen.getByLabelText('技能名称'), { target: { value: '更新后的技能' } });
  fireEvent.click(screen.getByRole('button', { name: '移除封面' }));
  fireEvent.click(screen.getByRole('button', { name: '保存修改' }));
  await screen.findByRole('dialog', { name: '更新后的技能' });
  expect(within(screen.getByRole('dialog', { name: '更新后的技能' })).getByRole('heading', { name: '更新后的技能' })).toBeTruthy();
  await waitFor(() => expect(document.querySelector('[data-nako-skill="custom"] .nako-skill-name').textContent).toBe('更新后的技能'));
  expect(document.querySelector('.nako-skill-detail-cover').getAttribute('src')).toBe('/share/Default_cover.png');
});
it('preserves conflict status and publishes a catalog event only after successful saving', async () => {
  const changed = vi.fn(); window.addEventListener(SKILL_CATALOG_CHANGED, changed);
  cleanups.push(() => window.removeEventListener(SKILL_CATALOG_CHANGED, changed));
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: '技能已被修改', code: 'INVALID_AGENT_SKILL' }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ skill: custom() }));
  const api = createAgentSkillClient(fetcher);
  const request = { updatedAt: custom().updatedAt, name: '我的技能', description: '初始简介', category: '文本创作', removedPaths: [] };
  await expect(api.update('custom', request, [])).rejects.toMatchObject({ status: 409, message: '技能已被修改' });
  expect(changed).not.toHaveBeenCalled();
  await api.update('custom', request, []); expect(changed).toHaveBeenCalledOnce();
});
