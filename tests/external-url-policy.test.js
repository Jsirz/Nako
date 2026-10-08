import { beforeEach, expect, it, vi } from 'vitest';

const dispatchers = vi.hoisted(() => []);
vi.mock('undici', () => ({ Agent: class {
  constructor(options) {
    this.options = options;
    this.close = vi.fn(async () => {});
    this.destroy = vi.fn(async () => {});
    dispatchers.push(this);
  }
} }));
import { fetchExternalUrl, isPrivateNetworkAddress, validateExternalUrl } from '../modules/identity-account/server/security/externalUrlPolicy.js';

beforeEach(() => { dispatchers.splice(0); });

it.each(['127.0.0.1', '10.0.0.1', '169.254.1.1', '192.0.2.1', '240.0.0.1',
  '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'fd00::1', 'ff80::1', '2001:db8::1', '2002:7f00:1::1'])(
  'rejects local and special address %s', address => {
    expect(isPrivateNetworkAddress(address)).toBe(true);
  },
);
it.each(['8.8.8.8', '93.184.216.34', '2001:4860:4860::8888'])(
  'allows a public address %s', address => { expect(isPrivateNetworkAddress(address)).toBe(false); },
);

it('pins the connection lookup to the addresses already validated', async () => {
  const resolveHost = vi.fn().mockResolvedValueOnce([{ address: '93.184.216.34' }])
    .mockResolvedValue([{ address: '127.0.0.1' }]);
  const response = { status: 200, headers: new Headers() };
  const fetchImpl = vi.fn(async (_url, options) => {
    const callback = vi.fn();
    options.dispatcher.options.connect.lookup('example.test', { all: true }, callback);
    expect(callback).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
    return response;
  });
  const result = await fetchExternalUrl('https://example.test/media', { resolveHost, fetchImpl });
  expect(result.response).toBe(response);
  expect(resolveHost).toHaveBeenCalledTimes(1);
  expect(dispatchers[0].close).toHaveBeenCalledTimes(1);
});

it('revalidates every redirect and releases the discarded response', async () => {
  const cancel = vi.fn(async () => {});
  const fetchImpl = vi.fn(async () => ({ status: 302,
    headers: new Headers({ location: 'http://127.0.0.1/private' }), body: { cancel } }));
  await expect(fetchExternalUrl('https://example.test/media', {
    resolveHost: async () => [{ address: '93.184.216.34' }], fetchImpl,
  })).rejects.toMatchObject({ code: 'PRIVATE_NETWORK_URL', status: 400 });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(cancel).toHaveBeenCalledTimes(1);
});

it('rejects a hostname with any private answer and parses bracketed IPv6 literals', async () => {
  await expect(validateExternalUrl('https://example.test/', { resolveHost: async () => [
    { address: '93.184.216.34' }, { address: '::ffff:7f00:1' },
  ] })).rejects.toMatchObject({ code: 'PRIVATE_NETWORK_URL' });
  await expect(validateExternalUrl('https://[::ffff:7f00:1]/')).rejects.toMatchObject({ code: 'PRIVATE_NETWORK_URL' });
});

it('destroys the dispatcher on transport failure without exposing upstream details', async () => {
  await expect(fetchExternalUrl('https://example.test/', {
    resolveHost: async () => [{ address: '93.184.216.34' }],
    fetchImpl: async () => { throw new Error('private upstream detail'); },
  })).rejects.toMatchObject({ code: 'EXTERNAL_URL_REQUEST_FAILED', status: 502 });
  expect(dispatchers[0].destroy).toHaveBeenCalledTimes(1);
});
