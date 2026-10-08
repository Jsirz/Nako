import dns from 'node:dns/promises';
import net from 'node:net';
import { Agent } from 'undici';
import { IdentityError, IDENTITY_ERRORS } from '../../../contracts/identityErrors.js';

export class ExternalUrlPolicyError extends IdentityError {
  constructor(message, status = 400, code = IDENTITY_ERRORS.externalUnsafe) {
    super(code, message, 'externalUrl', status);
    this.name = 'ExternalUrlPolicyError';
  }
}

const blocked = new net.BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 3],
]) blocked.addSubnet(address, prefix, 'ipv4');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
const globalIpv6 = new net.BlockList();
globalIpv6.addSubnet('2000::', 3, 'ipv6');

export function isPrivateNetworkAddress(address) {
  const version = net.isIP(String(address || ''));
  if (version === 4) return blocked.check(address, 'ipv4');
  // Reject mapped, translation, local and multicast ranges outside global unicast.
  if (version === 6) return !globalIpv6.check(address, 'ipv6') || blocked.check(address, 'ipv6');
  return true;
}

async function defaultResolveHost(hostname) {
  return dns.lookup(hostname, { all: true, verbatim: true });
}

async function resolveExternalTarget(value, resolveHost) {
  let url;
  try {
    url = value instanceof URL ? new URL(value.href) : new URL(String(value || ''));
  } catch {
    throw new ExternalUrlPolicyError('外部 URL 无效');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ExternalUrlPolicyError('外部 URL 只允许无凭据的 HTTP 或 HTTPS');
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new ExternalUrlPolicyError('外部 URL 不允许访问本机或内网', 400, IDENTITY_ERRORS.externalPrivate);
  }
  let resolved;
  try {
    resolved = net.isIP(hostname) ? [{ address: hostname }] : await resolveHost(hostname);
  } catch {
    throw new ExternalUrlPolicyError('外部 URL 地址解析失败', 502, IDENTITY_ERRORS.externalRequest);
  }
  const addresses = (Array.isArray(resolved) ? resolved : [resolved]).map(entry => {
    const address = typeof entry === 'string' ? entry : entry?.address;
    return { address, family: net.isIP(String(address || '')) };
  });
  if (!addresses.length || addresses.some(entry => isPrivateNetworkAddress(entry.address))) {
    throw new ExternalUrlPolicyError('外部 URL 不允许访问本机或内网', 400, IDENTITY_ERRORS.externalPrivate);
  }
  return { url, addresses };
}

export async function validateExternalUrl(value, { resolveHost = defaultResolveHost } = {}) {
  return (await resolveExternalTarget(value, resolveHost)).url;
}

function pinnedDispatcher(addresses) {
  return new Agent({ connect: {
    lookup(_hostname, options, callback) {
      if (options.all) callback(null, addresses);
      else callback(null, addresses[0].address, addresses[0].family);
    },
  } });
}

export async function fetchExternalUrl(value, {
  fetchImpl = globalThis.fetch,
  resolveHost = defaultResolveHost,
  method = 'GET',
  timeoutMs = 30_000,
  maxRedirects = 3,
} = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let target = await resolveExternalTarget(value, resolveHost);
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    signal.throwIfAborted();
    const dispatcher = pinnedDispatcher(target.addresses);
    let response;
    try {
      response = await fetchImpl(target.url, { method, redirect: 'manual', signal, dispatcher });
      // Graceful close drains in-flight responses; awaiting it here would block body consumption.
      void dispatcher.close().catch(() => dispatcher.destroy().catch(() => {}));
    } catch {
      await dispatcher.destroy();
      if (signal.aborted) throw signal.reason;
      throw new ExternalUrlPolicyError('外部 URL 请求失败', 502, IDENTITY_ERRORS.externalRequest);
    }
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      return { response, url: target.url };
    }
    await response.body?.cancel?.();
    if (redirectCount === maxRedirects) {
      throw new ExternalUrlPolicyError('外部 URL 重定向次数过多', 502, IDENTITY_ERRORS.externalRedirects);
    }
    let next;
    try { next = new URL(location, target.url); }
    catch { throw new ExternalUrlPolicyError('外部 URL 重定向地址无效', 502); }
    target = await resolveExternalTarget(next, resolveHost);
  }
  throw new ExternalUrlPolicyError('外部 URL 请求失败', 502, IDENTITY_ERRORS.externalRequest);
}
