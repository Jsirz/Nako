import fs from 'node:fs';
import { access, cp, mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import * as tar from 'tar';
import { PROJECT_TRANSFER_ERRORS, ProjectTransferError } from '../../../modules/contracts/projectErrors.js';
import { downloadShowcaseVideo } from './showcaseVideoDownload.js';

async function copyNewTree(sourceDirectory, targetDirectory, createdPaths) {
  if (!fs.existsSync(sourceDirectory)) return;
  if (!fs.existsSync(targetDirectory)) {
    await mkdir(targetDirectory, { recursive: true });
    createdPaths.push(targetDirectory);
  }
  for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDirectory, entry.name);
    const targetPath = path.join(targetDirectory, entry.name);
    if (entry.isDirectory()) {
      await copyNewTree(sourcePath, targetPath, createdPaths);
    } else if (entry.isFile() && !fs.existsSync(targetPath)) {
      await cp(sourcePath, targetPath, { force: false, errorOnExist: true });
      createdPaths.push(targetPath);
    }
  }
}

async function receiveArchive(request, archivePath, maxArchiveBytes, options = {}) {
  if (Number(request.headers['content-length'] || 0) > maxArchiveBytes)
    throw new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE');
  let receivedBytes = 0;
  const sizeGuard = new Transform({
    transform(chunk, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maxArchiveBytes) {
        callback(new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE'));
        return;
      }
      callback(null, chunk);
    },
  });
  await pipeline(request, sizeGuard, fs.createWriteStream(archivePath, { flags: 'wx' }), options);
  if (!receivedBytes) throw new ProjectTransferError('项目备份文件为空');
}

async function downloadArchive(url, archivePath, maxArchiveBytes) {
  const signal = AbortSignal.timeout(10 * 60 * 1000);
  let response;
  try {
    response = await fetch(url, { signal, redirect: 'error' });
    if (!response.ok || !response.body)
      throw new ProjectTransferError('案例文件下载失败，请检查 OSS 地址或访问权限。', 502, PROJECT_TRANSFER_ERRORS.download);
    const stream = Readable.fromWeb(response.body);
    stream.headers = { 'content-length': response.headers.get('content-length') || '' };
    await receiveArchive(stream, archivePath, maxArchiveBytes, { signal });
  } catch (error) {
    await response?.body?.cancel().catch(() => {});
    if (error instanceof ProjectTransferError) throw error;
    throw new ProjectTransferError('案例文件下载中断或超时，请重试。', 502, PROJECT_TRANSFER_ERRORS.download);
  }
}

async function statLocalArchive(value, maxArchiveBytes) {
  if (typeof value !== 'string' || !value || value.includes('\0') || !path.isAbsolute(value))
    throw new ProjectTransferError('项目备份路径无效', 400, 'ARCHIVE_PATH_INVALID');
  let stats;
  try {
    stats = await stat(value);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR')
      throw new ProjectTransferError('项目备份文件不存在', 404, 'ARCHIVE_NOT_FOUND');
    throw new ProjectTransferError('无法读取项目备份文件');
  }
  if (!stats.isFile()) throw new ProjectTransferError('项目备份路径不是文件', 400, 'ARCHIVE_PATH_INVALID');
  if (stats.size > maxArchiveBytes) throw new ProjectTransferError('项目备份文件过大', 413, 'ARCHIVE_TOO_LARGE');
  if (!stats.size) throw new ProjectTransferError('项目备份文件为空');
  return value;
}

async function validateArchive(archivePath, maxArchiveEntries, { isAllowedEntry, requiredEntries, label }) {
  let entryCount = 0;
  let validationError = null;
  const seenEntries = new Set();
  try {
    await tar.list({
      file: archivePath,
      strict: true,
      onentry(entry) {
        entryCount += 1;
        const entryPath = String(entry.path || '').replaceAll('\\', '/').replace(/\/+$/, '');
        if (!validationError && entryPath === 'agent.json' && (entry.type !== 'File' || entry.size > 32 * 1024 * 1024)) {
          validationError = new ProjectTransferError('聊天记录文件无效或超过 32 MB');
        } else if (!validationError && entryCount > maxArchiveEntries) {
          validationError = new ProjectTransferError('项目备份文件包含过多文件', 413, 'TOO_MANY_ENTRIES');
        } else if (!validationError && (!isAllowedEntry(entryPath) || !['File', 'Directory'].includes(entry.type))) {
          validationError = new ProjectTransferError(`${label}包含不安全条目：${entryPath}`);
        } else if (!validationError && seenEntries.has(entryPath)) {
          validationError = new ProjectTransferError(`${label}包含重复条目：${entryPath}`);
        }
        seenEntries.add(entryPath);
      },
    });
  } catch (error) {
    if (error instanceof ProjectTransferError) throw error;
    throw new ProjectTransferError('无法读取项目备份文件');
  }
  if (validationError) throw validationError;
  const missingEntries = requiredEntries.filter(entry => !seenEntries.has(entry));
  if (missingEntries.length) throw new ProjectTransferError(`${label}缺少 ${missingEntries.join(' 或 ')}`);
}

/** Local archive and snapshot I/O stays behind the storage adapter boundary. */
export function createProjectFileStore() {
  return Object.freeze({
    exists: filename => fs.existsSync(filename),
    ensureDirectory: directory => { fs.mkdirSync(directory, { recursive: true }); },
    createTemporaryDirectory: (prefix, parentDirectory = os.tmpdir()) => mkdtemp(path.join(parentDirectory, prefix)),
    mkdir,
    copy: cp,
    move: rename,
    remove: rm,
    readText: filename => readFile(filename, 'utf8'),
    writeText: (filename, text) => writeFile(filename, text, 'utf8'),
    size: async filename => (await stat(filename)).size,
    readable: filename => access(filename, fs.constants.R_OK),
    createArchive: (options, entries) => tar.create(options, entries),
    extractArchive: options => tar.extract(options),
    copyNewTree,
    async removeCreatedPaths(paths) {
      for (const filename of [...new Set(paths)].sort((a, b) => b.length - a.length))
        await rm(filename, { recursive: true, force: true });
    },
    receiveArchive,
    downloadArchive,
    downloadVideo: downloadShowcaseVideo,
    statLocalArchive,
    validateArchive,
    writeSnapshot(filename, snapshot) {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2), 'utf8');
      return filename;
    },
  });
}
