import { IDENTITY_ERRORS, identityError, identityFailure } from '../../../contracts/identityErrors.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { createMacosKeychainProtector } from './macosCredentialProtector.mjs';

const FILE_MAGIC = Buffer.from('NKPCDP01', 'ascii');
const MAX_FILE_BYTES = 256 * 1024;
const MAX_BRIDGE_OUTPUT_BYTES = 512 * 1024;
const BRIDGE_TIMEOUT_MS = 15_000;
export const PROVIDER_CREDENTIAL_FILE_NAME = process.platform === 'darwin'
  ? 'provider-credentials.keychain' : 'provider-credentials.dpapi';

export function createPlatformCredentialProtector(options) {
  if (process.platform === 'darwin') return createMacosKeychainProtector();
  if (process.platform === 'win32') return createWindowsDpapiProtector(options);
  throw identityError(IDENTITY_ERRORS.credentialDecrypt, 'Unsupported credential platform', 'credentials.platform');
}

function windowsPowerShellPath() {
  const windowsRoot = String(process.env.SystemRoot || process.env.WINDIR || '').trim();
  if (!windowsRoot) throw identityError(IDENTITY_ERRORS.credentialConfiguration, 'Windows system directory is unavailable', 'credentials.dpapi.configure');
  return path.join(
    windowsRoot,
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe',
  );
}

function runDpapiBridge({ action, input, helperPath, powershellPath = windowsPowerShellPath() }) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      powershellPath,
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        helperPath,
        '-Action',
        action,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    );
    const stdout = [];
    let stdoutBytes = 0;
    let settled = false;
    const finish = (callback) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill();
      finish(() => reject(identityError(IDENTITY_ERRORS.credentialTimeout, 'Windows DPAPI bridge timed out', 'credentials.dpapi', 504)));
    }, BRIDGE_TIMEOUT_MS);
    timeout.unref?.();
    child.stdout.on('data', (chunk) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= MAX_BRIDGE_OUTPUT_BYTES) stdout.push(Buffer.from(chunk));
    });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => finish(
      () => reject(identityError(IDENTITY_ERRORS.credentialProtection, 'Windows DPAPI bridge could not start', 'credentials.dpapi')),
    ));
    child.on('close', (code) => {
      if (code !== 0 || stdoutBytes > MAX_BRIDGE_OUTPUT_BYTES) {
        finish(() => reject(identityError(IDENTITY_ERRORS.credentialDecrypt, 'Windows DPAPI bridge failed', 'credentials.dpapi')));
        return;
      }
      const encoded = Buffer.concat(stdout).toString('utf8').trim();
      if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) {
        finish(() => reject(identityError(IDENTITY_ERRORS.credentialProtection, 'Windows DPAPI bridge returned invalid data', 'credentials.dpapi')));
        return;
      }
      finish(() => resolve(Buffer.from(encoded, 'base64')));
    });
    child.stdin.end(Buffer.from(input).toString('base64'));
  });
}

export function createWindowsDpapiProtector({ helperPath, powershellPath } = {}) {
  const resolvedHelper = path.resolve(String(helperPath || ''));
  if (!helperPath || !fs.existsSync(resolvedHelper)) {
    throw identityError(IDENTITY_ERRORS.credentialConfiguration, 'Provider credential DPAPI helper is unavailable', 'credentials.dpapi.configure');
  }
  return Object.freeze({
    protect(input) {
      return runDpapiBridge({
        action: 'Protect',
        input,
        helperPath: resolvedHelper,
        powershellPath,
      });
    },
    unprotect(input) {
      return runDpapiBridge({
        action: 'Unprotect',
        input,
        helperPath: resolvedHelper,
        powershellPath,
      });
    },
  });
}

function normalizeCredentials(value, allowedKeys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw identityError(IDENTITY_ERRORS.credentialInvalid, 'Provider credential record is invalid', 'credentials.validate', 400);
  }
  const normalized = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!allowedKeys.has(key) || typeof rawValue !== 'string') {
      throw identityError(IDENTITY_ERRORS.credentialInvalid, 'Provider credential record contains an unsupported field', 'credentials.validate', 400);
    }
    const credential = rawValue.trim();
    if (!credential) continue;
    if (credential.length > 100_000 || /[\r\n\0]/u.test(credential)) {
      throw identityError(IDENTITY_ERRORS.credentialInvalid, 'Provider credential value is invalid', 'credentials.validate', 400);
    }
    normalized[key] = credential;
  }
  return normalized;
}

