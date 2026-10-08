import { describe, expect, it, vi } from 'vitest';
import { ERRORS, PluginError } from '../modules/contracts/index.js';
import { PluginHost } from '../modules/kernel/index.js';
import { createModuleLogger } from '../modules/kernel/logger.js';

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
});
