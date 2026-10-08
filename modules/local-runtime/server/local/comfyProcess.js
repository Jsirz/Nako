import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import { createModuleLogger } from '../../../kernel/logger.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { normalizeLocalComfyServer } from '../../../contracts/comfyServerAddress.js';
import { redactSecretsOnly } from '../../../identity-account/api/server/security/redaction.js';
import { RUNTIME_PATHS } from '../../../project/api/server/workspace/runtimePaths.js';

const execFileAsync = promisify(execFile);

const DEFAULT_START_TIMEOUT_MS = 180_000;
const MIN_START_TIMEOUT_MS = 10_000;
const MAX_START_TIMEOUT_MS = 900_000;
const DEFAULT_PORT = 8188;

const PYTHON_CANDIDATES = process.platform === 'win32'
  ? [
    ['python', 'python.exe'],
    ['python_embeded', 'python.exe'],
    ['python_embedded', 'python.exe'],
    ['LCM-Python', 'python.exe'],
    ['venv', 'Scripts', 'python.exe'],
    ['.venv', 'Scripts', 'python.exe'],
  ]
  : [
    ['python', 'bin', 'python3'],
    ['venv', 'bin', 'python'],
    ['.venv', 'bin', 'python'],
  ];

const ENTRY_CANDIDATES = [['ComfyUI', 'main.py'], ['main.py']];

// 端口与监听地址由本机边界决定；网页打开也由 Nako 在服务就绪后统一处理，
// 避免 ComfyUI 的 --auto-launch 和画布各弹一次。
const RESERVED_VALUE_ARG_FLAGS = ['--listen', '--port'];
const RESERVED_SWITCH_ARG_FLAGS = ['--auto-launch'];

function delay(milliseconds) {
  return new Promise((resolve) => { setTimeout(resolve, milliseconds); });
}

function samePath(left, right) {
  const a = path.resolve(String(left || ''));
  const b = path.resolve(String(right || ''));
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function clampTimeout(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_START_TIMEOUT_MS;
  return Math.min(MAX_START_TIMEOUT_MS, Math.max(MIN_START_TIMEOUT_MS, Math.trunc(parsed)));
}

export function parseExtraArgs(raw) {
  const tokens = String(raw || '').trim().split(/\s+/).filter(Boolean);
  const args = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (/[\r\n\0]/.test(token)) continue;
    if (RESERVED_VALUE_ARG_FLAGS.includes(token)) {
      index += 1;
      continue;
    }
    if (RESERVED_SWITCH_ARG_FLAGS.includes(token)) continue;
    if (
      [...RESERVED_VALUE_ARG_FLAGS, ...RESERVED_SWITCH_ARG_FLAGS]
        .some((flag) => token.startsWith(`${flag}=`))
    ) continue;
    args.push(token);
  }
  return args;
}

export function readComfyLaunchConfig(environment = process.env) {
  return {
    autoStart: String(environment.COMFYUI_AUTO_START || '').trim().toLowerCase() === 'true',
    root: String(environment.COMFYUI_ROOT || '').trim(),
    pythonOverride: String(environment.COMFYUI_PYTHON || '').trim(),
    extraArgs: parseExtraArgs(environment.COMFYUI_EXTRA_ARGS),
    startTimeoutMs: clampTimeout(environment.COMFYUI_START_TIMEOUT_MS),
    serverUrl: String(environment.COMFYUI_SERVER_URL || '').trim() || `127.0.0.1:${DEFAULT_PORT}`,
  };
}

export function resolveComfyAddress(serverUrl) {
  const address = normalizeLocalComfyServer(serverUrl);
  const [host, port] = address.split(':');
  return { address, host: host || '127.0.0.1', port: Number(port) || DEFAULT_PORT };
}

function failure(diagnosticCode, message, actions) {
  return { ok: false, diagnosticCode, message, actions };
}

