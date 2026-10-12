import * as React from 'react';
import { ProjectError, PROJECT_ERRORS } from '../../../contracts/projectErrors.js';
import type { ShowcaseVideoCacheRequest, ShowcaseVideoCacheResult } from '../../../contracts/showcaseVideo.js';

export function useShowcaseVideo(source?: string) {
  const [state, setState] = React.useState({ url: '', loading: Boolean(source), error: '' });
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    if (!source) { setState({ url: '', loading: false, error: '' }); return; }
    const controller = new AbortController();
    setState({ url: '', loading: true, error: '' });
    const request: ShowcaseVideoCacheRequest = { video: source };
    void fetch('/api/showcase/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request), signal: controller.signal,
    }).then(async response => {
      const result = await response.json() as ShowcaseVideoCacheResult & { error?: string };
      if (!response.ok || !/^\/api\/showcase\/videos\/[a-f0-9]{64}$/.test(result?.url || ''))
        throw new ProjectError(PROJECT_ERRORS.videoDownload, result?.error || '视频缓存失败，请重试。', {
          status: response.status, context: { operation: 'prepareShowcaseVideo' },
        });
      if (!controller.signal.aborted) setState({ url: result.url, loading: false, error: '' });
    }).catch(error => {
      if (!controller.signal.aborted) setState({ url: '', loading: false,
        error: error instanceof Error ? error.message : '视频缓存失败，请重试。' });
    });
    return () => controller.abort();
  }, [source, retry]);
  return { ...state, retry: () => setRetry(value => value + 1) };
}
