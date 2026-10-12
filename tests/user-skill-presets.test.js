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
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-official-presets-'));
  roots.push(root);
  const presetDirectory = path.join(root, 'app', 'presets');
  await mkdir(presetDirectory, { recursive: true });
  return { root, presetDirectory, options: { libraryDirectory: path.join(root, 'user', 'library'), presetDirectory } };
}
async function preset(directory, id, files = {}) {
  for (const [relative, content] of Object.entries({
    'SKILL.md': `---\nname: ${id}\n---\n# 官方第一版`,
    'metadata.json': JSON.stringify({ name: id, description: '官方介绍', category: '文本创作' }),
    ...files,
  })) {
    const filename = path.join(directory, id, relative);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, content);
  }
}
const upload = text => [{ path: 'SKILL.md', contentBase64: Buffer.from(text).toString('base64') }];

it.each([
  ['gif', 'image/gif'], ['webp', 'image/webp'], ['png', 'image/png'],
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'],
])('provides official %s cover URLs and returns the original bytes with the correct MIME type', async (extension, contentType) => {
  const { options, presetDirectory } = await setup();
  const content = Buffer.from(`official ${extension} cover`);
  await preset(presetDirectory, 'template', { [`cover.${extension}`]: content });
  const library = createAgentSkillLibrary(options);
  const skill = (await library.list()).find(item => item.slug === 'preset-template');
  expect(skill.coverUrl).toBe('/api/agent-skills/preset-template/cover');
  expect(await library.readCover(skill.slug)).toEqual({ content, contentType });
});

it('reflects official metadata, instructions, references and cover changes while preserving imported files', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template', {
    'references/guide.md': '# 第一版参考',
    'agent-skill.json': '{"instructionReferences":["references/guide.md"]}',
    'cover.webp': 'first artwork',
  });
  const library = createAgentSkillLibrary(options);
  const imported = await library.importFiles(upload('---\nname: template\n---\n# 用户正文'));
  await library.updateCategory(imported.slug, '用户分类');
  const userDirectory = path.join(library.rootDirectory, imported.slug);
  const before = await Promise.all(['metadata.json', 'SKILL.md'].map(file => readFile(path.join(userDirectory, file))));
  const official = (await library.list()).find(skill => skill.preset);
  expect(official).toMatchObject({ slug: 'preset-template', source: 'official', name: 'template' });
  expect(await library.loadInstructions([official.slug])).toContain('第一版参考');
  await preset(presetDirectory, 'template', {
    'metadata.json': JSON.stringify({ name: '新版官方', description: '新版介绍', category: '视频制作', source: 'local', bundleId: 'forged' }),
    'SKILL.md': '---\nname: changed-name\n---\n# 官方第二版',
    'references/guide.md': '# 第二版参考',
    'cover.gif': 'GIF89a second artwork',
  });
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(skill => skill.slug === official.slug)).toMatchObject({
    name: '新版官方', description: '新版介绍', category: '视频制作', source: 'official',
  });
  expect((await reopened.list()).find(skill => skill.slug === official.slug).bundleId).toBeUndefined();
  const instructions = await reopened.loadInstructions([official.slug]);
  expect(instructions).toContain('官方第二版'); expect(instructions).toContain('第二版参考');
  expect(instructions).not.toContain('第一版参考');
  expect(await reopened.readCover(official.slug)).toEqual({ content: Buffer.from('GIF89a second artwork'), contentType: 'image/gif' });
  expect((await reopened.list()).find(skill => skill.slug === imported.slug).category).toBe('用户分类');
  expect(await reopened.loadInstructions([imported.slug])).toContain('用户正文');
  expect(await Promise.all(['metadata.json', 'SKILL.md'].map(file => readFile(path.join(userDirectory, file))))).toEqual(before);
  expect(await readdir(library.rootDirectory)).not.toContain(official.slug);
  expect(await readdir(library.rootDirectory)).not.toContain('preset-state.json');
});

