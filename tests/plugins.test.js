import { describe, it, expect, vi } from 'vitest';
import { PluginHost, satisfiesVersion } from '../modules/kernel/index.js';
import { GenerationProviderRegistry } from '../modules/generation-core/api/providerRegistry.js';
import { defineProviderPlugin } from '../modules/generation-providers/index.js';
import { createCredentialStore } from '../modules/identity-account/api/credentialStore.js';

const plugin = (id, extra = {}) => ({
  manifest: { id, version: '1.0.0', apiVersion: '^1.0.0', type: 'module', ...extra },
  activate() {},
});
describe('plugin lifecycle and boundaries', () => {
  it.each([
    { services: { provides: 'service' } },
    { services: { requires: ['one', 'one'] } },
    { credentials: 'provider.test' },
    { dependencies: { dependency: '*' } },
    { reloadRequired: 'true' },
    { version: '1.0' },
  ])('rejects malformed declarations before activation: %j', extra => {
    const value = plugin('test.invalid', extra);
    value.activate = vi.fn();
    expect(() => new PluginHost().register(value)).toThrow(expect.objectContaining({ code: 'PLUGIN_INVALID_MANIFEST' }));
    expect(value.activate).not.toHaveBeenCalled();
  });
  it('keeps old contexts revoked across a fresh activation', async () => {
    const contexts = [];
    const host = new PluginHost();
    const value = plugin('test.reload');
    value.activate = ctx => contexts.push(ctx);
    await host.register(value).start();
    await host.unload('test.reload');
    await host.load('test.reload');
    expect(contexts[1].signal.aborted).toBe(false);
    for (const read of [() => contexts[0].services.list(), () => contexts[0].config.get('x'), () => contexts[0].events.emit('tick')])
      expect(read).toThrow(expect.objectContaining({ code: 'PLUGIN_INACTIVE' }));
    await host.stop();
  });
  it.each([[[], ['provider.test']], [['provider.test'], []]])('requires both credential declarations and host grants (%j, %j)', async (declared, granted) => {
    const get = vi.fn(() => ({ KEY: 'secret' }));
    const host = new PluginHost({ credentialStore: { get }, credentialGrants: { 'test.scope': granted } });
    const value = plugin('test.scope', { credentials: declared });
    value.activate = ctx => ctx.credentials.get('provider.test');
    await expect(host.register(value).start()).rejects.toMatchObject({ code: 'PLUGIN_PERMISSION_DENIED' });
    expect(get).not.toHaveBeenCalled();
  });
  it('checks API compatibility including zero-major caret ranges', () => {
    expect(satisfiesVersion('1.2.0', '^1.0.0')).toBe(true);
    expect(satisfiesVersion('2.0.0', '^1.0.0')).toBe(false);
    expect(satisfiesVersion('0.2.1', '^0.1.0')).toBe(false);
    expect(satisfiesVersion('0.0.2', '^0.0.1')).toBe(false);
    expect(() => new PluginHost().register(plugin('test.bad', { apiVersion: '^2.0.0' }))).toThrow(
      /Incompatible/,
    );
  });
  it('orders dependencies, blocks premature unload and disposes in reverse order', async () => {
    const order = [];
    const host = new PluginHost();
    const base = plugin('test.base', { services: { provides: ['test.value'] } });
    base.activate = (ctx) => {
      order.push('base');
      ctx.services.register('test.value', 42);
      ctx.onDispose(() => order.push('dispose base'));
    };
    const child = plugin('test.child', {
      dependencies: { 'test.base': '^1.0.0' },
      services: { requires: ['test.value'] },
    });
    child.activate = (ctx) => {
      order.push(ctx.services.get('test.value'));
      ctx.onDispose(() => order.push('dispose child'));
    };
    host.register(child).register(base);
    await host.load('test.child');
    expect(order).toEqual(['base', 42]);
    await expect(host.unload('test.base')).rejects.toMatchObject({ code: 'PLUGIN_DEPENDENCY' });
    await host.stop();
    expect(order).toEqual(['base', 42, 'dispose child', 'dispose base']);
    expect(host.services.list()).toEqual([]);
  });
  it('rejects cycles and missing dependencies', async () => {
    const host = new PluginHost()
      .register(plugin('test.a', { dependencies: { 'test.b': '^1.0.0' } }))
      .register(plugin('test.b', { dependencies: { 'test.a': '^1.0.0' } }));
    await expect(host.start()).rejects.toMatchObject({ code: 'PLUGIN_DEPENDENCY' });
    await expect(
      new PluginHost().register(plugin('test.c', { dependencies: { missing: '^1.0.0' } })).start(),
    ).rejects.toMatchObject({ code: 'PLUGIN_DEPENDENCY' });
  });
  it('rolls back failed activation, services, event subscriptions and dependencies started by startup', async () => {
    const host = new PluginHost();
    const observer = vi.fn();
    const failed = plugin('test.failed', {
      dependencies: { 'test.base': '^1.0.0' },
      services: { provides: ['temporary'] },
    });
    failed.activate = (ctx) => {
      ctx.services.register('temporary', {});
      ctx.events.on('tick', observer);
      throw new Error('failed');
    };
    host.register(plugin('test.base')).register(failed);
    await expect(host.start()).rejects.toThrow('failed');
    host.events.emit('tick');
    expect(observer).not.toHaveBeenCalled();
    expect(host.services.list()).toEqual([]);
    expect(host.list().some((p) => p.state === 'active')).toBe(false);
  });
  it('requires declared service exports and reads', async () => {
    const host = new PluginHost();
    host.services.register('private', 'secret');
    const bad = plugin('test.bad');
    bad.activate = (ctx) => ctx.services.get('private');
    await expect(host.register(bad).start()).rejects.toMatchObject({
      code: 'PLUGIN_PERMISSION_DENIED',
    });
    const missing = plugin('test.missing', { services: { provides: ['expected'] } });
    await expect(new PluginHost().register(missing).start()).rejects.toMatchObject({
      code: 'SERVICE_NOT_FOUND',
    });
  });
  it('isolates observer failures and revokes retained plugin contexts', async () => {
    const logger = { info() {}, warn() {}, error: vi.fn() };
    const host = new PluginHost({ logger });
    let retained;
    const p = plugin('test.context');
    p.activate = (ctx) => {
      retained = ctx;
    };
    host.events.on('plugin.activated', () => {
      throw new Error('observer');
    });
    await host.register(p).start();
    expect(logger.error).toHaveBeenCalled();
    await host.stop();
    expect(() => retained.events.emit('late')).toThrow(/Inactive/);
  });
});