export function detectComfyInstallation(
  { root, pythonOverride } = {},
  { fileSystem = fs } = {},
) {
  const normalizedRoot = String(root || '').trim();
  if (!normalizedRoot) {
    return failure(
      'COMFYUI_ROOT_NOT_CONFIGURED',
      '尚未设置本机 ComfyUI 安装目录。',
      ['在设置的「本机服务」中填写 ComfyUI 安装目录。'],
    );
  }
  const resolvedRoot = path.resolve(normalizedRoot);
  const isDirectory = (target) => {
    try { return fileSystem.statSync(target).isDirectory(); } catch { return false; }
  };
  const isFile = (target) => {
    try { return fileSystem.statSync(target).isFile(); } catch { return false; }
  };

  if (!isDirectory(resolvedRoot)) {
    return failure(
      'COMFYUI_ROOT_NOT_FOUND',
      '设置的 ComfyUI 安装目录不存在。',
      ['确认目录路径是否正确，或重新选择 ComfyUI 安装目录。'],
    );
  }

  const entry = ENTRY_CANDIDATES
    .map((segments) => path.join(resolvedRoot, ...segments))
    .find(isFile);
  if (!entry) {
    return failure(
      'COMFYUI_ENTRY_NOT_FOUND',
      '在设置的目录下找不到 ComfyUI 的 main.py。',
      ['选择包含 ComfyUI 目录或 main.py 的安装根目录。'],
    );
  }

  // When the user selects the inner ComfyUI folder, its bundled Python may be a sibling.
  const pythonRoots = [resolvedRoot];
  if (path.basename(resolvedRoot).toLowerCase() === 'comfyui') {
    pythonRoots.push(path.dirname(resolvedRoot));
  }
  const python = pythonOverride
    ? (isFile(path.resolve(pythonOverride)) ? path.resolve(pythonOverride) : null)
    : pythonRoots.flatMap(candidateRoot => PYTHON_CANDIDATES.map(segments => path.join(candidateRoot, ...segments))).find(isFile);
  if (!python) {
    return failure(
      'COMFYUI_PYTHON_NOT_FOUND',
      '找不到 ComfyUI 使用的 Python 解释器。',
      ['确认整合包自带的 python 目录存在，或在设置中指定 Python 解释器路径。'],
    );
  }

  return { ok: true, root: resolvedRoot, entry, python, cwd: path.dirname(entry) };
}

export function buildComfyLaunchArgs({ entry, port, extraArgs = [] }) {
  // -u 关闭 Python 的输出缓冲。ComfyUI 是长驻进程，缓冲的话日志要等到它退出才落盘，
  // 排错时等于没有日志。
  return ['-s', '-u', entry, '--listen', '127.0.0.1', '--port', String(port), ...extraArgs];
}

export function buildComfySpawnOptions({ cwd, stdio, platform = process.platform }) {
  return {
    cwd,
    // Windows 的 detached 会先分配独立控制台，再由 windowsHide 隐藏。
    // 某些系统上这个过程会闪出 cmd/conhost；直接不创建控制台才是稳定的无窗口启动。
    detached: platform !== 'win32',
    windowsHide: true,
    shell: false,
    stdio,
  };
}

