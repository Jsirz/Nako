import { ERRORS, PluginError } from '../../../contracts/index.js';
import { browserServices, promptComposition } from '../../../kernel/browser';
import { declaredNodeOutput } from '../../../contracts/nodeValues.js';
import type { GenerationTaskStatus, GenerationTaskEvent, GenerationPromptNode, GenerationSchedulerAdapter } from '../../../contracts/generationScheduler';
export type { GenerationTaskStatus, GenerationTaskEvent, GenerationTaskState, GenerationPromptNode, GenerationSchedulerAdapter } from '../../../contracts/generationScheduler';

declare global {
  interface Window {
    __NAKO_GENERATION_SCHEDULER__?: GenerationSchedulerAdapter;
  }
}

const ALLOWED_EVENTS: Record<GenerationTaskStatus, readonly GenerationTaskEvent['type'][]> = {
  idle: ['enqueue'],
  queued: ['start', 'cancel'],
  loading: ['succeed', 'fail', 'cancel', 'timeout'],
  success: ['enqueue'],
  error: ['enqueue'],
  cancelled: ['enqueue'],
  'timed-out': ['enqueue'],
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function independentTemplate(node: GenerationPromptNode): string { return text(node.prompt); }

export function createGenerationScheduler(): GenerationSchedulerAdapter {
  const inFlight = new Map<string, string>();
  const listeners = new Set<() => void>();
  let acquired = 0;
  let rejected = 0;
  let promptBuilds = 0;
  let snapshotVersion = 0;

  const notify = () => {
    snapshotVersion += 1;
    for (const listener of listeners) listener();
  };

  return {
    acquire(nodeId) {
      if (inFlight.has(nodeId)) {
        rejected += 1;
        return false;
      }
      inFlight.set(nodeId, crypto.randomUUID());
      acquired += 1;
      notify();
      return true;
    },
    release(nodeId, attemptId) {
      if (attemptId && inFlight.get(nodeId) !== attemptId) return;
      if (inFlight.delete(nodeId)) notify();
    },
    isInFlight(nodeId) {
      return inFlight.has(nodeId);
    },
    currentAttempt(nodeId) {
      return inFlight.get(nodeId) || null;
    },
    decorateRequest(request) {
      if (typeof request.generationAttemptId === 'string' && request.generationAttemptId) return request;
      const nodeId = typeof request.nodeId === 'string' ? request.nodeId : '';
      const generationAttemptId = nodeId ? inFlight.get(nodeId) : undefined;
      return generationAttemptId ? { ...request, generationAttemptId } : request;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    version() {
      return snapshotVersion;
    },
    buildPrompt(nodes, node) {
      promptBuilds += 1;
      const nodesById = new Map(nodes.map((candidate) => [candidate.id, candidate]));
      const visited = new Set<string>();
      const upstreamTextNodes = new Map<string, GenerationPromptNode>();

      const pending = [...(node.parentIds ?? [])];
      while (pending.length) {
        const nodeId = pending.pop()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        const candidate = nodesById.get(nodeId);
        if (!candidate) continue;
        if ((candidate.type.toLowerCase() === 'text' || declaredNodeOutput(candidate)?.kind === 'text') && text(declaredNodeOutput(candidate)?.value ?? candidate.textContent)) {
          upstreamTextNodes.set(candidate.id, candidate);
        }
        for (const parentId of candidate.parentIds ?? []) pending.push(parentId);
      }

      const upstreamText = [...upstreamTextNodes.values()]
        .sort(
          (first, second) =>
            Number(first.y ?? 0) - Number(second.y ?? 0) ||
            Number(first.x ?? 0) - Number(second.x ?? 0) ||
            first.id.localeCompare(second.id),
        )
        .map((candidate) => text(declaredNodeOutput(candidate)?.value ?? candidate.textContent));
      // Text 节点的大画布区是「正文」，下方生成面板是「转换模板」。
      // 两者必须分开保存，只在发起大模型请求时组合，否则模板会反向覆盖正文。
      const ownText = node.type.toLowerCase() === 'text' ? text(node.textContent) : '';
      const prompts = promptComposition();
      return [prompts.compose([...upstreamText, ownText, independentTemplate(node)].filter(Boolean).join('\n'), node.creativePresets, node.type), node.type === 'Image' ? prompts.imageAngle(node.imageAngle) : ''].filter(Boolean).join('\n');
    },
    transition(task, event) {
      if (!ALLOWED_EVENTS[task.status].includes(event.type)) {
        throw new PluginError(ERRORS.generationState, `invalid generation transition: ${task.status} -> ${event.type}`, { context: { moduleId: 'generation-core', nodeId: task.nodeId, status: task.status, event: event.type } });
      }
      switch (event.type) {
        case 'enqueue':
          return {
            nodeId: task.nodeId,
            status: 'queued',
            queuedAt: event.at,
          };
        case 'start':
          return { ...task, status: 'loading', startedAt: event.at, error: undefined };
        case 'succeed':
          return {
            ...task,
            status: 'success',
            finishedAt: event.at,
            resultUrl: event.resultUrl,
            error: undefined,
          };
        case 'fail':
          return { ...task, status: 'error', finishedAt: event.at, error: event.error };
        case 'cancel':
          return { ...task, status: 'cancelled', finishedAt: event.at };
        case 'timeout':
          return { ...task, status: 'timed-out', finishedAt: event.at, error: 'timeout' };
      }
    },
    getDiagnostics() {
      return { acquired, rejected, active: inFlight.size, promptBuilds };
    },
  };
}

export function installGenerationScheduler(): GenerationSchedulerAdapter {
  if (browserServices.__NAKO_GENERATION_SCHEDULER__) return browserServices.__NAKO_GENERATION_SCHEDULER__;
  const adapter = Object.freeze(createGenerationScheduler());
  browserServices.__NAKO_GENERATION_SCHEDULER__ = adapter;
  return adapter;
}
