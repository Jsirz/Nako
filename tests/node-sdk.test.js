import { describe, expect, it, vi } from 'vitest';
import { validateNodePackageManifest } from '../modules/contracts/nodeSdk.js';
import { NodeRegistry } from '../modules/kernel/nodeRegistry.js';
import { NodeDagScheduler } from '../modules/kernel/nodeDagScheduler.js';
import { PluginError, ERRORS } from '../modules/contracts/errors.js';

const packageValue = (overrides = {}) => ({
  manifest: {
    id: 'fixture.nodes', version: '1.0.0', apiVersion: '^2.0.0', title: 'Fixture',
    nodes: [
      { type: 'source', version: '1.0.0', category: 'utility', inputs: [], outputs: [{ id: 'out', media: ['text'] }], render: { kind: 'generic' }, executor: { method: 'source' } },
      { type: 'sink', version: '1.0.0', category: 'tool', inputs: [{ id: 'input', media: ['text'], required: true }], outputs: [{ id: 'result', media: ['text'] }], render: { kind: 'generic' }, executor: { method: 'sink' } },
    ],
    ...overrides,
  },
  executors: { source: () => ({ out: 'hello' }), sink: ({ inputs }) => ({ result: inputs.input }) },
});

describe('Node SDK and registry', () => {
  it('validates stable ports and package declarations', () => {
    const manifest = validateNodePackageManifest(packageValue().manifest);
    expect(manifest.nodes[0].outputs[0].id).toBe('out');
    expect(() => validateNodePackageManifest({ ...manifest, nodes: [{ ...manifest.nodes[0], inputs: [{ id: 'bad id', media: ['text'] }] }] })).toThrow();
  });
  it('returns structured validation context for invalid node ports', () => {
    try {
      validateNodePackageManifest({ ...packageValue().manifest, nodes: [{
        ...packageValue().manifest.nodes[0], inputs: [{ id: 'bad id', media: ['text'] }],
      }] });
      throw new Error('Expected validation rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(PluginError);
      expect(error).toMatchObject({ code: ERRORS.nodePackage, status: 400,
        context: { protocol: 'nodeSdk', operation: 'validate', path: 'nodes[0].inputs[0]' } });
    }
  });

  it('registers ownership, creates missing placeholders and migrates versions', () => {
    const registry = new NodeRegistry();
    registry.register({ ...packageValue(), migrate: node => ({ ...node, prompt: 'migrated' }) });
    expect(registry.resolveNode('source')?.packageId).toBe('fixture.nodes');
    expect(registry.createMissing('removed', '2.0.0', 'old.plugin').render.kind).toBe('missing');
    expect(registry.migrate({ id: 'n1', type: 'source', nodeVersion: '0.9.0', pluginId: 'fixture.nodes' }).node.prompt).toBe('migrated');
    expect(registry.validateEdge({ source: { nodeId: 'a', portId: 'out' }, target: { nodeId: 'b', portId: 'input' } }, [{ id: 'a', type: 'source' }, { id: 'b', type: 'sink' }])).toEqual({ valid: true });
  });
  it('rejects incompatible and duplicate packages with actionable registration context', () => {
    const registry = new NodeRegistry();
    expect(() => registry.register(packageValue({ apiVersion: '^99.0.0' }))).toThrow(expect.objectContaining({
      code: ERRORS.nodePackage, status: 400,
      context: expect.objectContaining({ moduleId: 'kernel', operation: 'nodes.register', packageId: 'fixture.nodes' }),
    }));
    registry.register(packageValue());
    expect(() => registry.register(packageValue())).toThrow(expect.objectContaining({
      code: ERRORS.nodePackage, status: 409,
      context: expect.objectContaining({ operation: 'nodes.register', packageId: 'fixture.nodes' }),
    }));
    expect(registry.listPackages()).toHaveLength(1);
  });
});

describe('Node DAG scheduler and RPC boundary', () => {
  it('executes independent nodes in parallel and propagates port values', async () => {
    const registry = new NodeRegistry();
    registry.register(packageValue());
    const events = [], scheduler = new NodeDagScheduler({ registry, onEvent: event => events.push(event) });
    const result = await scheduler.run({ nodes: [{ id: 'source', type: 'source' }, { id: 'sink', type: 'sink' }], edges: [{ source: { nodeId: 'source', portId: 'out' }, target: { nodeId: 'sink', portId: 'input' } }] });
    expect(result.results.sink).toEqual({ result: 'hello' });
    expect(events.filter(event => event.status === 'success')).toHaveLength(2);
  });

  it('rejects cycles before execution', async () => {
    const scheduler = new NodeDagScheduler({ executors: { node: vi.fn() } });
    await expect(scheduler.run({ nodes: [{ id: 'a', type: 'node' }, { id: 'b', type: 'node' }], edges: [{ source: { nodeId: 'a', portId: 'out' }, target: { nodeId: 'b', portId: 'in' } }, { source: { nodeId: 'b', portId: 'out' }, target: { nodeId: 'a', portId: 'in' } }] })).rejects.toMatchObject({ code: 'DAG_CYCLE' });
  });
});