export function isProcessAliveDefault(pid) {
  const normalizedPid = Number(pid);
  if (!Number.isInteger(normalizedPid) || normalizedPid <= 0) return false;
  try {
    process.kill(normalizedPid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function inspectProcessDefault(pid) {
  if (process.platform === 'win32') {
    try {
      const command = `[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);$p=Get-CimInstance Win32_Process -Filter 'ProcessId = ${Number(pid)}';if($p){$p|Select-Object ProcessId,ExecutablePath,CommandLine|ConvertTo-Json -Compress}`;
      const { stdout } = await execFileAsync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', command],
        { windowsHide: true },
      );
      return stdout.trim() ? JSON.parse(stdout) : null;
    } catch {
      return null;
    }
  }
  try {
    const commandLine = (await readFile(`/proc/${Number(pid)}/cmdline`, 'utf8')).replaceAll('\0', ' ');
    const executablePath = await fs.promises.readlink(`/proc/${Number(pid)}/exe`);
    return { ProcessId: Number(pid), ExecutablePath: executablePath, CommandLine: commandLine };
  } catch {
    return null;
  }
}

/**
 * ComfyUI 的输出写进 Nako 的日志目录，与产品自身后端的做法一致
 * （见 scripts/release/runtimeControl.mjs）。便携版里用户双击 exe 全程没有控制台，
 * 单独给 ComfyUI 开一个黑窗口会是唯一的异类，而且用户误关就等于杀掉它。
 */
export function openComfyLogTargetsDefault(logsDirectory = RUNTIME_PATHS.LOGS_DIR) {
  fs.mkdirSync(logsDirectory, { recursive: true });
  const stdout = fs.openSync(path.join(logsDirectory, 'comfyui-stdout.log'), 'a');
  const stderr = fs.openSync(path.join(logsDirectory, 'comfyui-stderr.log'), 'a');
  return {
    stdio: ['ignore', stdout, stderr],
    close() {
      for (const descriptor of [stdout, stderr]) {
        try { fs.closeSync(descriptor); } catch { /* 已关闭 */ }
      }
    },
  };
}

const MAX_LOG_TAIL_BYTES = 128 * 1024;
const MAX_LOG_TAIL_LINES = 400;
// ComfyUI 的输出带 ANSI 颜色码，直接显示会是一堆 [32m 之类的噪音。
// eslint-disable-next-line no-control-regex -- Deliberately reject or strip control characters.
const ANSI_PATTERN = /\[[0-9;]*m/g;

/**
 * 读取 ComfyUI 日志尾部。文件是 UTF-8（不是 Windows 控制台代码页），
 * 从末尾截取时可能切断多字节字符，所以丢掉第一行残句。
 */
export function readComfyLogTail({
  logsDirectory = RUNTIME_PATHS.LOGS_DIR,
  lines = 200,
  fileSystem = fs,
} = {}) {
  const limit = Math.min(MAX_LOG_TAIL_LINES, Math.max(1, Number(lines) || 200));
  const streams = {};
  for (const stream of ['stdout', 'stderr']) {
    const target = path.join(logsDirectory, `comfyui-${stream}.log`);
    let text;
    let truncated;
    try {
      const { size } = fileSystem.statSync(target);
      const start = Math.max(0, size - MAX_LOG_TAIL_BYTES);
      truncated = start > 0;
      const descriptor = fileSystem.openSync(target, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(size, MAX_LOG_TAIL_BYTES));
        fileSystem.readSync(descriptor, buffer, 0, buffer.length, start);
        text = buffer.toString('utf8');
      } finally {
        fileSystem.closeSync(descriptor);
      }
    } catch {
      streams[stream] = { lines: [], available: false };
      continue;
    }
    const all = text.replace(ANSI_PATTERN, '').split(/\r?\n/);
    if (truncated && all.length > 1) all.shift();
    streams[stream] = {
      available: true,
      lines: all.filter((line) => line.trim()).slice(-limit).map(redactSecretsOnly),
    };
  }
  return streams;
}

export function isPortFreeDefault(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen({ host, port, exclusive: true }, () => {
      server.close(() => resolve(true));
    });
  });
}

export async function terminateProcessDefault(pid, signal) {
  if (process.platform === 'win32') {
    if (signal === 'force') {
      try { process.kill(pid, 'SIGKILL'); } catch { /* 可能已退出 */ }
      return;
    }
    try {
      await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
    } catch { /* 回退由调用方的 force 阶段处理 */ }
    return;
  }
  try { process.kill(pid, signal === 'force' ? 'SIGKILL' : 'SIGTERM'); } catch { /* 可能已退出 */ }
}

export function openComfyBrowserDefault(url) {
  const command = process.platform === 'win32'
    ? 'rundll32.exe'
    : (process.platform === 'darwin' ? 'open' : 'xdg-open');
  const args = process.platform === 'win32'
    ? ['url.dll,FileProtocolHandler', url]
    : [url];
  const child = execFile(command, args, { windowsHide: true }, () => {});
  child.unref?.();
}

