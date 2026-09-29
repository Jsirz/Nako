import { createHash } from 'node:crypto';
import { projectCanvasResult } from '../../../contracts/canvasControlProtocol.js';

/** Backend tools use the same runtime as the canvas; no browser bridge or provider access. */
export function createNodeToolDispatch({ runs, registry, scope }) {
  return async ({ command, projectId, sessionId, signal }) => {
    const project = await runs.project(projectId);
    const revision = 'node:' + project.revision;
    if (command.action === 'nodes') return projectCanvasResult({ ok: true, revision,
      nodeDefinitions: registry.listDefinitions().filter(node => node.agent?.exposed).map(node => ({ ...node, packageId: node.owner })) });
    if (command.action === 'nodeStatus') {
      let run = runs.get(command.operationId, scope);
      if (run.projectId !== projectId) return { ok: false, code: 'UNAVAILABLE' };
      run = await runs.observe(run.id, scope);
      return projectCanvasResult({ ok: true, revision, nodeRunId: run.id, nodeState: run.status, nodeResult: run.results, message: run.error });
    }
    if (command.action !== 'runNode') return null;
    if (command.revision !== revision) return { ok: false, code: 'CONFLICT', revision };
    const requestId = createHash('sha256').update(JSON.stringify([sessionId, command])).digest('hex');
    let run = await runs.prepare({ requestId, projectId, revision: project.revision, maxModelCalls: 10,
      nodes: [{ id: 'agent-' + requestId.slice(0, 24), type: command.nodeType, pluginId: command.pluginId, parameters: command.parameters || {} }],
      initialInputs: { ['agent-' + requestId.slice(0, 24)]: (command.inputs || []).map(item => ({ targetPortId: item.portId, value: item.value })) },
    }, { scope, agent: true });
    if (run.status === 'running') {
      const cancel = () => { void runs.cancel(run.id, scope); };
      signal?.addEventListener('abort', cancel, { once: true });
      try { if (signal?.aborted) cancel(); run = await runs.wait(run.id, scope); }
      finally { signal?.removeEventListener('abort', cancel); }
    }
    return projectCanvasResult({ ok: true, revision, nodeRunId: run.id, nodeState: run.status, nodeResult: run.results, message: run.error });
  };
}
