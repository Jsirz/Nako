import { readFile } from 'node:fs/promises';

const metadata = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
const tag = process.env.GITHUB_REF_NAME;
if (!/^[0-9]+[.][0-9]+[.][0-9]+$/.test(metadata.version) || tag !== `v${metadata.version}`)
  throw new Error(`Release tag ${tag} must equal the stable package version v${metadata.version}`);
if (lock.version !== metadata.version || lock.packages[''].version !== metadata.version)
  throw new Error('package-lock.json version must match package.json');
console.log(`Release version verified: ${tag}`);