export function isOwnedComfyProcess(details, record) {
  if (!details || !record) return false;
  const commandLine = String(details.CommandLine || '');
  return Number(details.ProcessId) === Number(record.pid)
    && samePath(details.ExecutablePath, record.python)
    && commandLine.includes(String(record.entry || ''))
    && commandLine.includes(`--port ${record.port}`);
}

function readComfyProcessPhase({ running, owned, startable }) {
  if (running) return owned ? 'running' : 'external';
  if (owned) return 'starting';
  return startable ? 'idle' : 'unavailable';
}

class ComfyProcessController {
  constructor({
  probeComfy,
  readConfig = () => readComfyLaunchConfig(),
  spawnProcess = spawn,
  inspectProcess = inspectProcessDefault,
  isProcessAlive = isProcessAliveDefault,
  terminateProcess = terminateProcessDefault,
  openLogTargets = openComfyLogTargetsDefault,
  openBrowser = openComfyBrowserDefault,
  readLogTail = readComfyLogTail,
  logsDirectory = RUNTIME_PATHS.LOGS_DIR,
  isPortFree = isPortFreeDefault,
  recordPath = path.join(RUNTIME_PATHS.RUN_DIR, 'comfyui-process.json'),
  fileSystem = fs,
  sleep = delay,
  pollIntervalMs = 1_500,
  logger = createModuleLogger('local-runtime'),
  } = {}) {
    if (typeof probeComfy !== 'function') throw localRuntimeError('probeComfy is required', 'createComfyProcessController', ERRORS.invalidConfiguration);
    Object.assign(this, {
      probeComfy, readConfig, spawnProcess, inspectProcess, isProcessAlive,
      terminateProcess, openLogTargets, openBrowser, readLogTail, logsDirectory,
      isPortFree, recordPath, fileSystem, sleep, pollIntervalMs, logger,
    });
    this.pendingStart = null;
  }

