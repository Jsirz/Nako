import { describe, expect, it, vi } from 'vitest';
import { ERRORS, PluginError } from '../modules/contracts/index.js';
import { PluginHost, ServiceRegistry } from '../modules/kernel/index.js';
import { createModuleLogger } from '../modules/kernel/logger.js';
import { agentEvent } from '../modules/contracts/agentProtocol.js';
import { validateAgentArchive } from '../modules/contracts/agentArchive.js';

describe('module logging and errors', () => {
  it('keeps structured error context immutable and retains the original cause', () => {
    const cause = new Error('disk full');
    const error = new PluginError(ERRORS.taskPersistence, '保存失败', { context: { nodeId: 'node' }, status: 503, cause });
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: ERRORS.taskPersistence, message: '保存失败', status: 503, cause });
    expect(Object.isFrozen(error.context)).toBe(true);
  });
  it('redacts sensitive context and avoids logging exception payloads', () => {
    const output = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    createModuleLogger('module.media', output).info('request Bearer secret', {
      projectId: 'project', apiKey: 'private', payload: { private: true }, error: new Error('private body'),
    });
    expect(output.info).toHaveBeenCalledWith('[module.media] request [REDACTED]', {
      projectId: 'project', apiKey: '[REDACTED]', payload: '[omitted]', error: { name: 'Error', code: undefined },
    });
  });
  it('publishes plugin identity and safe context through PluginContext.logger', async () => {
    const output = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const host = new PluginHost({ logger: output });
    host.register({ manifest: { id: 'example.logs', version: '1.0.0', apiVersion: '^1.0.0', type: 'module' },
      activate(context) { context.logger.warn('operation failed', { operationId: 'op', token: 'private' }); } });
    await host.start();
    expect(output.warn).toHaveBeenCalledWith('[example.logs] operation failed', { operationId: 'op', token: '[REDACTED]' });
    await host.stop();
  });
  it('retains safe error diagnostics while omitting secrets, responses, stacks and causes', () => {
    const output = { error: vi.fn() };
    const error = new PluginError(ERRORS.desktopUpdate, 'private upstream body', {
      status: 503, cause: new Error('private cause'),
      context: { moduleId: 'desktop-shell-observability', operation: 'update.download',
        apiKey: 'private key', detail: 'access_token=private-token', body: { private: true } },
    });
    createModuleLogger('desktop-shell-observability', output).error('Update failed', { error });
    expect(output.error.mock.calls[0][1].error).toEqual({
      name: 'PluginError', code: ERRORS.desktopUpdate, status: 503,
      context: { moduleId: 'desktop-shell-observability', operation: 'update.download',
        apiKey: '[REDACTED]', detail: 'access_token=[REDACTED]', body: '[omitted]' },
    });
    expect(JSON.stringify(output.error.mock.calls)).not.toMatch(/private/);
  });
  it('bounds native messages and context and sanitizes textual key assignments', () => {
    const output = { info: vi.fn() };
    const logger = createModuleLogger('desktop', output);
    logger.info('native log', { detail: 'API Key: private-key https://host/?token=private-token' });
    expect(output.info.mock.calls[0][1].detail).toBe('API Key=[REDACTED] https://host/?token=[REDACTED]');
    logger.info('x'.repeat(2000), Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`field${i}`, 'y'.repeat(2000)])));
    const [message, context] = output.info.mock.calls[1];
    expect(message).toHaveLength('[desktop] '.length + 1024);
    expect(Object.keys(context)).toHaveLength(32);
    expect(context.field0).toHaveLength(1024);
  });
  it('reports cleanup and listener failures without preventing resource release', async () => {
    const output = { error: vi.fn() }, host = new PluginHost({ logger: output });
    host.events.on('plugin.activated', () => { throw new Error('private observer payload'); });
    host.register({ manifest: { id: 'fixture.cleanup', version: '1.0.0', apiVersion: '^1.0.0', type: 'module' },
      activate(context) { context.onDispose(() => { throw new Error('private cleanup payload'); }); } });
    await host.start();
    await host.stop();
    expect(host.services.list()).toEqual([]);
    expect(output.error.mock.calls.map(([, context]) => context.operation)).toEqual(['event.dispatch', 'plugin.cleanup']);
    expect(output.error.mock.calls[1][1]).toMatchObject({ pluginId: 'fixture.cleanup' });
    expect(JSON.stringify(output.error.mock.calls)).not.toContain('private');
  });
  it('provides code and operation context for service and public protocol validation errors', () => {
    expect(() => new ServiceRegistry().get('missing')).toThrow(expect.objectContaining({
      code: ERRORS.serviceMissing, context: { moduleId: 'kernel', operation: 'service.get', serviceId: 'missing' },
    }));
    expect(() => agentEvent('unknown')).toThrow(expect.objectContaining({
      code: 'AGENT_RESPONSE_INVALID', status: 400,
      context: { moduleId: 'contracts', protocol: 'agentEvent', operation: 'create', type: 'unknown' },
    }));
    expect(() => validateAgentArchive(null, 'project')).toThrow(expect.objectContaining({
      code: ERRORS.invalidProjectArchive, status: 400,
      context: { moduleId: 'contracts', protocol: 'agentArchive', operation: 'validate' },
    }));
  });
});
