import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareRelease, releasePlatforms } from './releaseAssets.mjs';
import './validateRelease.mjs';

const tag = process.env.GITHUB_REF_NAME;
const version = tag.slice(1);
const platform = releasePlatforms.find(item => item.target === (process.platform === 'darwin' ? 'mac' : 'win') && item.arch === process.arch);
assert.ok(platform, 'Unsupported release platform');
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const find = () => JSON.parse(gh(['api', `repos/${process.env.GH_REPO}/releases?per_page=100`])).find(item => item.tag_name === tag);
let release = find();
if (!release) {
  try { gh(['release', 'create', tag, '--verify-tag', '--draft', '--title', `Nako ${version}`, '--notes', 'Platform builds and verification in progress.']); }
  catch (error) { if (!find()) throw error; } // Another architecture may have created the same draft.
  release = find();
}
assert.ok(release?.draft, 'Only a draft release may receive staged assets');
const temp = await mkdtemp(path.join(os.tmpdir(), 'nako-release-'));
try {
  const source = path.join(temp, `Nako-${platform.target}-${platform.arch}`);
  await mkdir(source);
  for (const name of await readdir('release')) {
    if (name.startsWith(`Nako-${version}-`) && /\.(exe|dmg|zip|blockmap|delta)$/.test(name)
      || name === platform.metadata || name === `SHA256SUMS-${platform.target}-${platform.arch}.txt`) {
      await copyFile(path.join('release', name), path.join(source, name));
    }
  }
  const assets = await prepareRelease(temp, version, [platform]);
  gh(['release', 'upload', tag, ...assets, '--clobber']);
  console.log(`Staged ${platform.target}-${platform.arch}: ${assets.length} verified assets`);
} finally { await rm(temp, { recursive: true, force: true }); }
