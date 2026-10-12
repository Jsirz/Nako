import crypto from 'node:crypto';
import path from 'node:path';
import { showcaseArchiveSource } from '../../../contracts/showcaseArchive.js';
import { PROJECT_TRANSFER_ERRORS, ProjectTransferError } from '../../../contracts/projectErrors.js';
import { readProjectArchive, readProjectArchiveDocument } from './projectArchive.js';

/** Only catalog-listed sources may populate this user's archive cache. */
export function createShowcaseArchiveCache({ files, shareDirectory, cacheDirectory, maxArchiveBytes, maxArchiveEntries,
  acquire = () => () => {} }) {
  const pending = new Map();
  async function prepare(source, directory) {
    const archivePath = path.join(directory, 'project.nako');
    const extractionDirectory = path.join(directory, 'extracted');
    if (files.exists(archivePath)) {
      try {
        await files.statLocalArchive(archivePath, maxArchiveBytes);
        return { archivePath, extractionDirectory, ...await readProjectArchiveDocument({ extractionDirectory, files }) };
      } catch { await files.remove(directory, { recursive: true, force: true }); }
    }
    await files.mkdir(cacheDirectory, { recursive: true });
    const staging = await files.createTemporaryDirectory('.download-', cacheDirectory);
    const downloadedPath = path.join(staging, 'project.nako');
    try {
      if (source.startsWith('/share/')) {
        const filename = path.join(shareDirectory, ...source.slice('/share/'.length).split('/').map(decodeURIComponent));
        await files.statLocalArchive(filename, maxArchiveBytes);
        await files.copy(filename, downloadedPath, { force: false, errorOnExist: true });
      } else {
        await files.downloadArchive(source, downloadedPath, maxArchiveBytes);
      }
      const document = await readProjectArchive({ archivePath: downloadedPath,
        extractionDirectory: path.join(staging, 'extracted'), maxArchiveEntries, files });
      // Only complete, validated archives become visible to later requests.
      await files.move(staging, directory);
      return { archivePath, extractionDirectory, ...document };
    } finally {
      await files.remove(staging, { recursive: true, force: true });
    }
  }
  return {
    acquire,
    async get(value) {
      const release = acquire();
      try {
        const source = showcaseArchiveSource(value);
        if (!source) throw new ProjectTransferError('案例归档地址无效。');
        let catalog;
        try { catalog = JSON.parse(await files.readText(path.join(shareDirectory, 'index.json'))); }
        catch { throw new ProjectTransferError('案例列表读取失败。', 500, PROJECT_TRANSFER_ERRORS.showcaseMissing); }
        if (!Array.isArray(catalog) || !catalog.some(item => item?.archive === source))
          throw new ProjectTransferError('案例不在作品展示列表中。', 404, PROJECT_TRANSFER_ERRORS.showcaseMissing);
        const key = crypto.createHash('sha256').update(source).digest('hex');
        if (!pending.has(key)) {
          const download = prepare(source, path.join(cacheDirectory, key));
          pending.set(key, download);
          void download.finally(() => pending.delete(key)).catch(() => {});
        }
        return await pending.get(key);
      } finally { release(); }
    },
  };
}
