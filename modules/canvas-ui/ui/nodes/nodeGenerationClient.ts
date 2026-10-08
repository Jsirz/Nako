import { canvasError } from '../../../contracts/canvasErrors.js';
import type { NodeGenerationClient, NodeRunRequest } from '../../../contracts/nodeExecution.js';
import { executeNodeGraph } from './nodeGraphClient';
import type { NodeRunReceipt } from '../../../contracts/nodeExecution.js';

export const nodeGenerationClient: NodeGenerationClient = {
  async observe(projectId, nodeId, requestId, signal) {
    const query = new URLSearchParams({ projectId, requestId });
    let url = '/api/node-runs/find?' + query;
    if (!requestId) {
      const history = await fetch('/api/node-runs?' + new URLSearchParams({ projectId }), { signal, cache: 'no-store' });
      if (!history.ok) throw canvasError('无法读取节点运行记录', 'node-generation.observe-history');
      const runs = await history.json() as NodeRunReceipt[];
      const latest = runs.filter(run => run.projectId === projectId && run.nodes?.length === 1 &&
        run.nodes[0].id === nodeId && run.nodes[0].pluginId === 'nako.canvas-core')
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
      // Older clients cleared the attempt on a non-final observation error. Only restore
      // an unresolved latest run; never substitute an older successful generation.
      if (!latest?.requestId || !(latest.status === 'interrupted' ||
          ['GENERATION_OBSERVATION_INTERRUPTED', 'GENERATION_SUBMISSION_UNKNOWN'].includes(latest.code || ''))) return null;
      requestId = latest.requestId;
      url = '/api/node-runs/' + encodeURIComponent(latest.id);
    }
    const response = await fetch(url, { signal, cache: 'no-store' });
    if (!response.ok) throw canvasError('无法读取节点运行状态', 'node-generation.observe');
    const run = await response.json() as NodeRunReceipt | null;
    if (!run) return null;
    const type = run.nodes?.find(node => node.id === nodeId)?.type;
    const value = type && run.results?.[nodeId]?.[type];
    const media = value as { url?: string; urls?: string[] } | undefined;
    return { status: run.recoveryPending ? 'unknown' : run.status === 'error' || run.status === 'interrupted' ? 'failed' : run.status,
      recoveryPending: run.recoveryPending,
      attemptId: requestId, type, ...(type === 'text' ? { text: String(value ?? '') } : { resultUrl: media?.url, resultUrls: media?.urls }),
      error: run.error, code: run.code };
  },
  async generate(kind, request) {
    const id = String(request.nodeId || crypto.randomUUID());
    const references = ['imageBase64', 'images', 'videos', 'audios'].flatMap(key => {
      const values = request[key]; return Array.isArray(values) ? values : [];
    });
    if (request.videoUrl && !references.includes(request.videoUrl)) references.push(request.videoUrl);
    const count = Math.min(10, Math.max(1, Number(request.generateCount) || 1));
    const options = Object.fromEntries(Object.entries(request).filter(([key]) => !['imageBase64', 'images', 'videos', 'audios', 'videoUrl', 'signal', 'agentAuthorizationId', 'agentPlanId'].includes(key)));
    const graph: NodeRunRequest = {
      requestId: String(request.generationAttemptId || crypto.randomUUID()), projectId: String(request.projectId || ''), maxModelCalls: count,
      authorizationId: request.agentAuthorizationId as string | undefined, planId: request.agentPlanId as string | undefined,
      nodes: [{ id, type: kind, pluginId: 'nako.canvas-core', nodeVersion: '1.0.0', parameters: {
        ...options, model: request[kind + 'Model'], count,
      } }],
      initialInputs: { [id]: references.map(value => ({ targetPortId: kind === 'text' ? 'context' : 'references', value })) },
    };
    // This host entry is reached by an explicit Generate action or the existing Agent authorization flow.
    // Custom package UI uses a separate host approval card and cannot call this service.
    const result = await executeNodeGraph(graph, async () => true);
    const value = result.results?.[id]?.[kind];
    if (kind === 'text') return { text: value };
    const media = value as { url?: string; urls?: string[] } | undefined;
    return media?.urls?.length ? { resultUrls: media.urls } : { resultUrl: media?.url };
  },
};
