import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareRelease } from './releaseAssets.mjs';
import './validateRelease.mjs';

const tag = process.env.GITHUB_REF_NAME;
const version = tag.slice(1);
const assets = await prepareRelease(path.resolve('release'), version);
const gh = args => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const releases = JSON.parse(gh(['api', `repos/${process.env.GH_REPO}/releases?per_page=100`]));
const existing = releases.find(release => release.tag_name === tag);
// Clients and members must never see a partially uploaded release.
if (existing) assert.ok(existing.draft, `Release ${tag} is already published; use a new version`);
else {
  const notes = path.resolve('release/notes.md');
  await writeFile(notes, [
    'Windows x64: install the setup.exe. macOS: choose the DMG matching your CPU.',
    'ZIP archives, macOS Sparkle delta packages and SHA-256 manifests are also included.',
    '',
    'The client keeps its configured HTTPS update service. Private GitHub Releases are for member downloads.',
    'For update-server deployment, use the original per-platform Actions artifacts.',
    'macOS now uses Sparkle with ad-hoc app signing and Ed25519 signed updates.',
    'Sparkle macOS clients use a compatible signed delta when smaller, with full ZIP fallback.',
    'Only macOS 1.5.5 and earlier require a one-time manual installation.',
    'On the update server, appcast-mac-arm64.xml and appcast-mac-x64.xml must each be named appcast.xml',
    'in their respective mac-arm64/ and mac-x64/ directories. Upload ZIP and all .delta assets before metadata.',
    'Do not edit the signed appcast. Automatic updates require uploading these assets to the configured HTTPS service.',
    '',
    'See docs/GitHub发布说明.md for signing, update deployment, and release instructions.',
  ].join('\n'));
  gh(['release', 'create', tag, '--verify-tag', '--draft', '--title', `Nako ${version}`,
    '--generate-notes', '--notes-file', notes]);
}
gh(['release', 'upload', tag, ...assets, '--clobber']);
gh(['release', 'edit', tag, '--draft=false', '--latest']);
console.log(`Published ${tag} with ${assets.length} assets`);
