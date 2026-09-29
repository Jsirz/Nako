import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createAgentSkillLibrary } from '../plugins/storage/agent-files/agentSkillLibrary.js';
import { parseSkillInstructionManifest } from '../plugins/storage/agent-files/skillInstructions.js';
import { resolvePresetSkillCover } from '../plugins/storage/agent-files/presetSkillCovers.js';

const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-preset-seed-'));
  roots.push(root);
  const presetDirectory = path.join(root, 'app', 'presets');
  const options = { libraryDirectory: path.join(root, 'user-a', 'library'), presetDirectory };
  await mkdir(presetDirectory, { recursive: true });
  return { root, options, presetDirectory };
}
async function preset(directory, id, files = {}) {
  for (const [relative, content] of Object.entries({
    'SKILL.md': '---\nname: ' + id + '\ndescription: >\n  多行描述第一行\n  第二行\n---\n# 独立模板\n',
    ...files,
  })) {
    const filename = path.join(directory, id, relative);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, content);
  }
}
it('copies full assets, loads explicit text references, and preserves user edits across restart', async () => {
  const { options, presetDirectory } = await setup();
  const binary = Buffer.from([0, 1, 2, 255]);
  await preset(presetDirectory, 'template', {
    'reference/GUIDE.md': '# 场景参考',
    'templates/report.template.md': '# 模板正文',
    'assets/image.png': binary,
    'cover.webp': binary,
    'COVER-SOURCE.md': '# 封面授权，不是技能指令',
    'scripts/example.py': 'raise RuntimeError("must not execute")',
  });
  const library = createAgentSkillLibrary(options);
  const skill = (await library.list()).find(item => item.preset);
  expect(skill.description).toBe('多行描述第一行 第二行');
  const target = path.join(library.rootDirectory, skill.slug);
  expect(await readFile(path.join(target, 'assets/image.png'))).toEqual(binary);
  expect(skill.coverUrl).toBe(`/api/agent-skills/${skill.slug}/cover`);
  expect((await library.readCover(skill.slug)).content).toEqual(binary);
  expect(await readFile(path.join(target, 'COVER-SOURCE.md'), 'utf8')).toContain('封面授权');
  const instructions = await library.loadInstructions([skill.slug]);
  expect(instructions).toContain('# 场景参考');
  expect(instructions).toContain('# 模板正文');
  expect(instructions).not.toContain('raise RuntimeError');
  expect(instructions).not.toContain('封面授权');
  await writeFile(path.join(target, 'SKILL.md'), '# 用户编辑');
  await library.updateCategory(skill.slug, '我的分类');
  await preset(presetDirectory, 'template', { 'SKILL.md': '# 上游变更' });
  const reopened = createAgentSkillLibrary(options);
  expect(await reopened.loadInstructions([skill.slug])).toContain('# 用户编辑');
  expect((await reopened.list()).find(item => item.slug === skill.slug).category).toBe('我的分类');
});
it('serializes concurrent instances and isolates initialization and deletion between users', async () => {
  const { root, options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template');
  const a = createAgentSkillLibrary(options), duplicate = createAgentSkillLibrary(options);
  const b = createAgentSkillLibrary({ ...options, privateDirectory: path.join(root, 'user-b', 'private') });
  const [first, second, other] = await Promise.all([a.list(), duplicate.list(), b.list()]);
  expect(first.filter(item => item.preset)).toHaveLength(1);
  expect(second.filter(item => item.preset)).toHaveLength(1);
  expect(other.filter(item => item.preset)).toHaveLength(1);
  await a.remove('template');
  expect((await createAgentSkillLibrary(options).list()).some(item => item.slug === 'template')).toBe(false);
  expect((await b.list()).some(item => item.slug === 'template')).toBe(true);
});
it('inherits newly shipped artwork for existing presets without rewriting user data', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template');
  const original = createAgentSkillLibrary(options);
  await original.initialize();
  const target = path.join(original.rootDirectory, 'template');
  await writeFile(path.join(target, 'SKILL.md'), '# 用户编辑');
  await original.updateCategory('template', '我的分类');
  const metadata = await readFile(path.join(target, 'metadata.json'));
  const ledger = await readFile(path.join(original.rootDirectory, 'preset-state.json'));
  const image = Buffer.from('shipped artwork');
  await preset(presetDirectory, 'template', { 'cover.webp': image });
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(skill => skill.slug === 'template')).toMatchObject({
    category: '我的分类', coverUrl: '/api/agent-skills/template/cover',
  });
  expect((await reopened.readCover('template')).content).toEqual(image);
  expect(await reopened.loadInstructions(['template'])).toContain('# 用户编辑');
  expect(await readFile(path.join(target, 'metadata.json'))).toEqual(metadata);
  expect(await readFile(path.join(original.rootDirectory, 'preset-state.json'))).toEqual(ledger);
  expect(await readdir(target)).not.toContain('cover.webp');
  await reopened.remove('template');
  const afterDeletion = createAgentSkillLibrary(options);
  expect((await afterDeletion.list()).some(skill => skill.slug === 'template')).toBe(false);
  await expect(afterDeletion.readCover('template')).rejects.toThrow();
});
it('prefers user artwork and does not infer preset identity from an imported name', async () => {
  const { options, presetDirectory } = await setup();
  const library = createAgentSkillLibrary(options);
  await library.initialize();
  await library.importFiles([{ path: 'SKILL.md', contentBase64:
    Buffer.from('---\nname: template\n---\n# 用户导入').toString('base64') }]);
  const userCover = Buffer.from('user artwork');
  await preset(presetDirectory, 'template', { 'cover.webp': userCover });
  const seeded = createAgentSkillLibrary(options);
  await seeded.initialize();
  await writeFile(path.join(presetDirectory, 'template', 'cover.webp'), 'new shipped artwork');
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(skill => skill.slug === 'template').coverUrl).toBeUndefined();
  await expect(reopened.readCover('template')).rejects.toThrow();
  expect((await reopened.readCover('template-2')).content).toEqual(userCover);
});
it('supports Chinese preset folders and rejects missing or escaping cover identities', async () => {
  const { presetDirectory } = await setup();
  await preset(presetDirectory, '中文技能', { 'cover.webp': 'artwork' });
  expect(await resolvePresetSkillCover(presetDirectory, '中文技能'))
    .toBe(path.join(presetDirectory, '中文技能', 'cover.webp'));
  for (const id of ['../outside', '..\\outside', 'C:\\outside', '..', '', null, 'missing'])
    expect(await resolvePresetSkillCover(presetDirectory, id)).toBeNull();
  expect(await resolvePresetSkillCover(null, '中文技能')).toBeNull();
});
it('keeps a preset with a business-reserved name local and does not overwrite existing imports', async () => {
  const { options, presetDirectory } = await setup();
  const before = createAgentSkillLibrary({ ...options, presetDirectory: null });
  const imported = await before.importFiles([{ path: 'SKILL.md', contentBase64: Buffer.from('---\nname: template\n---\n# 用户内容').toString('base64') }]);
  await preset(presetDirectory, 'template');
  await preset(presetDirectory, 'minimax-drama-prompt');
  const library = createAgentSkillLibrary(options), all = await library.list();
  expect(all.find(item => item.slug === 'minimax-drama-prompt').source).toBe('official');
  expect(all.find(item => item.name === 'minimax-drama-prompt' && item.preset)).toMatchObject({ source: 'local', slug: 'minimax-drama-prompt-2' });
  expect(all.find(item => item.name === 'template' && item.preset).slug).toBe('template-2');
  expect(await library.loadInstructions([imported.slug])).toContain('# 用户内容');
});
it('recovers a copied preset missing its ledger commit without duplicating or replacing files', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template');
  const library = createAgentSkillLibrary(options);
  await library.initialize();
  await rm(path.join(library.rootDirectory, 'preset-state.json'));
  await writeFile(path.join(library.rootDirectory, 'template', 'SKILL.md'), '# 保留副本');
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).filter(item => item.preset)).toHaveLength(1);
  expect(await reopened.loadInstructions(['template'])).toContain('# 保留副本');
  expect(await readdir(library.rootDirectory)).not.toContain('template-2');
});
it('fails clearly on corrupt initialization state without overwriting it and permits retry after repair', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template');
  const library = createAgentSkillLibrary(options);
  await mkdir(library.rootDirectory, { recursive: true });
  const state = path.join(library.rootDirectory, 'preset-state.json');
  await writeFile(state, '{"version":2}');
  await expect(library.list()).rejects.toThrow('初始化记录损坏');
  expect(await readFile(state, 'utf8')).toBe('{"version":2}');
  await rm(state);
  expect((await library.list()).filter(item => item.preset)).toHaveLength(1);
});
it('rejects traversal and executable references while allowing explicit text template paths', () => {
  for (const reference of ['references/../../outside.md', 'templates/../outside.md', 'scripts/run.py', 'assets/image.png']) {
    expect(() => parseSkillInstructionManifest(JSON.stringify({ instructionReferences: [reference] }))).toThrow();
  }
  expect(parseSkillInstructionManifest('{"instructionReferences":["templates/report.template.md"]}')).toEqual(['templates/report.template.md']);
});
