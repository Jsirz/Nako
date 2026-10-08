import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';

export function defaultOpenBrowser(url, browser = 'default') {
  if (browser !== 'default') {
    const suffix = browser === 'edge' ? 'Microsoft/Edge/Application/msedge.exe' : 'Google/Chrome/Application/chrome.exe';
    const executable = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]
      .filter(Boolean).map((root) => path.join(root, suffix)).find(existsSync);
    if (!executable) throw localRuntimeError('未找到所选浏览器，请复制授权链接到该浏览器打开。', 'openDreaminaBrowser', 'DREAMINA_BROWSER_MISSING', 400);
    return new Promise((resolve, reject) => {
      const child = spawn(executable, [url], { detached: true, stdio: 'ignore', windowsHide: false });
      child.once('spawn', () => { child.unref(); resolve(); });
      child.once('error', reject);
    });
  }
  return new Promise((resolve, reject) => {
    const child = spawn('explorer.exe', [url], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
    child.once('error', reject);
  });
}
