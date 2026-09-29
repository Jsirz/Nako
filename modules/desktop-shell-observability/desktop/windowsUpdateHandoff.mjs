import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { ERRORS, PluginError } from '../../contracts/index.js';

const failure = message => new PluginError(ERRORS.desktopUpdate, message);
export async function validateInstaller(info) {
  const filename = info?.downloadedFile;
  const asset = info?.files?.find(file => /\.exe$/i.test(new URL(file.url, 'https://update.invalid/').pathname));
  if (!filename || !path.isAbsolute(filename) || !/\.exe$/i.test(filename) ||
      !asset?.sha512 || !/^\d+\.\d+\.\d+$/.test(info.version || ''))
    throw failure('更新安装包信息无效');
  const hash = createHash('sha512');
  for await (const part of createReadStream(filename)) hash.update(part);
  if (hash.digest('base64') !== asset.sha512) throw failure('更新安装包校验失败，请重新下载');
  return { installer: filename, sha512: asset.sha512, version: info.version };
}

/** Copy the helper outside the installation so NSIS can replace every application file. */
export async function launchWindowsUpdate({ info, tempDirectory, executable, quit,
  helper = new URL('./windows/NakoUpdate.exe', import.meta.url), launch = spawn,
  parentPid = process.pid, timeout = 15_000 }) {
  const verified = await validateInstaller(info);
  const directory = await mkdtemp(path.join(tempDirectory, 'nako-update-'));
  const helperFile = path.join(directory, 'NakoUpdate.exe');
  const jobFile = path.join(directory, 'job.json');
  await copyFile(helper, helperFile);
  await writeFile(jobFile, JSON.stringify({ ...verified, executable, parentPid,
    installDirectory: path.dirname(executable) }));
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    /^(SystemRoot|WINDIR|TEMP|TMP|USERPROFILE|LOCALAPPDATA|APPDATA|PATH|COMSPEC|NAKO_DESKTOP_(DATA|STATE)_ROOT)$/i.test(key)));
  const child = launch(helperFile, [jobFile], {
    // This is a GUI winexe: hiding its window also hides all installation progress.
    cwd: directory, detached: true, stdio: 'ignore', windowsHide: false, env: environment,
  });
  let failed;
  child.once('error', error => { failed = error; });
  child.once('exit', () => { failed = failure('独立更新程序已退出'); });
  child.unref();
  try {
    const deadline = Date.now() + timeout;
    while (true) {
      if (failed) throw failed;
      try { if (await readFile(path.join(directory, 'ready'), 'utf8') === 'ready') break; }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (Date.now() >= deadline) throw failure('独立更新窗口启动超时');
      await delay(100);
    }
    await writeFile(path.join(directory, 'commit'), 'install');
    quit();
  } catch (error) {
    await writeFile(path.join(directory, 'cancel'), 'cancel').catch(() => {});
    throw error;
  }
}

/** New application acknowledges successful startup, rather than just process creation. */
export async function acknowledgeUpdatedApplication(version) {
  const directory = process.env.NAKO_UPDATE_SESSION;
  delete process.env.NAKO_UPDATE_SESSION;
  if (!directory || !path.isAbsolute(directory) || !path.basename(directory).startsWith('nako-update-')) return;
  const job = JSON.parse(await readFile(path.join(directory, 'job.json'), 'utf8'));
  if (path.resolve(job.executable).toLowerCase() !== path.resolve(process.execPath).toLowerCase() || job.version !== version) return;
  await writeFile(path.join(directory, 'started'), version);
}
