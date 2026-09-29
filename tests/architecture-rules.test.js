import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  forbiddenModuleImport,
  findDependencyCycles,
  importSpecifiers,
  isBackendSource,
} from '../scripts/architecture/sourceGraph.mjs';
import { checkFileLimits, sourceLineCount } from '../scripts/architecture/fileLimits.mjs';

describe('source architecture gates', () => {
  it('scans static, re-export, dynamic, require and type-only imports', () => {
    const source = ts.createSourceFile(
      'fixture.ts',
      `
      import value from '../../scripts/release/tool.mjs';
      export { other } from '../../apps/backend/main.mjs';
      const lazy = import('../../scripts/lazy.mjs');
      const cjs = require('../../scripts/cjs.cjs');
      type Value = import('../../scripts/types').Value;
      const irrelevant = '../../scripts/not-an-import';
    `,
      99,
      true,
    );
    expect(importSpecifiers(source)).toHaveLength(5);
    expect(
      forbiddenModuleImport('modules/generation-core/router.js', 'scripts/release/tool.mjs'),
    ).toBe(true);
    expect(
      forbiddenModuleImport('modules\\local-runtime\\server.js', 'apps\\backend\\main.mjs'),
    ).toBe(true);
    expect(forbiddenModuleImport('scripts/build.mjs', 'modules/contracts/index.js')).toBe(false);
  });

  it('finds source-level cycles even without a plugin dependency cycle', () => {
    const edges = [
      ['local-runtime', 'workflow-runtime'],
      ['workflow-runtime', 'asset-media'],
      ['asset-media', 'local-runtime'],
      ['agent', 'agent'],
      ['generation-core', 'identity-account'],
    ].map(([from, to]) => ({ from, to }));
    expect(findDependencyCycles(edges)).toEqual([
      ['asset-media', 'local-runtime', 'workflow-runtime'],
    ]);
    expect(findDependencyCycles(edges.slice(0, 2))).toEqual([]);
    for (const file of [
      'modules/agent/dramaServerPlugin.js',
      'modules/agent/storyboardServerPlugin.js',
      'modules/agent/serverPlugin.js',
      'modules/agent/api/server/router.js',
    ])
      expect(isBackendSource(file)).toBe(true);
    expect(isBackendSource('modules/agent/ui/panel.ts')).toBe(false);
  });

  it('enforces 500 lines and monotonically decreasing recorded debt', () => {
    const code = (lines) => 'line\n'.repeat(lines);
    expect(sourceLineCount('line\r\n')).toBe(1);
    expect(checkFileLimits(new Map([['new.ts', code(500)]])).failures).toEqual([]);
    expect(checkFileLimits(new Map([['new.ts', code(501)]])).failures).toHaveLength(1);
    expect(checkFileLimits(new Map([['old.ts', code(400)]]), { 'old.ts': 400 }).failures).toHaveLength(1);
    const sources = new Map([['old.ts', code(600)]]);
    expect(checkFileLimits(sources, { 'old.ts': 600 }).failures).toEqual([]);
    expect(checkFileLimits(sources, { 'old.ts': 599 }).failures).toHaveLength(1);
    expect(checkFileLimits(sources, { 'old.ts': 601 }).failures).toHaveLength(1);
    expect(checkFileLimits(new Map(), { 'old.ts': 600 }).failures).toHaveLength(1);
    expect(checkFileLimits(sources, { 'old.ts': 600 }, { strict: true }).failures).toHaveLength(1);
  });
});
