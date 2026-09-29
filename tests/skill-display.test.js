import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createAgentSkillLibrary } from '../plugins/storage/agent-files/agentSkillLibrary.js';
import { presetSkillDisplay } from '../plugins/storage/agent-files/presetSkillDisplay.js';
import { DEFAULT_SKILL_PRESET_DIRECTORY } from '../plugins/storage/agent-files/userSkillPresets.js';
import { skillFrontmatter } from '../plugins/storage/agent-files/skillFrontmatter.js';

const roots = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
const original = '---\nname: example\ndescription: Original instructions\n---\n# Keep this instruction';
const localized = original.replace('name: example', 'name: example\ndisplay-name: 图像设计助手\ndisplay-description: 编写中文图像提示词。');
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nako-skill-display-'));
  roots.push(root);
  const presetDirectory = path.join(root, 'presets');
  await mkdir(path.join(presetDirectory, 'example'), { recursive: true });
  const file = path.join(presetDirectory, 'example', 'SKILL.md');
  await writeFile(file, original);
  return { file, options: { libraryDirectory: path.join(root, 'library'), presetDirectory } };
}

it('localizes existing presets without changing stored data, instructions or identity', async () => {
  const { file, options } = await setup();
  const library = createAgentSkillLibrary(options);
  await library.initialize();
  const metaFile = path.join(library.rootDirectory, 'example', 'metadata.json');
  const before = await readFile(metaFile);
  await writeFile(file, localized);
  const reopened = createAgentSkillLibrary(options);
  expect((await reopened.list()).find(skill => skill.slug === 'example')).toMatchObject({
    name: '图像设计助手', description: '编写中文图像提示词。', source: 'local', preset: true,
  });
  expect(await readFile(metaFile)).toEqual(before);
  expect(await reopened.loadInstructions(['example'])).toContain(original);
  await reopened.remove('example');
  expect((await createAgentSkillLibrary(options).list()).some(skill => skill.slug === 'example')).toBe(false);
});

it('uses display metadata for new imports and presets without deriving their slugs from it', async () => {
  const { file, options } = await setup();
  await writeFile(file, localized);
  const library = createAgentSkillLibrary(options);
  expect((await library.list()).find(skill => skill.preset)).toMatchObject({
    slug: 'example', name: '图像设计助手', description: '编写中文图像提示词。',
  });
  const imported = await library.importFiles([{ path: 'SKILL.md', contentBase64: Buffer.from(localized).toString('base64') }]);
  expect(imported).toMatchObject({ slug: 'example-2', name: '图像设计助手', description: '编写中文图像提示词。' });
  expect(imported.presetId).toBeUndefined();
});

it('preserves custom fields and does not translate unrelated imports by name', async () => {
  const { file, options } = await setup();
  await writeFile(file, localized);
  expect(await presetSkillDisplay(options.presetDirectory, {
    presetId: 'example', name: 'My edited title', description: 'Original instructions',
  })).toEqual({ description: '编写中文图像提示词。' });
  expect(await presetSkillDisplay(options.presetDirectory, {
    presetId: 'example', name: 'example', description: 'My edited summary',
  })).toEqual({ name: '图像设计助手' });
  expect(await presetSkillDisplay(options.presetDirectory, {
    name: 'example', description: 'Original instructions',
  })).toEqual({});
  for (const presetId of ['../example', '..\\example', 'C:\\example', '.', '..', 'missing']) {
    expect(await presetSkillDisplay(options.presetDirectory, { presetId })).toEqual({});
  }
});

it('ships Chinese display metadata for all presets', async () => {
  const folders = await readdir(DEFAULT_SKILL_PRESET_DIRECTORY, { withFileTypes: true });
  for (const folder of folders.filter(entry => entry.isDirectory())) {
    const fields = skillFrontmatter(await readFile(path.join(DEFAULT_SKILL_PRESET_DIRECTORY, folder.name, 'SKILL.md'), 'utf8'));
    expect(fields['display-name'], folder.name).toMatch(/[\u4e00-\u9fff]/);
    expect(fields['display-description'], folder.name).toMatch(/[\u4e00-\u9fff]/);
    expect(fields['display-description'].length).toBeLessThan(120);
  }
});
