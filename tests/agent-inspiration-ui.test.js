// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { AgentInspirationNavigator } from '../modules/agent/ui/agent/AgentInspirationNavigator';
import { AgentMessageExport } from '../modules/agent/ui/agent/AgentMessageExport';
import { renderAgentPanelHeader } from '../modules/agent/ui/agent/renderAgentPanelShell';

afterEach(cleanup);
function fixture(overrides = {}) {
  const state = {
    prompt: '一座未来城市', isLoading: false, hasMessages: false, nodes: [], references: [], referencedNodes: [],
    props: { onLocateNode: vi.fn(), onClose: vi.fn() }, setShowHistory: vi.fn(),
    attachments: { documents: [], add: vi.fn() },
    composerRef: { current: { focus: vi.fn() } },
    setPrompt: vi.fn(), setExcludedNodes: vi.fn(), workspace: { patch: vi.fn() },
    chat: { sendMessage: vi.fn() },
    ...overrides,
  };
  const actions = { chooseFile: vi.fn(), submit: vi.fn() };
  function Panel({ overrides = {} }) {
    const [inspirationSource, setInspirationSource] = React.useState(null);
    const current = { ...state, ...overrides, inspirationSource, setInspirationSource };
    const icons = { Tooltip: ({ children }) => children, AddIcon: () => null,
      HistoryIcon: () => null, CloseIcon: () => null };
    return React.createElement(React.Fragment, null,
      renderAgentPanelHeader(React, current, actions, icons),
      React.createElement(AgentInspirationNavigator, { state: current, actions }));
  }
  const view = render(React.createElement(Panel));
  return { state, actions, view, rerender: (overrides) => view.rerender(React.createElement(Panel, { overrides })) };
}

it('prepares an editable request while preserving input and requiring generation confirmation', () => {
  const { state, actions, view } = fixture();
  expect(view.queryByRole('button', { name: '返回灵感来源' })).toBeNull();
  fireEvent.click(view.getByRole('button', { name: '从文字灵感开始' }));
  fireEvent.click(view.getByRole('button', { name: '选择任务' }));
  fireEvent.click(view.getByRole('button', { name: '返回灵感来源' }));
  expect(view.queryByRole('button', { name: '返回灵感来源' })).toBeNull();
  fireEvent.click(view.getByRole('button', { name: '从文字灵感开始' }));
  expect(view.getByRole('button', { name: '返回选择来源' })).toBeTruthy();
  fireEvent.click(view.getByRole('button', { name: '选择任务' }));
  expect(state.setPrompt).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole('button', { name: /分拆脚本/ }));
  expect(state.setPrompt.mock.calls[0][0]).toContain('一座未来城市');
  expect(state.setPrompt.mock.calls[0][0]).toContain('分拆脚本');
  expect(state.workspace.patch).toHaveBeenCalledWith({ generationApproval: 'confirm' });
  expect(state.composerRef.current.focus).toHaveBeenCalled();
  expect(actions.submit).not.toHaveBeenCalled();
  expect(state.chat.sendMessage).not.toHaveBeenCalled();
});

it('requires source-matching media and blocks tasks while an upload or run is pending', () => {
  const { state, actions, view, rerender } = fixture({ references: [{ type: 'audio', nodeId: 'a1' }] });
  fireEvent.click(view.getByRole('button', { name: '从图片灵感开始' }));
  expect(view.getByRole('button', { name: '选择任务' }).disabled).toBe(true);
  fireEvent.click(view.getByRole('button', { name: '上传文件' }));
  expect(actions.chooseFile).toHaveBeenCalledWith('image/*');
  rerender({ references: [{ type: 'image', nodeId: 'i1' }] });
  fireEvent.click(view.getByRole('button', { name: '选择任务' }));
  rerender({ references: [{ type: 'image', nodeId: 'i1' }], isLoading: true });
  fireEvent.click(view.getByRole('button', { name: /图生视频/ }));
  expect(state.setPrompt).not.toHaveBeenCalled();
  expect(actions.submit).not.toHaveBeenCalled();
});

it('uses the existing canvas selection and can reattach a removed reference without submitting', () => {
  const reference = { nodeId: 'i1', type: 'image', url: '/library/media/p1/images/a.png' };
  const { state, actions, view } = fixture({
    nodes: [{ id: 'i1', type: 'Image', title: '参考图' }],
    props: { selectedReferenceNodes: [reference], onLocateNode: vi.fn() },
  });
  fireEvent.click(view.getByRole('button', { name: '从图片灵感开始' }));
  fireEvent.click(view.getByRole('button', { name: '从画布选择' }));
  fireEvent.click(view.getByRole('button', { name: '参考图' }));
  expect(state.props.onLocateNode).toHaveBeenCalledWith('i1');
  expect(state.attachments.add).toHaveBeenCalledWith(reference);
  expect(state.setExcludedNodes.mock.calls[0][0](['i1', 't1'])).toEqual(['t1']);
  expect(actions.submit).not.toHaveBeenCalled();
});

it('exports the edited result only after an explicit command and rejects an empty draft', async () => {
  const create = vi.fn();
  const view = render(React.createElement(AgentMessageExport, { content: '原始分镜', create }));
  fireEvent.click(view.getByRole('button', { name: '编辑结果' }));
  const draft = view.getByRole('textbox', { name: '编辑画布结果' });
  fireEvent.change(draft, { target: { value: '' } });
  expect(view.getByRole('button', { name: /复制并新建文本节点/ }).disabled).toBe(true);
  fireEvent.change(draft, { target: { value: '修改后的分镜' } });
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(view.getByRole('button', { name: /复制并新建文本节点/ }));
  expect(create).toHaveBeenCalledExactlyOnceWith('修改后的分镜');
  await view.findByRole('status');
});
