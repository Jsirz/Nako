import type { AgentClient, AgentSession } from './agentClient';
import type { CanvasActionHandler } from '../../../contracts/canvasControlProtocol.js';

/** Observe persisted runs without replaying messages or delivered operations. */
export function createAgentRunSync(options: {
  client: AgentClient;
  canvas?: { projectId: string; execute: CanvasActionHandler };
  apply(session: AgentSession): void;
  failed(error: unknown): void;
  settled(sessionId: string): void;
}) {
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    controller?.abort();
    controller = undefined;
    clearTimeout(timer);
  };
  function start(id: string) {
    cancel();
    const owner = new AbortController();
    controller = owner;
    const continuations: Array<() => Promise<void>> = [];
    const current = () => controller === owner && !owner.signal.aborted;
    const poll = async () => {
      try {
        const session = await options.client.getSession(id, { signal: owner.signal });
        if (!current()) return;
        options.apply(session);
        if (session.run?.status !== 'running') {
          options.settled(id);
          for (const next of continuations) {
            if (current()) await next();
          }
          return;
        }
        if (options.canvas) {
          const next = await options.client.resumeOperations(id, options.canvas.projectId, {
            signal: owner.signal,
            onCanvasAction: options.canvas.execute,
          });
          continuations.push(...next);
        }
      } catch (error) {
        if (current()) options.failed(error);
        if ((error as { status?: number })?.status === 404) return;
      }
      if (current()) timer = setTimeout(() => void poll(), 800);
    };
    timer = setTimeout(() => void poll(), 0);
  }
  return { start, cancel };
}