describe('provider credential scope and recovery', () => {
  const manifest = {
    id: 'provider.test',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'provider',
    credentials: ['provider.test'],
    services: { requires: ['generation.providers'], provides: ['provider.TestImage'] },
  };
  const descriptor = {
    name: 'TestImage',
    kinds: ['image'],
    execution: 'polling',
    requiredSecrets: ['TEST_API_KEY'],
  };
  function setup(implementation) {
    let key = 'configured-key';
    const store = createCredentialStore({
      declarations: [{ id: 'provider.test', keys: ['TEST_API_KEY'] }],
      readSecret: () => key,
    });
    const host = new PluginHost({
      credentialStore: store,
      credentialGrants: { 'provider.test': ['provider.test'] },
    });
    const registry = new GenerationProviderRegistry();
    host.services.register('generation.providers', registry);
    host.register(
      defineProviderPlugin({ ...manifest, providers: [descriptor] }, [descriptor], async () => ({ TestImage: implementation })),
    );
    return {
      host,
      registry,
      setKey: (value) => {
        key = value;
      },
    };
  }
  it('does not expose undeclared methods or private implementation objects', async () => {
    const { host, registry } = setup({ generateImage: async () => ({}), generateVideo: vi.fn(), store: {}, credentials: {} });
    await host.start();
    expect(Object.keys(registry.get('TestImage')).sort()).toEqual(['capabilities', 'generateImage', 'id']);
    await host.stop();
  });
  it('rejects incomplete recovery before publishing a provider', async () => {
    const { host, registry } = setup({ generateImage: async () => ({}), canRecoverImage: () => true });
    await expect(host.start()).rejects.toMatchObject({ code: 'PLUGIN_INVALID_MANIFEST' });
    expect(registry.get('TestImage')).toBeNull();
  });
  it('does not accept caller-supplied credentials or expose another provider key', async () => {
    const { host, registry, setKey } = setup({
      async generateImage(_request, ctx) {
        return {
          own: ctx.TEST_API_KEY,
          other: ctx.OTHER_API_KEY,
          internal: ctx.GENERATION_BUDGETS,
          signal: ctx.signal,
        };
      },
    });
    await host.start();
    const provider = registry.get('TestImage');
    const signal = new AbortController().signal;
    expect(
      await provider.generateImage(
        {},
        {
          TEST_API_KEY: 'caller',
          OTHER_API_KEY: 'other-secret',
          GENERATION_BUDGETS: { private: true },
          signal,
        },
      ),
    ).toEqual({ own: 'configured-key', other: undefined, internal: undefined, signal });
    setKey('rotated-key');
    expect((await provider.generateImage({}, {})).own).toBe('rotated-key');
    await host.stop();
    expect(registry.list()).toEqual([]);
    await expect(provider.generateImage({}, {})).rejects.toMatchObject({ code: 'PLUGIN_INACTIVE' });
  });
  it('preserves sync recovery predicates and every recovery argument', async () => {
    const signal = new AbortController().signal;
    const { host, registry } = setup({
      async generateImage() { return {}; },
      canRecoverImage(receipt, params, ctx) {
        return (
          receipt.id === 'receipt' &&
          params.id === 'params' &&
          ctx.TEST_API_KEY === 'configured-key'
        );
      },
      async recoverImage(receipt, params, ctx, passedSignal) {
        return [receipt.id, params.id, ctx.TEST_API_KEY, passedSignal];
      },
    });
    await host.start();
    const provider = registry.get('TestImage');
    expect(provider.canRecoverImage({ id: 'receipt' }, { id: 'params' }, {})).toBe(true);
    expect(await provider.recoverImage({ id: 'receipt' }, { id: 'params' }, {}, signal)).toEqual([
      'receipt',
      'params',
      'configured-key',
      signal,
    ]);
    await host.stop();
  });
  it('blocks unload while a provider request is in flight', async () => {
    let complete;
    const { host, registry } = setup({
      generateImage: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    });
    await host.start();
    const request = registry.get('TestImage').generateImage({}, {});
    await expect(host.unload('provider.test')).rejects.toMatchObject({ code: 'PLUGIN_BUSY' });
    complete({ url: 'local-result' });
    await request;
    await host.unload('provider.test');
    expect(registry.get('TestImage')).toBeNull();
  });
  it('requires both manifest permission and a host credential grant', async () => {
    const host = new PluginHost({ credentialStore: { get: vi.fn() } });
    const p = plugin('test.no-grant', { credentials: ['provider.openai'] });
    p.activate = (ctx) => ctx.credentials.get('provider.openai');
    await expect(host.register(p).start()).rejects.toMatchObject({
      code: 'PLUGIN_PERMISSION_DENIED',
    });
  });
});
