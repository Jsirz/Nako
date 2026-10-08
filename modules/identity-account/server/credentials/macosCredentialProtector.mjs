import { IDENTITY_ERRORS, identityError, identityFailure } from '../../../contracts/identityErrors.js';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

const service = 'app.nako.provider-credentials';
const account = 'encryption-key';

function security(args) {
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/security', args, { timeout: 15000, maxBuffer: 16384 }, (error, stdout) => {
      if (!error) return resolve(stdout.trim());
      // Never propagate execFile's command/error text: it can include key material.
      reject(Object.assign(identityError(IDENTITY_ERRORS.credentialDecrypt,
        '无法访问 macOS 钥匙串，请解锁登录钥匙串后重试。', 'credentials.keychain'), { missing: error.code === 44 }));
    });
  });
}

export function createMacosKeychainProtector({ runSecurity = security } = {}) {
  let pending;
  async function readKey(create) {
    const find = () => runSecurity(['find-generic-password', '-s', service, '-a', account, '-w']);
    let encoded;
    try { encoded = await find(); }
    catch (error) {
      if (!create || !error.missing) throw identityFailure(error, IDENTITY_ERRORS.credentialDecrypt, '无法访问 macOS 钥匙串，请解锁登录钥匙串后重试。', 'credentials.keychain');
      const generated = crypto.randomBytes(32).toString('hex');
      try {
        // No -U: concurrent creation must not overwrite a key already in use.
        await runSecurity(['add-generic-password', '-s', service, '-a', account, '-w', generated]);
      } catch { /* Read the winner, or report the Keychain failure below. */ }
      encoded = await find();
    }
    if (!/^[a-f0-9]{64}$/i.test(encoded)) {
      throw identityError(IDENTITY_ERRORS.credentialDecrypt, 'macOS 凭据加密密钥无效。', 'credentials.keychain');
    }
    return Buffer.from(encoded, 'hex');
  }
  async function key(create) {
    pending ??= readKey(create).catch((error) => { pending = undefined; throw identityFailure(error, IDENTITY_ERRORS.credentialDecrypt, '无法访问 macOS 钥匙串，请解锁登录钥匙串后重试。', 'credentials.keychain'); });
    return pending;
  }
  return Object.freeze({
    async protect(input) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', await key(true), iv);
      const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    },
    async unprotect(input) {
      try {
        if (input.length < 29) throw identityError(IDENTITY_ERRORS.credentialDecrypt, 'Invalid ciphertext', 'credentials.unprotect');
        const decipher = crypto.createDecipheriv('aes-256-gcm', await key(false), input.subarray(0, 12));
        decipher.setAuthTag(input.subarray(12, 28));
        return Buffer.concat([decipher.update(input.subarray(28)), decipher.final()]);
      } catch {
        throw identityError(IDENTITY_ERRORS.credentialDecrypt, '无法解密 macOS 模型凭据。', 'credentials.unprotect');
      }
    },
  });
}
