// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { createWorkflowManager } from '../modules/local-runtime/ui/local/workflowManager.ts';

afterEach(() => { document.body.replaceChildren(); });

function fixture() {
  const definition = { id: 'definition-a', name: 'Workflow A', revision: 1, sourceArtifacts: [], executionPlan: { executionPlanHash: 'hash-a' } };
  const deployment = { id: 'deployment-a', runner: 'local-comfyui' };
  const bindingSet = { id: 'bindings-a', bindings: [
    { id: 'text', key: 'prompt_1', label: '提示词', control: { kind: 'textarea', hasDefault: true, defaultValue: 'initial', options: [] } },
    { id: 'asset', key: 'image_2', label: '参考图', control: { kind: 'asset', mediaKind: 'image', hasDefault: false, options: [] } },
  ] };
  const client = {
    getDefinition: vi.fn(async () => definition),
    listProjects: vi.fn(async () => [{ id: 'project-a', title: 'Project A' }]),
    listDeployments: vi.fn(async () => [deployment]),
    listBindingCandidates: vi.fn(async () => [
      { id: 'candidate-1', nodeId: '1', fieldName: 'prompt', control: 'textarea', classType: 'Text' },
      { id: 'candidate-2', nodeId: '2', fieldName: 'image', control: 'asset', classType: 'Image' },
    ]),
    listBindingSets: vi.fn(async () => [bindingSet]),
    listAttestations: vi.fn(async () => []),
    listAssets: vi.fn(async () => [{ id: 'asset-a', filename: 'reference.png', url: '/library/reference.png' }]),
    preflight: vi.fn(async () => ({ checks: [{ message: 'OK' }] })),
    startRun: vi.fn(),
  };
  return client;
}

describe('workflow manager after responsibility split', () => {
  it('loads an existing workflow, retains edited values and selected assets for preflight', async () => {
    const client = fixture();
    const host = createWorkflowManager(client, { definitionId: 'definition-a', initialStage: 3 });
    document.body.append(host);
    await waitFor(() => expect(host.querySelector('textarea')).not.toBeNull());
    const input = host.querySelector('textarea');
    expect(input.value).toBe('initial');
    fireEvent.input(input, { target: { value: 'updated prompt' } });
    await waitFor(() => expect(host.querySelector('[data-nako-workflow-asset-id="asset-a"]')).not.toBeNull());
    fireEvent.click(host.querySelector('[data-nako-workflow-asset-id="asset-a"]'));
    fireEvent.click(getByRole(host, 'button', { name: '只检查', exact: true }));
    await waitFor(() => expect(client.preflight).toHaveBeenCalledTimes(1));
    expect(client.preflight).toHaveBeenCalledWith('definition-a', {
      deploymentId: 'deployment-a', bindingSetId: 'bindings-a', projectId: 'project-a',
      values: { prompt_1: 'updated prompt', image_2: { assetId: 'asset-a', projectId: 'project-a', type: 'image' } },
    });
    await waitFor(() => expect(host.dataset.busy).toBeUndefined());
    expect(host.querySelector('textarea').value).toBe('updated prompt');
    expect(client.startRun).not.toHaveBeenCalled();
  });

  it('renders a recoverable load error, then retries against the same definition', async () => {
    const client = fixture();
    client.getDefinition.mockRejectedValueOnce(new Error('fixture unavailable'));
    const host = createWorkflowManager(client, { definitionId: 'definition-a', initialStage: 3 });
    document.body.append(host);
    await waitFor(() => expect(host.querySelector('[data-nako-state="error"]')).not.toBeNull());
    expect(host.textContent).toContain('fixture unavailable');
    fireEvent.click(getByRole(host, 'button', { name: '重试读取', exact: true }));
    await waitFor(() => expect(host.querySelector('textarea')).not.toBeNull());
    expect(client.getDefinition).toHaveBeenCalledTimes(2);
    expect(client.startRun).not.toHaveBeenCalled();
  });
});
