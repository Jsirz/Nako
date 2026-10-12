import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAgentSkillLibrary } from '../plugins/storage/agent-files/agentSkillLibrary.js';
import { DEFAULT_SKILL_PRESET_DIRECTORY } from '../plugins/storage/agent-files/userSkillPresets.js';
import { readSkillMetadata } from '../plugins/storage/agent-files/skillFrontmatter.js';
import { createOfficialSkillRegistry } from '../plugins/storage/agent-files/officialSkillRegistry.js';
import { SKILL_DESCRIPTION_MAX_LENGTH } from '../modules/contracts/skillCatalog.js';

const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const original = '---\nname: example\ndescription: Original instructions\n---\n# Keep this instruction';
const localized = original.replace('name: example', 'name: example\ndisplay-name: 图像设计助手\ndisplay-description: 编写中文图像提示词。');
const display = { name: '图像设计助手', description: '编写中文图像提示词。', category: '图像设计' };
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-skill-display-'));
  roots.push(root);
  const presetDirectory = path.join(root, 'presets');
  await mkdir(path.join(presetDirectory, 'example'), { recursive: true });
  const file = path.join(presetDirectory, 'example', 'SKILL.md');
  await writeFile(file, original);
  await writeFile(path.join(path.dirname(file), 'metadata.json'), JSON.stringify(display));
  return { file, options: { libraryDirectory: path.join(root, 'library'), presetDirectory } };
}

it('reads official display metadata from the application on every listing', async () => {
  const { file, options } = await setup();
  const library = createAgentSkillLibrary(options);
  await library.initialize();
  await writeFile(path.join(path.dirname(file), 'metadata.json'), JSON.stringify({ ...display, name: '新版图像设计助手' }));
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(skill => skill.slug === 'preset-example')).toMatchObject({
    name: '新版图像设计助手', description: '编写中文图像提示词。', source: 'official', preset: true,
  });
  expect(await readdir(library.rootDirectory)).toEqual([]);
  expect(await reopened.loadInstructions(['preset-example'])).toContain(original);
});

it('uses display metadata for new imports and presets without deriving their slugs from it', async () => {
  const { file, options } = await setup();
  await writeFile(path.join(path.dirname(file), 'metadata.json'), JSON.stringify(display));
  const library = createAgentSkillLibrary(options);
  expect((await library.list()).find(skill => skill.preset)).toMatchObject({
    slug: 'preset-example', name: '图像设计助手', description: '编写中文图像提示词。',
  });
  const imported = await library.importFiles([{ path: 'SKILL.md', contentBase64: Buffer.from(localized).toString('base64') }]);
  expect(imported).toMatchObject({ slug: 'example', name: '图像设计助手', description: '编写中文图像提示词。' });
  expect(imported.presetId).toBeUndefined();
});

it('keeps imported display metadata independent from official copy with the same name', async () => {
  const { file, options } = await setup();
  await writeFile(path.join(path.dirname(file), 'metadata.json'), JSON.stringify(display));
  const library = createAgentSkillLibrary(options);
  const imported = await library.importFiles([{ path: 'SKILL.md', contentBase64: Buffer.from(original).toString('base64') }]);
  await writeFile(path.join(path.dirname(file), 'metadata.json'), JSON.stringify({ ...display, name: '官方新名称' }));
  expect((await library.list()).find(skill => skill.slug === imported.slug)).toMatchObject({ name: 'example', description: 'Original instructions', source: 'local' });
  expect((await library.list()).find(skill => skill.preset).name).toBe('官方新名称');
});

it('ships detailed Chinese descriptions in each skill directory', async () => {
  const folders = await readdir(DEFAULT_SKILL_PRESET_DIRECTORY, { withFileTypes: true });
  const directories = folders.filter(entry => entry.isDirectory()).map(folder => path.join(DEFAULT_SKILL_PRESET_DIRECTORY, folder.name));
  directories.push(...['minimax-drama-prompt', 'minimax-fight-assets'].map(slug => path.join(DEFAULT_SKILL_PRESET_DIRECTORY, '..', slug)));
  for (const directory of directories) {
    const fields = await readSkillMetadata(directory);
    expect(fields.name, directory).toMatch(/[\u4e00-\u9fff]/);
    expect((fields.description.match(/[\u4e00-\u9fff]/g) || []).length, directory).toBeGreaterThanOrEqual(100);
    expect(fields.description.length, directory).toBeLessThanOrEqual(SKILL_DESCRIPTION_MAX_LENGTH);
  }
});

it('reloads official display metadata without granting identity or executable authority from JSON', async () => {
  const { file } = await setup();
  const directory = path.dirname(file), filename = path.join(directory, 'metadata.json');
  await writeFile(filename, JSON.stringify({ ...display, slug: 'forged', bundleId: 'forged', source: 'local' }));
  const registry = createOfficialSkillRegistry([{
    metadata: { slug: 'example', bundleId: 'trusted', version: '1.0.0' },
    readMetadata: () => readSkillMetadata(directory), readInstructions: async () => 'trusted instructions',
  }]);
  expect((await registry.list())[0]).toMatchObject({ ...display, slug: 'example', bundleId: 'trusted', source: 'official' });
  await writeFile(filename, JSON.stringify({ ...display, name: '新版名称', description: '新版简介' }));
  expect((await registry.list())[0]).toMatchObject({ name: '新版名称', description: '新版简介' });
  expect(await registry.readInstructions('example')).toBe('trusted instructions');
  await writeFile(filename, '{');
  await expect(registry.list()).rejects.toThrow('不是有效 JSON');
});

it('imports directory metadata while retaining local identity and regenerating storage fields', async () => {
  const { options } = await setup();
  const library = createAgentSkillLibrary({ ...options, presetDirectory: null });
  const imported = await library.importFiles([
    { path: 'SKILL.md', contentBase64: Buffer.from(original).toString('base64') },
    { path: 'metadata.json', contentBase64: Buffer.from(JSON.stringify({ ...display, source: 'official', bundleId: 'forged', slug: 'forged' })).toString('base64') },
  ]);
  expect(imported).toMatchObject({ ...display, slug: 'example', source: 'local', fileCount: 2 });
  expect(imported.bundleId).toBeUndefined();
});

it('preserves descriptions beyond 500 characters through import and listing', async () => {
  const { options } = await setup();
  const library = createAgentSkillLibrary({ ...options, presetDirectory: null });
  const description = '详细介绍适用场景、输入要求和交付内容。'.repeat(60);
  const files = [
    { path: 'SKILL.md', contentBase64: Buffer.from(original).toString('base64') },
    { path: 'metadata.json', contentBase64: Buffer.from(JSON.stringify({ ...display, description })).toString('base64') },
  ];
  const imported = await library.importFiles(files);
  expect(imported.description).toBe(description);
  expect((await createAgentSkillLibrary({ ...options, presetDirectory: null }).list()).find(skill => skill.slug === imported.slug).description).toBe(description);
  files[1].contentBase64 = Buffer.from(JSON.stringify({ ...display, description: '字'.repeat(SKILL_DESCRIPTION_MAX_LENGTH + 1) })).toString('base64');
  await expect(library.importFiles(files)).rejects.toThrow('名称或简介无效');
});
