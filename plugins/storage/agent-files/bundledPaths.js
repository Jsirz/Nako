import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDirectory = process.env.NAKO_APP_DIR
  ? path.resolve(process.env.NAKO_APP_DIR)
  : fileURLToPath(new URL('../../../', import.meta.url));
export const BUNDLED_MODULES_DIRECTORY = path.join(appDirectory, 'modules');