  async readRecord() {
    try {
      const parsed = JSON.parse(await readFile(this.recordPath, 'utf8'));
      return parsed && Number(parsed.pid) > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  async writeRecord(record) {
    await mkdir(path.dirname(this.recordPath), { recursive: true });
    const temporary = `${this.recordPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
    await rename(temporary, this.recordPath);
  }

  async clearRecord() {
    await rm(this.recordPath, { force: true });
  }

  // 只承认既有记录、又通过命令行核对的进程，避免 PID 复用误伤别的程序。
  async ownedRecord() {
    const record = await this.readRecord();
    if (!record) return null;
    const details = await this.inspectProcess(record.pid);
    if (!isOwnedComfyProcess(details, record)) return null;
    return record;
  }

  // 状态轮询只检查记录 PID 是否仍存在。这里不能反复启动 PowerShell/CIM，
  // 否则前端每次刷新状态都会创建 conhost，造成用户看到 CMD 持续闪烁。
  // 真正执行停止前仍由 ownedRecord() 做完整命令行核验，避免 PID 复用误伤。
  async liveRecordedProcess() {
    const record = await this.readRecord();
    if (!record) return null;
    return await this.isProcessAlive(record.pid) ? record : null;
  }

  describeAddress(config) {
    try {
      return resolveComfyAddress(config.serverUrl);
    } catch {
      return null;
    }
  }

  async getState() {
    const config = this.readConfig();
    const resolved = this.describeAddress(config);
    if (!resolved) {
      return {
        phase: 'unavailable',
        autoStart: config.autoStart,
        running: false,
        owned: false,
        startable: false,
        address: null,
        diagnosticCode: 'NON_LOCAL_COMFY_SERVER',
        message: 'ComfyUI 只允许使用本机回环地址。',
        actions: ['把 ComfyUI 地址改为 127.0.0.1:8188。'],
      };
    }
    const [probe, record] = await Promise.all([this.probeComfy(resolved.address), this.liveRecordedProcess()]);
    const installation = detectComfyInstallation(config, { fileSystem: this.fileSystem });
    const startupFailure = !probe?.ok ? record?.startupFailure : null;
    const state = {
      autoStart: config.autoStart,
      running: Boolean(probe?.ok),
      owned: Boolean(record),
      pid: record?.pid,
      address: resolved.address,
      startable: installation.ok === true,
      installedPython: installation.ok ? installation.python : undefined,
      installedEntry: installation.ok ? installation.entry : undefined,
      ...(installation.ok ? {} : {
        diagnosticCode: installation.diagnosticCode,
        message: installation.message,
        actions: installation.actions,
      }),
      ...(startupFailure || {}),
    };
    return { phase: startupFailure ? 'failed' : readComfyProcessPhase(state), ...state };
  }

  async runStart({ timeoutMs } = {}) {
    const config = this.readConfig();
    const resolved = this.describeAddress(config);
    if (!resolved) {
      return {
        status: 'failed',
        diagnosticCode: 'NON_LOCAL_COMFY_SERVER',
        message: 'ComfyUI 只允许使用本机回环地址。',
        actions: ['把 ComfyUI 地址改为 127.0.0.1:8188。'],
      };
    }

    const alreadyRunning = await this.probeComfy(resolved.address);
    if (alreadyRunning?.ok) {
      const record = await this.ownedRecord();
      return { status: 'ready', address: resolved.address, owned: Boolean(record), pid: record?.pid };
    }

    // 进程还活着但服务未就绪：复用已有状态；若已超时则继续报告失败，绝不重复拉起。
    const starting = await this.ownedRecord();
    if (starting) {
      if (starting.startupFailure) {
        return {
          status: 'failed',
          address: resolved.address,
          owned: true,
          pid: starting.pid,
          ...starting.startupFailure,
        };
      }
      return { status: 'starting', address: resolved.address, owned: true, pid: starting.pid };
    }

    const installation = detectComfyInstallation(config, { fileSystem: this.fileSystem });
    if (!installation.ok) {
      return {
        status: 'failed',
        diagnosticCode: installation.diagnosticCode,
        message: installation.message,
        actions: installation.actions,
      };
    }

    // ComfyUI 探测失败但端口被占：是别的程序占了，直接说清楚，
    // 不要让用户等满三分钟才拿到一个"启动超时"。
    if (!await this.isPortFree(resolved.port, resolved.host)) {
      return {
        status: 'failed',
        diagnosticCode: 'COMFYUI_PORT_IN_USE',
        message: `端口 ${resolved.port} 已被其他程序占用。`,
        actions: [
          '关闭占用该端口的程序后重试。',
          '或在设置中把 ComfyUI 地址改为另一个本机端口。',
        ],
      };
    }

    const args = buildComfyLaunchArgs({
      entry: installation.entry,
      port: resolved.port,
      extraArgs: config.extraArgs,
    });

    let logTargets = null;
    let child;
    try {
      logTargets = this.openLogTargets();
      child = this.spawnProcess(installation.python, args, buildComfySpawnOptions({
        cwd: installation.cwd,
        stdio: logTargets.stdio,
      }));
    } catch {
      return {
        status: 'failed',
        diagnosticCode: 'COMFYUI_SPAWN_FAILED',
        message: '无法启动本机 ComfyUI 进程。',
        actions: ['确认 Python 解释器可执行，并检查 ComfyUI 安装是否完整。'],
      };
    } finally {
      // 句柄已经交给子进程，父进程这边必须释放，否则日志文件会一直被占用。
      logTargets?.close?.();
    }
    if (!child?.pid) {
      return {
        status: 'failed',
        diagnosticCode: 'COMFYUI_SPAWN_FAILED',
        message: '无法启动本机 ComfyUI 进程。',
        actions: ['确认 Python 解释器可执行，并检查 ComfyUI 安装是否完整。'],
      };
    }
    child.unref?.();

    const record = {
      pid: child.pid,
      python: installation.python,
      entry: installation.entry,
      cwd: installation.cwd,
      port: resolved.port,
      startedAt: new Date().toISOString(),
    };
    await this.writeRecord(record);
    this.logger.info?.('已启动本机 ComfyUI 进程', { operation: 'start', pid: child.pid, port: resolved.port });

    const budget = clampTimeout(timeoutMs ?? config.startTimeoutMs);
    const attempts = Math.max(1, Math.ceil(budget / this.pollIntervalMs));
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await this.sleep(this.pollIntervalMs);
      const probe = await this.probeComfy(resolved.address);
      if (probe?.ok) {
        const browserUrl = `http://${resolved.address}/`;
        try {
          Promise.resolve(this.openBrowser(browserUrl)).catch(() => {
            this.logger.warn?.('ComfyUI 网页打开失败，可从本机服务手动打开。', { operation: 'openBrowser' });
          });
        } catch {
          this.logger.warn?.('ComfyUI 网页打开失败，可从本机服务手动打开。', { operation: 'openBrowser' });
        }
        return { status: 'ready', address: resolved.address, owned: true, pid: record.pid };
      }
      if (!await this.isProcessAlive(record.pid)) {
        await this.clearRecord();
        return {
          status: 'failed',
          diagnosticCode: 'COMFYUI_EXITED_DURING_START',
          message: '本机 ComfyUI 在启动过程中退出。',
          actions: ['打开「本机 ComfyUI 日志」查看报错，确认依赖与模型是否完整。'],
        };
      }
    }

    const startupFailure = {
      diagnosticCode: 'COMFYUI_START_TIMEOUT',
      message: '本机 ComfyUI 启动超时。',
      actions: ['首次启动需要加载全部自定义节点，可在设置中延长启动超时后重试。'],
    };
    await this.writeRecord({ ...record, startupFailure });
    return {
      status: 'failed',
      ...startupFailure,
      owned: true,
      pid: record.pid,
    };
  }

