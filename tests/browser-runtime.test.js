// @vitest-environment jsdom
import { it, expect, vi } from 'vitest';

it('starts the real browser module sequence with working adapters and no window service globals', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  vi.stubGlobal('__NAKO_BUILD__', 'plugin-test');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({ values: {}, browserImported: true, groups: [], blocks: [] }),
          { headers: { 'content-type': 'application/json' } },
        ),
    ),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.scrollTo = () => {};
  const observers = [];
  const NativeObserver = MutationObserver;
  vi.stubGlobal(
    'MutationObserver',
    class extends NativeObserver {
      constructor(callback) {
        super(callback);
        observers.push(this);
      }
    },
  );
  const { browserHost, browserServices } = await import('../modules/kernel/browser.ts');
  try {
    await import('../apps/canvas/bootstrap.ts');
    expect(browserHost.list()).toHaveLength(11);
    expect(browserHost.list().every((p) => p.state === 'active')).toBe(true);
    expect(browserServices.__NAKO_CANVAS_SELECTION__.clearSelection()).toEqual([]);
    expect(browserServices.__NAKO_VIDEO_PLAYBACK__).toBeDefined();
    expect(browserHost.services.has('ui.agent.surfaces')).toBe(true);
    expect(browserServices.__NAKO_IMAGE_MODE__).toBeDefined();
    expect(browserServices.__NAKO_MODEL_PRICING__).toBeDefined();
    expect(
      Object.keys(window).filter(
        (key) => key.startsWith('__NAKO_') && key !== '__NAKO_BUILD__',
      ),
    ).toEqual([]);
    await expect(browserHost.unload('ui.canvas-shell')).rejects.toMatchObject({
      code: 'PLUGIN_BUSY',
    });
  } finally {
    observers.forEach((observer) => observer.disconnect());
    await browserHost.stop();
    vi.unstubAllGlobals();
  }
}, 30_000);
