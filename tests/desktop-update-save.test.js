// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';
import { useCanvasAutoSave } from '../modules/project/ui/persistence/canvasAutoSaveLifecycle';
import { PREPARE_DESKTOP_RESTART } from '../modules/contracts/desktopUpdates';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function prepare() {
  const promises = [];
  window.dispatchEvent(new CustomEvent(PREPARE_DESKTOP_RESTART, {
    detail: { waitUntil: promise => promises.push(promise) },
  }));
  return Promise.all(promises);
}
it.each([null, { id: 'canvas', unchanged: false }])('rejects restart with incomplete save receipt %j', async receipt => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const onSave = vi.fn(async () => receipt);
  renderHook(() => useCanvasAutoSave(React, { enabled: true, isDirty: true, nodes: [], onSave, documentId: 'canvas' }));
  await act(async () => { expect(await prepare()).toEqual([false]); });
  expect(onSave).toHaveBeenCalledOnce();
});
it('saves a dirty canvas and releases the restart listener on unmount', async () => {
  const onSave = vi.fn(async () => ({ id: 'canvas', unchanged: true }));
  const { unmount } = renderHook(() => useCanvasAutoSave(React, {
    enabled: true, isDirty: true, nodes: [], onSave, documentId: 'canvas',
  }));
  await act(async () => { expect(await prepare()).toEqual([true]); });
  unmount();
  expect(await prepare()).toEqual([]);
});
