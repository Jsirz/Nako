import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { createAgentSkillLibrary } from '../plugins/storage/agent-files/agentSkillLibrary.js';
import { createSkillCatalogState } from '../plugins/storage/agent-files/skillCatalogState.js';
import { createSkillEditor } from '../plugins/storage/agent-files/skillEditor.js';
import { createAgentSkillRouter } from '../modules/agent/server/agent/agentSkillRouter.js';

const cleanups = [];
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close(); });
const file = (path, content) => ({ path, contentBase64: Buffer.from(content).toString('base64') });
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-skill-editor-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const options = { libraryDirectory: path.join(root, 'library'), presetDirectory: null };
  const library = createAgentSkillLibrary(options);
  const [skill] = await library.importFolders([
    file('custom/SKILL.md', '---\nname: custom\ndescription: Initial summary\n---\nInitial instruction'),
    file('custom/agent-skill.json', JSON.stringify({ instructionReferences: ['references/guide.md'] })),
    file('custom/references/guide.md', 'Initial reference'),
    file('custom/cover.gif', 'GIF89a initial cover'),
    file('custom/assets/media.bin', Buffer.from([0, 255, 128, 1])),
  ]);
  const request = overrides => ({ updatedAt: skill.updatedAt, name: '新名称', description: '修改后的技能简介',
    category: '我的分类', files: [], removedPaths: [], ...overrides });
  return { library, options, skill, request, directory: path.join(library.rootDirectory, skill.slug) };
}
it('edits a user skill in place, preserving untouched binary files and loading the new instructions after restart', async () => {
  const { library, options, skill, request, directory } = await setup();
  const document = await library.readDocument(skill.slug);
  expect(document.coverFile).toBe('cover.gif');
  expect(document.files.find(file => file.path === 'references/guide.md').text).toBe('Initial reference');
  expect(document.files.find(file => file.path === 'assets/media.bin')).toEqual({ path: 'assets/media.bin' });
  expect(document.files.some(file => file.path === 'metadata.json')).toBe(false);
  const updated = await library.update(skill.slug, request({ files: [
    file('SKILL.md', '# Updated instruction'), file('references/guide.md', 'Updated reference'),
    file('cover.gif', 'GIF89a replacement'), file('templates/new.md', 'New template'),
  ], coverFile: 'cover.gif' }));
  expect(updated).toMatchObject({ slug: skill.slug, source: 'local', name: '新名称', category: '我的分类' });
  expect(updated.updatedAt).not.toBe(skill.updatedAt);
  expect(await readFile(path.join(directory, 'assets/media.bin'))).toEqual(Buffer.from([0, 255, 128, 1]));
  expect(await readdir(library.rootDirectory)).toEqual(expect.arrayContaining([skill.slug]));
  expect((await readdir(library.rootDirectory)).some(name => name.startsWith('.'))).toBe(false);
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(item => item.slug === skill.slug)).toMatchObject(updated);
  expect(await reopened.loadInstructions([skill.slug])).toContain('Updated reference');
  expect(await reopened.loadInstructions([skill.slug])).toContain('# Updated instruction');
  expect((await reopened.readCover(skill.slug)).content.toString()).toBe('GIF89a replacement');
});
it('removes a cover and declared reference only when the updated metadata and manifest allow it', async () => {
  const { library, skill, request, directory } = await setup();
  await library.update(skill.slug, request({ coverFile: null, removedPaths: ['cover.gif', 'references/guide.md'],
    files: [file('agent-skill.json', JSON.stringify({ instructionReferences: [] }))] }));
  expect((await library.list()).find(item => item.slug === skill.slug).coverUrl).toBeUndefined();
  await expect(readFile(path.join(directory, 'cover.gif'))).rejects.toMatchObject({ code: 'ENOENT' });
  expect(await library.loadInstructions([skill.slug])).toContain('Initial instruction');
  await library.remove(skill.slug);
  await expect(library.readDocument(skill.slug)).rejects.toMatchObject({ status: 404 });
});
it.each([
  { removedPaths: ['references/guide.md'] },
  { removedPaths: ['SKILL.md'] },
  { files: [file('metadata.json', '{}')] },
  { files: [file('../outside.md', 'Escape')] },
  { files: [file('metadata.json.', '{}')] },
  { files: [file('references/guide.MD', 'Case alias')] },
  { files: [file('SKILL.md', '')] },
  { coverFile: 'missing.gif' },
])('rejects an invalid edit without changing the stored skill: %j', async override => {
  const { library, skill, request, directory } = await setup();
  const before = await library.readDocument(skill.slug);
  const metadata = await readFile(path.join(directory, 'metadata.json'));
  await expect(library.update(skill.slug, request(override))).rejects.toThrow();
  expect(await library.readDocument(skill.slug)).toEqual(before);
  expect(await readFile(path.join(directory, 'metadata.json'))).toEqual(metadata);
  expect((await readdir(library.rootDirectory)).some(name => name.startsWith('.'))).toBe(false);
});
it('rejects stale saves between library instances sharing the user catalog', async () => {
  const { library, options, skill, request } = await setup();
  const reopened = createAgentSkillLibrary(options);
  const results = await Promise.allSettled([
    library.update(skill.slug, request({ name: 'First editor' })),
    reopened.update(skill.slug, request({ name: 'Second editor' })),
  ]);
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.find(result => result.status === 'rejected').reason.status).toBe(409);
  expect((await library.list()).find(item => item.slug === skill.slug).name).toBe('First editor');
});
it('restores original files if installation of the edited directory fails', async () => {
  const { library, skill, request } = await setup();
  const catalog = createSkillCatalogState(library.rootDirectory, library.list);
  const failure = Object.assign(new Error('Disk unavailable'), { code: 'EIO' });
  const move = vi.fn().mockImplementationOnce(rename).mockRejectedValueOnce(failure).mockImplementation(rename);
  const editor = createSkillEditor({ rootDirectory: library.rootDirectory, catalog, rename: move });
  const original = await library.readDocument(skill.slug);
  await expect(editor.save(skill.slug, request({ files: [file('SKILL.md', 'New instruction')] }))).rejects.toBe(failure);
  expect(await library.readDocument(skill.slug)).toEqual(original);
  expect((await readdir(library.rootDirectory)).some(name => name.startsWith('.'))).toBe(false);
});
it('serves editable user files and saves over HTTP while rejecting official editing and stale updates', async () => {
  const { library, skill, request } = await setup();
  const app = express(); app.use(createAgentSkillRouter({ skillLibrary: library }));
  const server = await new Promise(resolve => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  cleanups.push(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const send = (suffix, method = 'GET', value) => fetch(`http://127.0.0.1:${server.address().port}/api/agent-skills${suffix}`, {
    method, headers: { 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value),
  });
  expect((await send('/minimax-drama-prompt/edit')).status).toBe(403);
  expect((await send('/minimax-drama-prompt', 'PUT', request())).status).toBe(403);
  expect((await (await send(`/${skill.slug}/edit`)).json()).skill.slug).toBe(skill.slug);
  const response = await send(`/${skill.slug}`, 'PUT', request());
  expect(response.status).toBe(200); expect((await response.json()).skill.name).toBe('新名称');
  expect((await send(`/${skill.slug}`, 'PUT', request())).status).toBe(409);
  expect((await send(`/${skill.slug}/cover`)).headers.get('cache-control')).toBe('no-cache');
});
