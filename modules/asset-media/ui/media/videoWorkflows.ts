import type { VideoWorkflowType, MiniMaxH3Mode, VideoWorkflowRequest, VideoCapability, VideoWorkflowResult } from '../../../contracts/videoWorkflowUi';
export type { VideoWorkflowType, MiniMaxH3Mode, VideoWorkflowRequest, VideoCapability, VideoWorkflowResult } from '../../../contracts/videoWorkflowUi';
import { mediaError } from '../../../contracts/mediaDelivery.js';
import { browserServices } from '../../../kernel/browser';










async function readJson<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: unknown };
  if (!response.ok) {
    throw mediaError(result?.error ? String(result.error) : `本地视频工作流失败 (${response.status})`, { operation: 'readVideoWorkflow', httpStatus: response.status });
  }
  return result;
}

export function createVideoWorkflowClient(fetcher: typeof fetch = globalThis.fetch) {
  return {
    async getCapabilities(): Promise<VideoCapability[]> {
      const result = await fetcher('/api/comfy/capabilities?outputType=videos').then(
        (response) => readJson<{ capabilities: VideoCapability[] }>(response),
      );
      return result.capabilities;
    },
    run(
      workflowType: VideoWorkflowType,
      request: VideoWorkflowRequest,
    ): Promise<VideoWorkflowResult> {
      return fetcher(`/api/comfy/${encodeURIComponent(workflowType)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      }).then((response) => readJson<VideoWorkflowResult>(response));
    },
    getOperation(workflowType: VideoWorkflowType, projectId: string, operationId: string): Promise<VideoWorkflowResult> {
      const query = new URLSearchParams({ projectId });
      return fetcher(`/api/comfy/${encodeURIComponent(workflowType)}/operations/${encodeURIComponent(operationId)}?${query}`)
        .then((response) => response.status === 404
          ? { status: 'unknown' as const, operationId }
          : readJson<VideoWorkflowResult>(response));
    },
  };
}

export type VideoWorkflowClient = ReturnType<typeof createVideoWorkflowClient>;

declare global {
  interface Window {
    __NAKO_VIDEO_WORKFLOWS__?: VideoWorkflowClient;
  }
}

export function installVideoWorkflows(
  client = createVideoWorkflowClient(),
): VideoWorkflowClient {
  browserServices.__NAKO_VIDEO_WORKFLOWS__ = client;
  return client;
}