export function createProviderCredentialStore({ filePath, allowedKeys, protector } = {}) {
  const resolvedFile = path.resolve(String(filePath || ''));
  const keySet = new Set(allowedKeys || []);
  if (!filePath || keySet.size === 0) throw identityError(IDENTITY_ERRORS.credentialConfiguration, 'Provider credential store is not configured', 'credentials.configure');
  const activeProtector = protector;
  if (
    typeof activeProtector?.protect !== 'function'
    || typeof activeProtector?.unprotect !== 'function'
  ) {
    throw identityError(IDENTITY_ERRORS.credentialConfiguration, 'Provider credential protector is not configured', 'credentials.configure');
  }
  let updateQueue = Promise.resolve();

  async function read() {
    let contents;
    try {
      contents = await readFile(resolvedFile);
    } catch (error) {
      if (error?.code === 'ENOENT') return {};
      throw identityFailure(error, IDENTITY_ERRORS.credentialRead, 'Provider credential store could not be read', 'credentials.read');
    }
    if (
      contents.length <= FILE_MAGIC.length
      || contents.length > MAX_FILE_BYTES
      || !contents.subarray(0, FILE_MAGIC.length).equals(FILE_MAGIC)
    ) {
      throw identityError(IDENTITY_ERRORS.credentialFormat, 'Provider credential store is invalid', 'credentials.read');
    }
    const plaintext = await activeProtector.unprotect(contents.subarray(FILE_MAGIC.length));
    try {
      return normalizeCredentials(JSON.parse(plaintext.toString('utf8')), keySet);
    } catch (error) {
      throw identityFailure(error, IDENTITY_ERRORS.credentialFormat, 'Provider credential store is invalid', 'credentials.read');
    } finally {
      plaintext.fill(0);
    }
  }

  async function replace(credentials) {
    const normalized = normalizeCredentials(credentials, keySet);
    const ordered = Object.fromEntries(
      Object.entries(normalized).sort(([left], [right]) => left.localeCompare(right)),
    );
    const plaintext = Buffer.from(JSON.stringify(ordered), 'utf8');
    let protectedBytes;
    try {
      protectedBytes = await activeProtector.protect(plaintext);
    } finally {
      plaintext.fill(0);
    }
    if (!Buffer.isBuffer(protectedBytes) || protectedBytes.length === 0) {
      throw identityError(IDENTITY_ERRORS.credentialProtection, 'Provider credential protection failed', 'credentials.protect');
    }
    const contents = Buffer.concat([FILE_MAGIC, protectedBytes]);
    protectedBytes.fill(0);
    if (contents.length > MAX_FILE_BYTES) throw identityError(IDENTITY_ERRORS.credentialInvalid, 'Provider credential store is oversized', 'credentials.replace', 413);
    await mkdir(path.dirname(resolvedFile), { recursive: true });
    const temporaryPath = `${resolvedFile}.${process.pid}.${crypto.randomUUID()}.tmp`;
    try {
      await writeFile(temporaryPath, contents, { flag: 'wx', mode: 0o600 });
      await rename(temporaryPath, resolvedFile);
    } finally {
      contents.fill(0);
      await rm(temporaryPath, { force: true });
    }
    return { ...ordered };
  }

  function update(patch) {
    const operation = updateQueue.then(async () => {
      const current = await read();
      const next = { ...current };
      for (const [key, rawValue] of Object.entries(patch || {})) {
        if (!keySet.has(key) || typeof rawValue !== 'string') {
          throw identityError(IDENTITY_ERRORS.credentialInvalid, 'Provider credential update is invalid', 'credentials.update', 400);
        }
        const value = rawValue.trim();
        if (value) next[key] = value;
        else delete next[key];
      }
      await replace(next);
      return read();
    });
    updateQueue = operation.catch(() => undefined);
    return operation;
  }

  return Object.freeze({ read, replace, update, filePath: resolvedFile });
}
