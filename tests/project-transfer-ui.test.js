// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderHook, act, cleanup, render, fireEvent } from '@testing-library/react';
import { useCanvasProjectTransfer } from '../modules/project/ui/persistence/canvasProjectTransfer';
import { CanvasTransferMenu } from '../modules/canvas-ui/ui/dialogs/CanvasTransferMenu';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const options = () => ({ enabled: true, getWorkflowEpoch: () => 1,
  save: vi.fn(async () => ({ id: 'current', unchanged: true })), openProject: vi.fn(), openJson: vi.fn() });
it('does not export when edits remain unsaved or saving fails', async () => {
  const config = options(), fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  config.save.mockResolvedValue({ id: 'current', unchanged: false });
  const { result } = renderHook(() => useCanvasProjectTransfer(React, config));
  await act(async () => { await expect(result.current.exportWorkflow()).rejects.toThrow('尚未全部保存'); });
  expect(fetcher).not.toHaveBeenCalled();
  config.save.mockRejectedValue(new Error('保存冲突'));
  await act(async () => { await expect(result.current.exportWorkflow()).rejects.toThrow('保存冲突'); });
  expect(fetcher).not.toHaveBeenCalled();
});
it('saves before importing JSON and requests an independent archive copy', async () => {
  const config = options();
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'imported' }) }));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(() => useCanvasProjectTransfer(React, config));
  await act(async () => { await result.current.importWorkflow(new File(['{}'], 'canvas.json')); });
  expect(config.save.mock.invocationCallOrder[0]).toBeLessThan(config.openJson.mock.invocationCallOrder[0]);
  await act(async () => { await result.current.importWorkflow(new File(['archive'], 'canvas.nako')); });
  expect(fetcher.mock.calls[0][0]).toBe('/api/workflows/restore?copy=true');
  expect(config.openProject).toHaveBeenCalledWith('imported');
});
it('ignores late import responses after switching projects and blocks duplicate transfers', async () => {
  const config = options();
  let epoch = 1, complete;
  config.getWorkflowEpoch = () => epoch;
  vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { complete = resolve; })));
  const { result } = renderHook(() => useCanvasProjectTransfer(React, config));
  let pending;
  await act(async () => { pending = result.current.importWorkflow(new File(['a'], 'canvas.nako')); });
  await act(async () => { await result.current.exportWorkflow(); });
  expect(config.save).toHaveBeenCalledTimes(1);
  epoch++;
  await act(async () => { complete({ ok: true, json: async () => ({ id: 'late' }) }); await pending; });
  expect(config.openProject).not.toHaveBeenCalled();
  expect(result.current.transferring).toBe(false);
});
it('exposes both menu actions, disables them during transfer and reports export failure', async () => {
  const props = { busy: false, onImport: vi.fn(), onExport: vi.fn(async () => { throw Error('素材不可读'); }), close: vi.fn(), onError: vi.fn() };
  const view = render(React.createElement(CanvasTransferMenu, props));
  fireEvent.click(view.getByText('导入画布工作流'));
  expect(props.onImport).toHaveBeenCalledTimes(1);
  await act(async () => { fireEvent.click(view.getByText('导出画布工作流')); });
  expect(props.onError).toHaveBeenCalledWith('素材不可读');
  view.rerender(React.createElement(CanvasTransferMenu, { ...props, busy: true }));
  expect(view.getByText('导入画布工作流').disabled).toBe(true);
  expect(view.getByText('导出画布工作流').disabled).toBe(true);
});
