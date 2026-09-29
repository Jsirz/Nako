import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DirectoryGrantError } from '../../../contracts/directoryGrantError.js';
const execFileAsync = promisify(execFile);

export async function selectDirectoryWithSystemDialog({
  description = '选择 ComfyUI 输入目录',
  runCommand = execFileAsync,
  platform = process.platform,
} = {}) {
  if (platform !== 'win32') {
    throw new DirectoryGrantError('当前系统暂不支持目录选择器', 'DIRECTORY_PICKER_UNAVAILABLE', 501);
  }
  const safeDescription = String(description || '选择目录')
    .replace(/[\r\n\0]/gu, ' ')
    .slice(0, 200)
    .replaceAll("'", "''");
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$owner = New-Object System.Windows.Forms.Form',
    '$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen',
    '$owner.ShowInTaskbar = $false',
    '$owner.TopMost = $true',
    "$owner.Text = 'Nako 画布'",
    '$owner.Width = 1',
    '$owner.Height = 1',
    '$dialog = New-Object System.Windows.Forms.FolderBrowserDialog',
    `$dialog.Description = '${safeDescription}'`,
    '$dialog.ShowNewFolderButton = $false',
    '$owner.Show()',
    '$owner.Activate()',
    '$result = $dialog.ShowDialog($owner)',
    '$owner.Close()',
    '$owner.Dispose()',
    'if ($result -eq [System.Windows.Forms.DialogResult]::OK) {',
    '  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
    '  Write-Output $dialog.SelectedPath',
    '}',
  ].join('\n');
  const { stdout } = await runCommand('powershell.exe', [
    '-NoProfile',
    '-WindowStyle',
    'Hidden',
    '-STA',
    '-Command',
    script,
  ], {
    windowsHide: true,
    timeout: 2 * 60_000,
    maxBuffer: 64 * 1024,
  });
  const selected = String(stdout || '').trim();
  if (!selected) throw new DirectoryGrantError('已取消选择目录', 'DIRECTORY_PICKER_CANCELLED', 409);
  return selected;
}