  async waitForExit(pid, attempts = 40) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (!await this.isProcessAlive(pid)) return true;
      await this.sleep(50);
    }
    return false;
  }

  async stop() {
    const record = await this.readRecord();
    if (!record) return { status: 'not-running' };
    const details = await this.inspectProcess(record.pid);
    if (!isOwnedComfyProcess(details, record)) {
      // 记录过期（进程已退出，或 PID 被别的程序复用）：只清记录，绝不终止。
      await this.clearRecord();
      return { status: 'not-running' };
    }

    await this.terminateProcess(record.pid, 'graceful');
    if (!await this.waitForExit(record.pid, 20)) {
      await this.terminateProcess(record.pid, 'force');
    }

    if (!await this.waitForExit(record.pid)) {
      return {
        status: 'failed',
        diagnosticCode: 'COMFYUI_STOP_FAILED',
        message: '无法停止本机 ComfyUI 进程。',
        actions: ['在任务管理器中手动结束该 ComfyUI 进程。'],
      };
    }
    await this.clearRecord();
    this.logger.info?.('已停止本机 ComfyUI 进程', { operation: 'stop', pid: record.pid });
    return { status: 'stopped', pid: record.pid };
  }

  start(options) {
    if (this.pendingStart) return this.pendingStart;
    this.pendingStart = this.runStart(options).finally(() => { this.pendingStart = null; });
    return this.pendingStart;
  }

  publicApi() {
    return {
      getState: this.getState.bind(this),
      readLogs: ({ lines } = {}) => this.readLogTail({ logsDirectory: this.logsDirectory, lines, fileSystem: fs }),
      detect: () => detectComfyInstallation(this.readConfig(), { fileSystem: this.fileSystem }),
      start: this.start.bind(this),
      stop: this.stop.bind(this),
      ensureReady: options => this.readConfig().autoStart ? this.start(options) : Promise.resolve({ status: 'disabled' }),
    };
  }
}

export function createComfyProcessController(options = {}) {
  return new ComfyProcessController(options).publicApi();
}
