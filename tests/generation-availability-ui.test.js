// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { browserHost } from '../modules/kernel/browser.ts';
import { getGenerationConcurrency } from '../modules/generation-core/ui/generation/generationClient.ts';
import { useGenerationAvailability } from '../modules/canvas-ui/ui/nodes/useGenerationAvailability.ts';

let release;
beforeEach(() => {
  vi.useFakeTimers();
  release = browserHost.services.register('ui.generation', {
    concurrency: getGenerationConcurrency,
  });
});
afterEach(() => {
  cleanup();
  release();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('shows a removed model error without polling, then checks the newly selected model', async () => {
  const fetcher = vi.spyOn(window, 'fetch').mockResolvedValueOnce(Response.json({
    code: 'INVALID_MODEL_CONFIGURATION',
    error: '模型已不可用，请重新选择模型。',
  }, { status: 400 })).mockResolvedValue(Response.json({
    blocked: false, inFlight: 0, maxConcurrent: 1,
  }));
  const { result, rerender } = renderHook(
    ({ model }) => useGenerationAvailability(React, model, ''),
    { initialProps: { model: 'GPT-5.6 Luna · Work-Fisher' } },
  );
  await act(async () => {});
  expect(result.current).toMatchObject({
    checking: false, blocked: true, warning: '模型已不可用，请重新选择模型。',
  });
  await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
  expect(fetcher).toHaveBeenCalledTimes(1);
  rerender({ model: 'GPT-6 Luna · Work-Fisher' });
  await act(async () => {});
  expect(result.current).toMatchObject({ checking: false, blocked: false, warning: '' });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(new URL(fetcher.mock.calls[1][0], 'http://localhost').searchParams.get('modelName'))
    .toBe('GPT-6 Luna · Work-Fisher');
});

it('retries transient concurrency failures and clears the warning after recovery', async () => {
  const fetcher = vi.spyOn(window, 'fetch').mockResolvedValueOnce(Response.json({
    error: '暂时不可用',
  }, { status: 503 })).mockResolvedValue(Response.json({
    blocked: false, inFlight: 0, maxConcurrent: 1,
  }));
  const { result } = renderHook(() => useGenerationAvailability(React, 'text model', ''));
  await act(async () => {});
  expect(result.current).toMatchObject({ blocked: false, warning: expect.stringContaining('暂时无法读取') });
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(result.current).toMatchObject({ checking: false, blocked: false, warning: '' });
});
