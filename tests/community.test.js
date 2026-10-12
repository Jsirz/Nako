import { describe, it, expect } from 'vitest';
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createOfficialSkillRegistry } from '../plugins/storage/agent-files/officialSkillRegistry.js';
import { readOfficialDramaInstructions } from '../plugins/storage/agent-files/skillInstructions.js';
import {
  normalizeApiWorkflow,
  analyzeWorkflow,
} from '../modules/workflow-runtime/api/server/workflowRuntime/workflowFormat.js';
import { resolveInstallation } from '../apps/desktop/src/installation.mjs';
import { createBackendEnvironment } from '../apps/desktop/src/backendEnvironment.mjs';

describe('public source boundary', () => {
  it('offers only open skills and reads every one without private templates', async () => {
    const registry = createOfficialSkillRegistry(undefined, readOfficialDramaInstructions);
    expect((await registry.list()).map((item) => item.slug)).toEqual([
      'minimax-drama-prompt',
      'minimax-fight-assets',
    ]);
    for (const skill of await registry.list()) {
      expect(skill.openness).toBe('open');
      expect((await registry.readInstructions(skill.slug)).length).toBeGreaterThan(100);
    }
    await expect(registry.readInstructions('closed-drama')).rejects.toThrow();
    await expect(registry.readInstructions('minimax-drama-high')).rejects.toThrow();
  });
  it('loads local platform helpers without identity configuration or update bridge', async () => {
    const install = resolveInstallation({
      packaged: false,
      sourceRoot: process.cwd(),
      executablePath: 'electron.exe',
      environment: {},
    });
    const helpers = await (
      await import('../apps/desktop/src/backendEnvironment.mjs')
    ).loadReleaseHelpers(install.tools);
    expect(helpers.loadIdentityConfiguration).toBeUndefined();
    expect(install.updateBridge).toBeUndefined();
    expect(install.identityRuntimeConfig).toBeUndefined();
  });
  it('keeps ComfyUI import normalization and rejects dependent incomplete nodes', () => {
    const source = {
      1: { class_type: 'CLIPTextEncode', inputs: { text: 'test' } },
      2: { inputs: {} },
    };
    expect(Object.keys(normalizeApiWorkflow(source))).toEqual(['1']);
    expect(Object.keys(source)).toEqual(['1', '2']);
    expect(() =>
      normalizeApiWorkflow({
        1: { class_type: 'SaveImage', inputs: { images: ['2', 0] } },
        2: { inputs: {} },
      }),
    ).toThrow();
  });
  it('excludes private skills and includes the authorized preview catalogues', async () => {
    const names = await (
      await import('node:fs/promises')
    ).readdir('modules/agent/server/agent/builtin');
    expect(names.some((name) => name.startsWith('closed-') || name === 'shared-assets')).toBe(
      false,
    );
    for (const name of ['creativeCatalog', 'mjStyleCatalog'])
      expect(
        JSON.parse(await readFile(`modules/agent/ui/prompt/${name}.json`, 'utf8')),
      ).not.toHaveLength(0);
    const preload = await readFile('apps/desktop/src/preload.cjs', 'utf8');
    expect(preload).not.toContain('account: Object.freeze');
  });
});
