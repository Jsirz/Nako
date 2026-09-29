import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { ensureMediaRuntime } from './mediaRuntime.mjs';

const { values } = parseArgs({ options: { check: { type: 'boolean' }, archive: { type: 'string' } } });
const appRoot = fileURLToPath(new URL('../../', import.meta.url));
console.log(values.check ? 'Checking local media components...' : 'Preparing local media components (download only if missing or damaged)...');
try {
  const versions = await ensureMediaRuntime({ appRoot, archive: values.archive, checkOnly: values.check });
  console.log(`Media runtime ready: ffmpeg ${versions.ffmpeg}; ffprobe ${versions.ffprobe}`);
} catch (error) {
  console.error(`Media setup failed: ${error.message}`);
  process.exitCode = 1;
}
