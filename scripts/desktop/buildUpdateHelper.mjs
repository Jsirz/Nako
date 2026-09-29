import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export async function buildUpdateHelper(root, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  const compiler = path.join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe');
  const source = path.join(root, 'modules/desktop-shell-observability/desktop/windows');
  const args = ['/nologo', '/target:winexe', '/optimize+', '/utf8output', `/out:${destination}`,
    `/win32icon:${path.join(root, 'public/nako-app.ico')}`, '/reference:System.Windows.Forms.dll',
    '/reference:System.Drawing.dll', '/reference:System.Web.Extensions.dll',
    path.join(source, 'UpdateWorker.cs'), path.join(source, 'UpdateWindow.cs')];
  await new Promise((resolve, reject) => {
    const child = spawn(compiler, args, { windowsHide: true, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Update helper build failed (${code})`)));
  });
}
