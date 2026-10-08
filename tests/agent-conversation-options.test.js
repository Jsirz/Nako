// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { agentThinking } from '../modules/agent/ui/agent/agentThinking';
import { AgentConversationOptions } from '../modules/agent/ui/agent/AgentConversationOptions';
import { withGenerationApproval } from '../modules/agent/ui/agent/agentGenerationApproval';
import { createCanvasCreationControl } from '../modules/agent/ui/agent/canvasCreationControl';
import { installModelCatalog } from '../modules/generation-core/models/catalog';
import { modelContributions } from '../apps/canvas/modelContributions';
import { TEXT_MODELS as ECLOUD_MODELS } from '../plugins/providers/ecloud/models';
import { TEXT_MODELS as DOUBAO_MODELS } from '../plugins/providers/doubao/models';

afterEach(cleanup);
const glm = ECLOUD_MODELS.find((m) => m.name.startsWith('GLM-'));
const qwen = ECLOUD_MODELS.find((m) => m.name.startsWith('qwen3-max'));
it('lets the user choose execution mode and model-supported thinking options', () => {
  function Options() {
    const [value, setValue] = React.useState({
      generationApproval: 'confirm',
      thinkingEnabled: null,
      thinkingEffort: '',
    });
    return React.createElement(AgentConversationOptions, {
      value,
      patch: (patch) => setValue((old) => ({ ...old, ...patch })),
      thinking: agentThinking(glm.advancedParams, value),
      disabled: false,
      generation: true,
    });
  }
  const view = render(React.createElement(Options));
  const mode = view.getByLabelText('生成执行方式');
  fireEvent.click(mode);
  expect(view.getByRole('menuitemradio', { name: /手动确认/ }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(view.getByRole('menuitemradio', { name: /自动生成/ }));
  expect(view.queryByRole('menu')).toBeNull();
  expect(mode.title).toBe('自动生成');
  fireEvent.click(view.getByLabelText('思考设置'));
  const toggle = view.getByRole('switch', { name: '会话思考' });
  expect(toggle.disabled).toBe(true);
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  const effort = view.getByLabelText('会话思考强度');
  expect(effort.value).toBe('max');
  fireEvent.change(effort, { target: { value: 'low' } });
  expect(effort.value).toBe('low');
});
it('supports keyboard navigation, dismissal and focus restoration without changing approval', () => {
  const patch = vi.fn();
  const view = render(React.createElement(AgentConversationOptions, {
    value: {}, patch, generation: true, disabled: false,
  }));
  const trigger = view.getByRole('button', { name: '生成执行方式' });
  fireEvent.click(trigger);
  const manual = view.getByRole('menuitemradio', { name: /手动确认/ });
  const direct = view.getByRole('menuitemradio', { name: /自动生成/ });
  expect(document.activeElement).toBe(manual);
  fireEvent.keyDown(manual, { key: 'ArrowDown' });
  expect(document.activeElement).toBe(direct);
  fireEvent.keyDown(direct, { key: 'Home' });
  expect(document.activeElement).toBe(manual);
  fireEvent.keyDown(manual, { key: 'Escape' });
  expect(view.queryByRole('menu')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  fireEvent.click(trigger);
  fireEvent.pointerDown(document.body);
  expect(view.queryByRole('menu')).toBeNull();
  expect(patch).not.toHaveBeenCalled();
});

it('closes options and blocks edits when a run starts', () => {
  const props = { value: {}, patch: vi.fn(), generation: true, disabled: false };
  const view = render(React.createElement(AgentConversationOptions, props));
  fireEvent.click(view.getByRole('button', { name: '生成执行方式' }));
  view.rerender(React.createElement(AgentConversationOptions, { ...props, disabled: true }));
  expect(view.queryByRole('menu')).toBeNull();
  expect(view.getByRole('button', { name: '生成执行方式' }).disabled).toBe(true);
  expect(props.patch).not.toHaveBeenCalled();
});

it('keeps unsupported thinking unavailable and allows a supported toggle', () => {
  const patch = vi.fn();
  const props = { value: {}, patch, generation: false, disabled: false };
  const view = render(React.createElement(AgentConversationOptions, {
    ...props, thinking: agentThinking([], {}),
  }));
  expect(view.queryByLabelText('生成执行方式')).toBeNull();
  fireEvent.click(view.getByLabelText('思考设置'));
  expect(view.getByRole('switch').disabled).toBe(true);
  expect(view.getByLabelText('会话思考强度').disabled).toBe(true);
  view.rerender(React.createElement(AgentConversationOptions, {
    ...props, thinking: agentThinking(qwen.advancedParams, { thinkingEnabled: false }),
  }));
  fireEvent.click(view.getByRole('switch'));
  expect(patch).toHaveBeenCalledWith({ thinkingEnabled: true });
});

it('maps thinking preferences without inventing unsupported parameters across models', () => {
  expect(
    agentThinking(qwen.advancedParams, { thinkingEnabled: false, thinkingEffort: 'max' }),
  ).toMatchObject({
    enabled: false,
    canDisable: true,
    options: [],
    params: { enable_thinking: false },
  });
  expect(agentThinking(qwen.advancedParams, { thinkingEnabled: true }).params).toEqual({
    enable_thinking: true,
  });
  expect(
    agentThinking(glm.advancedParams, { thinkingEnabled: false, thinkingEffort: 'medium' }),
  ).toMatchObject({
    enabled: true,
    canDisable: false,
    params: { reasoning_effort: 'max' },
  });
  expect(agentThinking(DOUBAO_MODELS[0].advancedParams, { thinkingEnabled: false }).params).toEqual(
    { reasoning: 'minimal' },
  );
  expect(
    agentThinking(DOUBAO_MODELS[0].advancedParams, {
      thinkingEnabled: true,
      thinkingEffort: 'high',
    }).params,
  ).toEqual({ reasoning: 'high' });
  expect(agentThinking([], { thinkingEnabled: true, thinkingEffort: 'max' }).params).toEqual({});
});

function generationFixture({ direct = false, beforeResult } = {}) {
  installModelCatalog(modelContributions);
  let nodes = [
    {
      id: 'image-1',
      type: 'Image',
      title: '猫',
      prompt: '一只猫',
      imageModel: 'Qwen-Image 2.0 Pro · 移动云',
      parentIds: [],
      resolution: '1K',
      aspectRatio: '1:1',
      status: 'idle',
    },
  ];
  let permitted = direct;
  const journal = {
    prepare: vi.fn(async (batch) => ({ ...structuredClone(batch), revision: 1 })),
    claim: vi.fn(async (record) => ({ ...record, state: 'running', revision: 2 })),
    record: vi.fn(async (record, nodeId, state) => ({
      ...record,
      revision: record.revision + 1,
      items: record.items.map((item) => (item.nodeId === nodeId ? { ...item, state } : item)),
    })),
    finish: vi.fn(async (record) => ({
      ...record,
      state: 'finished',
      revision: record.revision + 1,
    })),
  };
  const generate = vi.fn(async (nodeId, authorization) => {
    expect(journal.claim).toHaveBeenCalledTimes(1);
    expect(authorization.valid()).toBe(true);
    await authorization.reserve('attempt-1');
    authorization.submitted('attempt-1');
    nodes = nodes.map((n) =>
      n.id === nodeId ? { ...n, status: 'success', resultUrl: '/mock.png' } : n,
    );
  });
  const creation = createCanvasCreationControl(
    async () => ({ ok: true, revision: 'rev1' }),
    () => ({ projectId: 'p1', nodes: () => nodes, generate }),
    async () =>
      Response.json({
        blocks: [
          {
            label: '移动云',
            media: [{ kind: 'image', models: [{ name: nodes[0].imageModel, configured: true }] }],
          },
        ],
      }),
    journal,
  );
  const execute = withGenerationApproval(
    async (request, signal) => {
      const result = await creation.control(request, signal);
      await beforeResult?.({
        changeNode: () => {
          nodes = nodes.map((n) => ({ ...n, prompt: '已修改' }));
        },
        revoke: () => {
          permitted = false;
        },
      });
      return result;
    },
    creation,
    () => {
      const granted = permitted;
      return () => granted && permitted;
    },
  );
  const request = {
    requestId: 'request-1',
    operationId: 'operation-1',
    projectId: 'p1',
    sessionId: 's1',
    expiresAt: Date.now() + 60000,
    command: { action: 'prepareGeneration', revision: 'rev1', nodeIds: ['image-1'] },
  };
  return { creation, execute, generate, journal, request };
}
it('defaults to confirmation and uses the existing claimed journal for manual execution', async () => {
  const f = generationFixture();
  const result = await f.execute(f.request);
  expect(result).toMatchObject({ ok: true, generationState: 'awaiting-approval' });
  expect(f.generate).not.toHaveBeenCalled();
  await Promise.all([
    f.creation.approve(result.generationPlanId),
    f.creation.approve(result.generationPlanId),
  ]);
  expect(f.generate).toHaveBeenCalledTimes(1);
  expect(f.creation.getSnapshot()[0]).toMatchObject({
    state: 'finished',
    items: [{ state: 'success' }],
  });
});
it('executes new batches directly once and persists the claim before submission', async () => {
  const f = generationFixture({ direct: true });
  const result = await f.execute(f.request);
  expect(result).toMatchObject({ ok: true, generationState: 'running' });
  await vi.waitFor(() => expect(f.creation.getSnapshot()[0].state).toBe('finished'));
  await f.execute(f.request);
  await f.creation.approve(result.generationPlanId);
  expect(f.generate).toHaveBeenCalledTimes(1);
  expect(f.journal.claim).toHaveBeenCalledTimes(1);
  expect(f.creation.getSnapshot()[0]).toMatchObject({
    approvalMode: 'direct',
    items: [{ state: 'success' }],
  });
});
it('does not auto-submit after configuration changes or authorization withdrawal', async () => {
  const changed = generationFixture({
    direct: true,
    beforeResult: ({ changeNode }) => changeNode(),
  });
  await changed.execute(changed.request);
  expect(changed.generate).not.toHaveBeenCalled();
  const revoked = generationFixture({ direct: true, beforeResult: ({ revoke }) => revoke() });
  expect(await revoked.execute(revoked.request)).toMatchObject({
    generationState: 'awaiting-approval',
  });
  expect(revoked.generate).not.toHaveBeenCalled();
  expect(revoked.journal.claim).not.toHaveBeenCalled();
});
it('never automatically approves recovered or cross-session batches', async () => {
  for (const patch of [
    { recovered: true },
    { sessionId: 'another-session' },
    { projectId: 'another-project' },
  ]) {
    const creation = {
      getSnapshot: () => [
        {
          id: 'b1',
          sessionId: 's1',
          projectId: 'p1',
          state: 'pending',
          expiresAt: Date.now() + 60000,
          ...patch,
        },
      ],
      approve: vi.fn(),
    };
    const execute = withGenerationApproval(
      async () => ({ ok: true, generationState: 'awaiting-approval', generationPlanId: 'b1' }),
      creation,
      () => () => true,
    );
    await execute({ projectId: 'p1', sessionId: 's1', command: { action: 'prepareGeneration' } });
    expect(creation.approve).not.toHaveBeenCalled();
  }
});
import './helpers/promptComposition.js';
