import { afterEach, expect, it } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { createAgentSkillLibrary } from '../plugins/storage/agent-files/agentSkillLibrary.js';
import { createAgentSkillRouter } from '../modules/agent/server/agent/agentSkillRouter.js';

const cleanups = [];
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close(); });
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-skill-management-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const options = { libraryDirectory: path.join(root, 'library'), presetDirectory: null };
  return { options, library: createAgentSkillLibrary(options) };
}
const upload = (name = 'test-skill', category = '文本创作') => [{ path: `${name}/SKILL.md`, contentBase64:
  Buffer.from(`---\nname: ${name}\ndescription: Test skill\ncategory: ${category}\n---\nWrite helpful text.`).toString('base64') }];
it('unifies categories, persists edits and removes uploaded files without affecting other skills', async () => {
  const { options, library } = await setup();
  const [skill] = await library.importFolders(upload());
  expect(skill.category).toBe('文本创作');
  await library.updateCategory(skill.slug, '自定义分类');
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(item => item.slug === skill.slug).category).toBe('自定义分类');
  await reopened.remove(skill.slug);
  expect((await library.list()).some(item => item.slug === skill.slug)).toBe(false);
  await expect(readFile(path.join(library.rootDirectory, skill.slug, 'SKILL.md'))).rejects.toMatchObject({ code: 'ENOENT' });
  expect((await library.list()).length).toBe(3);
});
it('stores and serves an optional image cover, while skills without one stay on the default cover', async () => {
  const { library } = await setup();
  const cover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
  const files = [...upload(), { path: 'test-skill/cover.png', contentBase64: cover.toString('base64') }];
  const [skill] = await library.importFolders(files);
  expect(skill.coverFile).toBe('cover.png');
  expect((await library.list()).find(item => item.slug === skill.slug).coverUrl).toBe(`/api/agent-skills/${skill.slug}/cover`);
  const result = await library.readCover(skill.slug);
  expect(result.contentType).toBe('image/png'); expect(result.content).toEqual(cover);
  const [withoutCover] = await library.importFolders(upload('no-cover'));
  expect((await library.list()).find(item => item.slug === withoutCover.slug).coverUrl).toBeUndefined();
});
it('serves the bundled skill covers through the storage adapter and respects removal', async () => {
  const { library } = await setup();
  for (const skill of await library.list()) {
    expect(skill.coverUrl).toBe(`/api/agent-skills/${skill.slug}/cover`);
    const cover = await library.readCover(skill.slug);
    expect(cover.contentType).toBe('image/webp');
    expect(cover.content.subarray(0, 4).toString()).toBe('RIFF');
    expect(cover.content.subarray(8, 12).toString()).toBe('WEBP');
  }
  await library.remove('minimax-drama-high');
  await expect(library.readCover('minimax-drama-high')).rejects.toThrow('不存在或已删除');
  await expect(library.readCover('../minimax-drama-prompt')).rejects.toThrow('标识无效');
});
it('removes bundled skills durably from selection and instructions with no restore API', async () => {
  const { options, library } = await setup();
  const builtin = (await library.list())[0];
  await library.remove(builtin.slug);
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).some(item => item.slug === builtin.slug)).toBe(false);
  expect(await reopened.loadInstructions([builtin.slug])).toBe('');
  expect(reopened.presets).toBeUndefined();
  expect(reopened.restore).toBeUndefined();
});
it('prevents imported files from acquiring trusted routing identities even after deletion', async () => {
  const { library } = await setup();
  const builtin = (await library.list())[0];
  await library.remove(builtin.slug);
  const imported = await library.importFiles(upload(builtin.slug));
  expect(imported.slug).not.toBe(builtin.slug);
  expect(imported.source).toBe('local');
  expect((await library.list()).some(item => item.slug === builtin.slug)).toBe(false);
});
it('serializes concurrent category edits and duplicate imports without losing catalog changes', async () => {
  const { options, library } = await setup();
  const skills = await library.list();
  await Promise.all(skills.map((skill, i) => library.updateCategory(skill.slug, `分类 ${i}`)));
  const imported = await Promise.all([library.importFiles(upload()), library.importFiles(upload())]);
  expect(new Set(imported.map(skill => skill.slug)).size).toBe(2);
  const latest = await createAgentSkillLibrary(options).list();
  skills.forEach((skill, i) => expect(latest.find(item => item.slug === skill.slug).category).toBe(`分类 ${i}`));
});
it('rejects invalid category and traversal identifiers without deleting data', async () => {
  const { library } = await setup();
  await expect(library.remove('../outside')).rejects.toThrow('标识无效');
  await expect(library.updateCategory('minimax-drama-prompt', 'x'.repeat(41))).rejects.toThrow('分类');
  await expect(library.importFolders(upload(), { injected: true })).rejects.toThrow('分类');
  await expect(library.importFiles([{ path: '../SKILL.md', contentBase64: 'dGVzdA==' }])).rejects.toThrow();
  expect((await library.list()).length).toBe(3);
});
it('exposes category update and delete while removed preset routes return 404', async () => {
  const { library } = await setup();
  const app = express(); app.use(createAgentSkillRouter({ skillLibrary: library }));
  const server = await new Promise(resolve => { const server = app.listen(0, '127.0.0.1', () => resolve(server)); });
  cleanups.push(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const request = (suffix, method, value) => fetch(`http://127.0.0.1:${server.address().port}/api/agent-skills${suffix}`, {
    method, headers: { 'content-type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value),
  });
  const slug = 'minimax-drama-prompt';
  expect((await request(`/${slug}`, 'PATCH', { category: '剧本' })).status).toBe(200);
  expect((await request(`/${slug}`, 'DELETE')).status).toBe(200);
  expect((await request(`/${slug}`, 'DELETE')).status).toBe(404);
  expect((await request('/presets', 'GET')).status).toBe(404);
  expect((await request(`/${slug}/restore`, 'POST')).status).toBe(404);
  expect((await (await request('/import', 'POST', { files: upload(), category: '图像设计' })).json()).skills[0].category).toBe('图像设计');
  const cover = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64');
  await request('/import', 'POST', { files: [...upload('cover-route'), { path: 'cover-route/cover.png', contentBase64: cover.toString('base64') }] });
  const listed = await (await request('', 'GET')).json();
  const withCover = listed.skills.find(skill => skill.name === 'cover-route');
  const image = await fetch(`http://127.0.0.1:${server.address().port}${withCover.coverUrl}`);
  expect(image.status).toBe(200); expect(image.headers.get('content-type')).toBe('image/png');
  expect(Buffer.from(await image.arrayBuffer())).toEqual(cover);
});
it('initializes every bundled preset into user storage once and keeps deletion durable', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-user-skill-presets-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const options = {
    libraryDirectory: path.join(root, 'library'),
    privateDirectory: path.join(root, 'private'),
  };
  const library = createAgentSkillLibrary(options);
  const presets = (await library.list()).filter(skill => skill.preset);
  expect(presets).toHaveLength(15);
  expect(presets.every(skill => skill.source === 'local')).toBe(true);
  expect(presets.map(skill => skill.name)).toEqual(expect.arrayContaining([
    '海螺 H3 视频提示词助手',
    '角色与场景资产设计',
  ]));
  expect(library.rootDirectory).toBe(path.join(root, 'private', 'agent-skills'));
  const h3 = presets.find(skill => skill.slug === 'minimaxh3-prompt-integrated');
  expect(await library.loadInstructions([h3.slug])).toContain('# MiniMax H3 提示词诊断与修正');
  await library.updateCategory(h3.slug, 'H3 视频');
  await library.remove(h3.slug);
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).some(skill => skill.slug === h3.slug)).toBe(false);
  expect(JSON.parse(await readFile(path.join(root, 'private', 'agent-skills', 'preset-state.json'), 'utf8')).initialized)
    .toContain('minimaxh3-prompt-integrated');
});
