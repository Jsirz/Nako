// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, getByRole, waitFor } from '@testing-library/dom';
import { mountShowcaseCacheSettings } from '../modules/project/ui/settings/showcaseCacheSettings';

afterEach(() => { vi.restoreAllMocks(); document.body.replaceChildren(); });
it('confirms cache deletion, prevents duplicate submissions and allows retry after an error', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: '作品缓存正在使用' }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ success: true }));
  const dispose = mountShowcaseCacheSettings(document.body, fetcher);
  const button = getByRole(document.body, 'button', { name: '清除缓存' });
  fireEvent.click(button); expect(fetcher).not.toHaveBeenCalled();
  confirm.mockReturnValue(true); fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => expect(getByRole(document.body, 'status').textContent).toBe('作品缓存正在使用'));
  expect(fetcher).toHaveBeenCalledTimes(1); expect(button.disabled).toBe(false);
  fireEvent.click(button);
  await waitFor(() => expect(getByRole(document.body, 'status').textContent).toContain('缓存已清除'));
  expect(fetcher.mock.calls[1][0]).toBe('/api/showcase/cache/clear');
  dispose(); expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
});
