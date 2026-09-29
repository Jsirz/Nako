import { describe, it, expect, vi } from 'vitest';
import { workflowFixture } from './fixtures/workflowFixture.js';
import {
  analyzeWorkflow, compareUiAndApiWorkflows, parseWorkflowArtifact,
} from '../modules/workflow-runtime/server/workflowRuntime/workflowFormat.js';
import {
  compileWorkflowBindings, deriveBindingSetBindings,
} from '../modules/workflow-runtime/server/workflowRuntime/workflowBindingCompiler.js';

describe('workflow format and binding boundaries', () => {
  it('compiles named UI widgets and compares executable topology', () => {
    const f = workflowFixture();
    const ui = { version: 0.4, nodes: [{ id: 1, type: 'TestGenerator',
      inputs: [], outputs: [], widgets_values: { seed: 7, prompt: 'original' } }], links: [] };
    const result = analyzeWorkflow(ui, 'comfy-ui-0.4', { objectInfo: f.relevantCapabilities });
    expect(result.compileStatus).toBe('ready');
    expect(result.apiJson['1'].inputs).toEqual(f.apiJson['1'].inputs);
    expect(compareUiAndApiWorkflows(ui, result.apiJson).status).toBe('exact');
    expect(analyzeWorkflow(ui, 'comfy-ui-0.4').compileStatus).toBe('needs-runtime-capabilities');
  });

  it('rejects incomplete nodes still used by the executable graph', () => {
    const broken = { '1': { inputs: {} }, '2': { class_type: 'Consumer', inputs: { image: ['1', 0] } } };
    expect(() => parseWorkflowArtifact(JSON.stringify(broken))).toThrow(expect.objectContaining({
      code: 'INCOMPLETE_API_NODE_DEPENDENCY',
    }));
  });

  it('traces primitive values through reroutes and detects mismatched API values', () => {
    const ui = { version: 0.4, nodes: [
      { id: 1, type: 'PrimitiveNode', widgets_values: ['hello'], inputs: [], outputs: [{ links: [10] }] },
      { id: 2, type: 'Reroute', inputs: [{ name: 'value', link: 10 }], outputs: [{ links: [11] }] },
      { id: 3, type: 'Consumer', inputs: [{ name: 'prompt', link: 11 }], outputs: [] },
    ], links: [[10, 1, 0, 2, 0, 'STRING'], [11, 2, 0, 3, 0, 'STRING']] };
    const api = { '3': { class_type: 'Consumer', inputs: { prompt: 'hello' } } };
    expect(compareUiAndApiWorkflows(ui, api).status).toBe('exact');
    api['3'].inputs.prompt = 'changed';
    expect(compareUiAndApiWorkflows(ui, api)).toMatchObject({ status: 'conflict',
      projectionConflicts: [{ code: 'PRIMITIVE_VALUE_MISMATCH' }],
    });
  });

  it.each([
    [{ unknown: 1 }, 'UNKNOWN_BINDING_VALUE'],
    [JSON.parse('{"__proto__":{"polluted":true}}'), 'DANGEROUS_BINDING_KEY'],
    [{ prompt: 'x'.repeat(64 * 1024 + 1) }, 'BINDING_VALUE_SIZE_LIMIT'],
  ])('rejects unapproved or oversized values before resolving assets', async (values, code) => {
    const f = workflowFixture(), resolveAsset = vi.fn();
    await expect(compileWorkflowBindings({ ...f.compile, values, resolveAsset })).rejects.toMatchObject({ code });
    expect(resolveAsset).not.toHaveBeenCalled();
  });

  it('rejects changed execution plans before resolving assets', async () => {
    const f = workflowFixture(), resolveAsset = vi.fn();
    f.deployment.executionPlanHash = 'changed';
    await expect(compileWorkflowBindings({ ...f.compile, resolveAsset })).rejects.toMatchObject({ code: 'WORKFLOW_REFERENCE_CONFLICT' });
    expect(resolveAsset).not.toHaveBeenCalled();
  });

  it('reuses the same random seed across preflight and staged compilation without changing source', async () => {
    const f = workflowFixture(), original = structuredClone(f.apiJson);
    const generateRandomInteger = vi.fn(() => 42), seedResolutionCache = new Map();
    const input = { ...f.compile, values: { seed: { mode: 'random' } }, generateRandomInteger, seedResolutionCache };
    const first = await compileWorkflowBindings(input), second = await compileWorkflowBindings(input);
    expect(first.apiJson['1'].inputs.seed).toBe(42);
    expect(second.compiledPromptHash).toBe(first.compiledPromptHash);
    expect(generateRandomInteger).toHaveBeenCalledTimes(1);
    expect(f.apiJson).toEqual(original);
  });

  it('checks all required cloud media before the first asset resolution', async () => {
    const f = workflowFixture({ media: true }), resolveAsset = vi.fn();
    f.deployment.runner = 'runninghub-workflow';
    await expect(compileWorkflowBindings({ ...f.compile, resolveAsset, values: {
      image1: { assetId: 'asset', projectId: 'project', type: 'image' },
    } })).rejects.toMatchObject({ code: 'MISSING_BINDING_VALUE' });
    expect(resolveAsset).not.toHaveBeenCalled();
  });

  it('does not permit caller supplied binding targets', () => {
    const f = workflowFixture();
    expect(() => deriveBindingSetBindings({ executionPlan: f.apiJson,
      nodeDefinitions: f.relevantCapabilities, selections: [{ candidateId: 'anything', target: {} }],
    })).toThrow(expect.objectContaining({ code: 'INVALID_BINDING_SELECTION' }));
  });
});