it('reflects added and deleted official skills for every user without restoring stale copies', async () => {
  const { root, options, presetDirectory } = await setup();
  await preset(presetDirectory, 'template');
  const a = createAgentSkillLibrary(options);
  const b = createAgentSkillLibrary({ ...options, privateDirectory: path.join(root, 'other-user') });
  await a.initialize();
  const stale = path.join(a.rootDirectory, 'old-copy');
  await mkdir(stale);
  await writeFile(path.join(stale, 'metadata.json'), JSON.stringify({ slug: 'old-copy', presetId: 'template', name: '旧副本' }));
  await writeFile(path.join(stale, 'SKILL.md'), '# 旧副本');
  await writeFile(path.join(a.rootDirectory, 'catalog.json'), JSON.stringify({ version: 1, removed: ['preset-template', 'minimax-drama-prompt'], categories: { 'preset-template': '旧分类' } }));
  expect((await a.list()).find(skill => skill.slug === 'preset-template').category).toBe('文本创作');
  expect((await a.list()).some(skill => skill.slug === 'minimax-drama-prompt')).toBe(true);
  expect((await a.list()).some(skill => skill.slug === 'old-copy')).toBe(false);
  await rm(path.join(presetDirectory, 'template'), { recursive: true });
  await preset(presetDirectory, 'added');
  for (const library of [a, b]) {
    const all = await library.list();
    expect(all.some(skill => skill.slug === 'preset-template')).toBe(false);
    expect(all.some(skill => skill.slug === 'preset-added')).toBe(true);
    expect(await library.loadInstructions(['preset-template'])).toBe('');
    await expect(library.readCover('preset-template')).rejects.toMatchObject({ status: 404 });
  }
  expect(await readFile(path.join(stale, 'SKILL.md'), 'utf8')).toBe('# 旧副本');
  await rm(presetDirectory, { recursive: true });
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).some(skill => skill.preset)).toBe(false);
  expect((await reopened.list()).some(skill => skill.slug === 'minimax-drama-prompt')).toBe(true);
});

it('rejects changes to official presets and allows independent imports with the same name', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, 'minimax-drama-prompt');
  const library = createAgentSkillLibrary(options);
  const all = await library.list();
  expect(all.find(skill => skill.slug === 'minimax-drama-prompt').bundleId).toBe('minimax-drama');
  const generic = all.find(skill => skill.slug === 'preset-minimax-drama-prompt');
  expect(generic.source).toBe('official'); expect(generic.bundleId).toBeUndefined();
  await expect(library.remove(generic.slug)).rejects.toMatchObject({ status: 403 });
  await expect(library.updateCategory(generic.slug, '用户分类')).rejects.toMatchObject({ status: 403 });
  const imported = await library.importFiles(upload('---\nname: preset-minimax-drama-prompt\n---\n# 自定义'));
  expect(imported).toMatchObject({ slug: 'custom-minimax-drama-prompt', source: 'local' });
  await library.remove(imported.slug);
  expect((await library.list()).some(skill => skill.slug === generic.slug)).toBe(true);
});

it('uses stable identities for Chinese folders and reports malformed official metadata', async () => {
  const { options, presetDirectory } = await setup();
  await preset(presetDirectory, '中文技能', { 'cover.gif': 'GIF89a' });
  const library = createAgentSkillLibrary(options), skill = (await library.list()).find(item => item.preset);
  expect(skill.slug).toMatch(/^preset-[a-f0-9]{24}$/);
  await writeFile(path.join(presetDirectory, '中文技能', 'SKILL.md'), '# 新指令');
  expect((await library.list()).find(item => item.preset).slug).toBe(skill.slug);
  expect(await library.readCover(skill.slug)).toMatchObject({ contentType: 'image/gif' });
  await writeFile(path.join(presetDirectory, '中文技能', 'metadata.json'), '{');
  await expect(library.list()).rejects.toThrow('不是有效 JSON');
});

it('rejects escaping cover identities and executable or traversal instruction references', async () => {
  const { presetDirectory } = await setup();
  await preset(presetDirectory, '中文技能', { 'cover.gif': 'GIF89a' });
  expect(await resolvePresetSkillCover(presetDirectory, '中文技能')).toBe(path.join(presetDirectory, '中文技能', 'cover.gif'));
  for (const id of ['../outside', '..\\outside', 'C:\\outside', '..', '', null, 'missing'])
    expect(await resolvePresetSkillCover(presetDirectory, id)).toBeNull();
  for (const reference of ['references/../../outside.md', 'templates/../outside.md', 'scripts/run.py', 'assets/image.png'])
    expect(() => parseSkillInstructionManifest(JSON.stringify({ instructionReferences: [reference] }))).toThrow();
});
