import { AgentOperationError } from '../../../contracts/agentErrors.js';
import { browserHost } from '../../../kernel/browser';
import {
  declaredModel,
  type DefaultModelsClient,
  type ModelKind,
} from '../../../contracts/defaultModels.js';
import { modelCatalog, generationPreparation, generationUi } from '../../../kernel/browser';
import type { CanvasCreationRuntime as Runtime, GenerationBatch } from '../../../contracts/agentCanvasWorkspace';
import type { GenerationModels } from '../../../contracts/generationUi';
import type { CanvasNode } from '../../../contracts/canvasDocument';
import { canvasModels, modelKey, modelParameters } from './canvasModelControl';
import type { GenerationPlanClient, GenerationPlanRecord } from './generationPlanClient';
import {
  validCanvasControl,
  projectCanvasResult,
  type CanvasActionHandler,
  type CanvasActionRequest,
  type CanvasResult,
} from '../../../contracts/canvasControlProtocol.js';

export type { GenerationBatch } from '../../../contracts/agentCanvasWorkspace';
// Full transitive input snapshots stay in memory; no storage paths/media URLs are sent to the model.
function inputs(nodes: CanvasNode[], id: string): CanvasNode[] {
  const found = new Map<string, CanvasNode>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new AgentOperationError('Cyclic input', { operation: 'generation-inputs', nodeId: id });
    if (found.has(id)) return;
    const node = nodes.find((item) => item.id === id);
    if (!node) throw new AgentOperationError('Missing input', { operation: 'generation-inputs', nodeId: id });
    found.set(id, node);
    visiting.add(id);
    (node.parentIds || []).filter(Boolean).forEach(visit);
    visiting.delete(id);
  };
  visit(id);
  return [...found.values()];
}
const generatedFields = new Set([
  'status',
  'resultUrl',
  'resultUrls',
  'currentResultCount',
  'resultAspectRatio',
  'lastFrame',
  'textContent',
  'networkUrl',
  'generationStartTime',
  'generationAttemptId',
  'generationDurationMs',
  'generationDiagnosticCode',
  'errorMessage',
]);
function configuration(node: CanvasNode) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(node).filter(
        ([key]) => !generatedFields.has(key) && !(node.type === 'Video' && key === 'aspectRatio'),
      ),
    ),
  );
}
export function createCanvasCreationControl(
  execute: CanvasActionHandler,
  getRuntime: () => Runtime | null,
  journal?: GenerationPlanClient,
) {
  const models = { imageModels: modelCatalog().list('image'), videoModels: modelCatalog().list('video'), audioModels: modelCatalog().list('audio'), textModels: modelCatalog().list('text') };
  const entries: GenerationEntries = new Map();
  const receipts = new Map<string, { signature: string; promise: Promise<CanvasResult> }>();
  const listeners = new Set<() => void>();
  let snapshot: GenerationBatch[] = [];
  let restoreError = '';
  const publish = () => {
    snapshot = [...entries.values()].map((entry) => structuredClone(entry.batch));
    listeners.forEach((listener) => listener());
  };
  const read = (request: CanvasActionRequest) =>
    execute({ ...request, requestId: crypto.randomUUID(), command: { action: 'read' } });
  const active = (request: CanvasActionRequest) =>
    Date.now() < request.expiresAt && getRuntime()?.projectId === request.projectId;
  const services = { models, entries, read, active, getRuntime, journal, publish };
  const handle = createGenerationPreparation(services);
  const control = createGenerationControl(execute, handle, receipts);
  const approve = createGenerationApproval(services);
  return { control, approve, ...createGenerationHistory({ entries, getRuntime, journal, publish,
    snapshot: () => snapshot, error: () => restoreError, setError: (value: string) => { restoreError = value; }, listeners }) };
}

type GenerationEntry = {
  batch: GenerationBatch; signatures: string[]; requests: string[]; record?: GenerationPlanRecord;
  writes?: Promise<void>; completion?: Promise<void>; journalFailed?: boolean;
};
type GenerationEntries = Map<string, GenerationEntry>;
type GenerationServices = {
  models: GenerationModels; entries: GenerationEntries;
  read(request: CanvasActionRequest): ReturnType<CanvasActionHandler>;
  active(request: CanvasActionRequest): boolean; getRuntime(): Runtime | null;
  journal?: GenerationPlanClient; publish(): void;
};
type GenerationExecutionServices = Pick<GenerationServices, 'models' | 'getRuntime' | 'journal' | 'publish'>;
function createGenerationPreparation({ models, entries, read, active, getRuntime, journal, publish }: GenerationServices) {
  async function handle(request: CanvasActionRequest, signal?: AbortSignal): Promise<CanvasResult> {
    if (!active(request) || signal?.aborted) return { ok: false, code: 'UNAVAILABLE' };
    const before = await read(request);
    if (!before.ok) return before;
    const command = request.command;
    if (command.action !== 'models' && command.action !== 'prepareGeneration')
      return { ok: false, code: 'INVALID' };
    try {
      const blocks = await generationPreparation().sources({ signal });
      if (!active(request) || signal?.aborted) return { ok: false, code: 'UNAVAILABLE' };
      if (command.action === 'models') {
        const allowed = new Set(canvasModels(command.type).map((item) => item.name));
        return projectCanvasResult({
          ok: true,
          revision: before.revision,
          models: blocks.flatMap((block) =>
            block.media
              .filter((media) => media.kind === command.type.toLowerCase())
              .flatMap((media) =>
                media.models
                  .filter(
                    (model) =>
                      model.configured &&
                      allowed.has(model.name) &&
                      (!command.model || command.model === model.name),
                  )
                  .map((model) => ({
                    name: model.name,
                    source: block.label,
                    parameters: command.model
                      ? JSON.stringify(modelParameters(command.type, model.name))
                      : '指定 model 查询有效参数',
                  })),
              ),
          ),
        });
      }
      const current = await read(request);
      if (!current.ok || current.revision !== command.revision)
        return { ok: false, code: 'CONFLICT' };
      const runtime = getRuntime();
      if (!runtime) return { ok: false, code: 'UNAVAILABLE' };
      const nodes = structuredClone(runtime.nodes());
      let selected = command.nodeIds.map((id) => nodes.find((node) => node.id === id));
      if (
        selected.some(
          (node) =>
            !node ||
            !canvasModels(node.type).some(
              (model) =>
                model.name ===
                (declaredModel(node.type.toLowerCase() as ModelKind, node) ||
                  browserHost.services
                    .optional<DefaultModelsClient>('generation.defaults')
                    ?.get(node.type.toLowerCase() as ModelKind)),
            ) ||
            node.status === 'loading' ||
            node.generationAttemptId,
        )
      )
        return { ok: false, code: 'INVALID' };
      const ordered: CanvasNode[] = [],
        remaining = new Set(command.nodeIds);
      while (remaining.size) {
        const next = selected.find(
          (node) =>
            node &&
            remaining.has(node.id) &&
            inputs(nodes, node.id)
              .slice(1)
              .every((parent) => !remaining.has(parent.id)),
        );
        if (!next) return { ok: false, code: 'INVALID' };
        ordered.push(next);
        remaining.delete(next.id);
      }
      selected = ordered;
      // One pending batch per conversation prevents piling up duplicate fee authorizations.
      if (
        [...entries.values()].some(
          (entry) =>
            entry.batch.sessionId === request.sessionId &&
            (entry.batch.state === 'running' ||
              (entry.batch.state === 'pending' && entry.batch.expiresAt > Date.now())),
        )
      )
        return { ok: false, code: 'CONFLICT' };
      if (entries.size >= 20) {
        const old = [...entries].find(
          ([, entry]) =>
            entry.batch.state !== 'running' &&
            (entry.batch.state !== 'pending' || entry.batch.expiresAt <= Date.now()),
        );
        if (!old) return { ok: false, code: 'UNAVAILABLE' };
        entries.delete(old[0]);
      }
      const batch: GenerationBatch = {
        id: crypto.randomUUID(),
        projectId: request.projectId,
        sessionId: request.sessionId,
        expiresAt: Date.now() + 10 * 60000,
        state: 'pending',
        items: [],
      };
      const signatures: string[] = [],
        requests: string[] = [];
      for (const node of selected as CanvasNode[]) {
        const kind = node.type.toLowerCase() as ModelKind;
        const model =
          declaredModel(kind, node) ||
          browserHost.services
            .optional<DefaultModelsClient>('generation.defaults')
            ?.resolve(kind) ||
          '';
        if (
          !blocks.some((block) =>
            block.media.some(
              (media) =>
                media.kind === node.type.toLowerCase() &&
                media.models.some((item) => item.name === model && item.configured),
            ),
          )
        )
          return { ok: false, code: 'UNAVAILABLE' };
        const dependencies = inputs(nodes, node.id);
        if (dependencies.some((input) => input.status === 'loading' || input.generationAttemptId))
          return { ok: false, code: 'CONFLICT' };
        const dependsOn = dependencies
          .slice(1)
          .filter((input) => command.nodeIds.includes(input.id))
          .map((input) => input.id);
        const prepared = await generationPreparation().prepare(
          nodes,
          node,
          request.projectId,
          models,
        );
        if (!Number.isSafeInteger(Number('generateCount' in prepared ? prepared.generateCount : 1)))
          return { ok: false, code: 'INVALID' };
        signatures.push(JSON.stringify(dependencies));
        requests.push(JSON.stringify(prepared));
        const display = generationParameterDisplay(prepared, node.type, model);
        batch.items.push({
          nodeId: node.id,
          title: String(node.title || node.id),
          model,
          parameters: dependsOn.length
            ? `${display}\n关联输入使用本批上游成功后的新结果。`
            : display,
          count: Number('generateCount' in prepared ? prepared.generateCount : 1),
          references: dependencies.slice(1).map((input) => String(input.title || input.id)),
          dependsOn,
          state: 'pending',
        });
      }
      if (batch.items.reduce((sum, item) => sum + item.count, 0) > 100)
        return { ok: false, code: 'INVALID' };
      const after = await read(request);
      if (!active(request) || signal?.aborted || !after.ok || after.revision !== command.revision)
        return { ok: false, code: 'CONFLICT' };
      const record = journal ? await journal.prepare(batch) : undefined;
      if (!active(request) || signal?.aborted) return { ok: false, code: 'UNCONFIRMED' };
      entries.set(batch.id, { batch, signatures, requests, record });
      if (entries.size > 20) {
        const old = [...entries].find(
          ([, entry]) => !['pending', 'running'].includes(entry.batch.state),
        );
        if (old) entries.delete(old[0]);
      }
      publish();
      return {
        ok: true,
        revision: after.revision,
        generationPlanId: batch.id,
        generationState: 'awaiting-approval',
      };
    } catch {
      return { ok: false, code: 'UNAVAILABLE' };
    }
  }
  return handle;
}

function createGenerationControl(execute: CanvasActionHandler,
  handle: (request: CanvasActionRequest, signal?: AbortSignal) => Promise<CanvasResult>,
  receipts: Map<string, { signature: string; promise: Promise<CanvasResult> }>) {
  const control: CanvasActionHandler = (request, signal) => {
    if (!validCanvasControl(request.command)) return { ok: false, code: 'INVALID' };
    if (!['models', 'prepareGeneration'].includes(request.command.action))
      return execute(request, signal);
    const signature = JSON.stringify(request);
    const prior = receipts.get(request.requestId);
    if (prior)
      return prior.signature === signature ? prior.promise : { ok: false, code: 'INVALID' };
    const promise = handle(request, signal);
    receipts.set(request.requestId, { signature, promise });
    if (receipts.size > 100) receipts.delete(receipts.keys().next().value!);
    return promise;
  };
  return control;
}

function createGenerationApproval({ models, entries, getRuntime, journal, publish }: GenerationServices) {
  // This method is held by the UI only. It is deliberately absent from canvas_control.
  async function approve(
    id: string,
    authorizationId?: string,
    approvalMode: 'confirm' | 'direct' = 'confirm',
  ) {
    const entry = entries.get(id);
    if (!entry || entry.batch.state !== 'pending' || entry.batch.recovered) return;
    const { batch, signatures } = entry;
    if (Date.now() >= batch.expiresAt) {
      batch.items.forEach((item) => {
        item.state = 'stopped';
      });
      batch.state = 'finished';
      publish();
      return;
    }
    batch.state = 'running';
    batch.authorizationId = authorizationId;
    batch.approvalMode = approvalMode;
    publish(); // Claim before the first await; duplicate clicks cannot resubmit.
    const unchanged = (index: number) => {
      const runtime = getRuntime();
      try {
        return (
          batch.state === 'running' &&
          !entry.journalFailed && Date.now() < batch.expiresAt &&
          runtime?.projectId === batch.projectId &&
          JSON.stringify(inputs(runtime.nodes(), batch.items[index].nodeId)) === signatures[index]
        );
      } catch {
        return false;
      }
    };
    entry.completion = (async () => {
      try {
        if (!batch.items.every((_, index) => unchanged(index))) return;
        await writeGenerationJournal(entry, journal, (record) => journal!.claim(record));
        await runGenerationBatch(entry, { models, getRuntime, journal, publish }, unchanged);
      } catch {
        /* No replay after claim or journal failure. */
      } finally {
        batch.items.forEach((item) => {
          if (item.state === 'pending') item.state = 'stopped';
          else if (item.state === 'submitted') item.state = 'unconfirmed';
        });
        if (batch.state !== 'cancelled') batch.state = 'finished';
        try {
          await writeGenerationJournal(entry, journal, (record) => journal!.finish(record));
        } catch {
          batch.items.forEach((item) => {
            if (item.state !== 'success' && item.state !== 'failed') item.state = 'unconfirmed';
          });
        }
        publish();
      }
    })();
    await entry.completion;
  }
  return approve;
}

// Each write reads the latest revision inside the queue, including cancellation/finalization.
function writeGenerationJournal(entry: GenerationEntry,
  journal: GenerationPlanClient | undefined,
  write: (record: GenerationPlanRecord) => Promise<GenerationPlanRecord>) {
  if (!journal || !entry.record) return Promise.resolve();
  const next = (entry.writes || Promise.resolve()).then(async () => {
    entry.record = await write(entry.record!);
  }).catch((error: unknown) => {
    entry.journalFailed = true;
    throw error;
  });
  entry.writes = next;
  return next;
}

async function runGenerationBatch(entry: GenerationEntry,
  services: GenerationExecutionServices, unchanged: (index: number) => boolean) {
  const { batch, requests } = entry;
  const pending = new Set(batch.items.map((_, index) => index));
  const running = new Map<number, Promise<void>>(), byModel = new Map<string, number>();
  const prepared = new Set<number>();
  const stop = (index: number) => {
    batch.items[index].state = 'stopped'; pending.delete(index); services.publish();
  };
  try {
    while (pending.size || running.size) {
      for (const index of pending) {
        const item = batch.items[index];
        const parents = (item.dependsOn || []).map(id => batch.items.find(parent => parent.nodeId === id)!);
        if (batch.state !== 'running' || entry.journalFailed || Date.now() >= batch.expiresAt ||
          parents.some(parent => !['pending', 'submitted', 'success'].includes(parent.state))) {
          stop(index); continue;
        }
        if (parents.some(parent => parent.state !== 'success')) continue;
        if (!unchanged(index)) { stop(index); continue; }
        if (running.size >= 4) break;
        try {
          if (parents.length && !prepared.has(index)) {
            const runtime = services.getRuntime()!, nodes = runtime.nodes();
            const node = nodes.find(node => node.id === item.nodeId)!;
            requests[index] = JSON.stringify(await generationPreparation().prepare(
              nodes, { ...node, [modelKey(node.type)]: item.model }, batch.projectId, services.models,
            ));
            prepared.add(index);
          }
          if (!unchanged(index)) { stop(index); continue; }
          const request = JSON.parse(requests[index]);
          const mode = String(request.imageMode || request.videoMode || request.audioMode || request.languageMode || '');
          const capacity = await generationUi().concurrency(item.model, mode, AbortSignal.timeout(15000));
          if (!unchanged(index)) { stop(index); continue; }
          const key = capacity.modelId || item.model, local = byModel.get(key) || 0;
          if (capacity.blocked || (capacity.maxConcurrent > 0 && local >= capacity.maxConcurrent)) continue;
          pending.delete(index);
          byModel.set(key, local + 1); // Reserve before awaiting node preflight.
          const task = runGenerationBatchItem(entry, index, services, unchanged).finally(() => {
            byModel.set(key, (byModel.get(key) || 1) - 1);
            running.delete(index);
          });
          running.set(index, task);
        } catch {
          stop(index); // Preflight failed; nothing is replayed or submitted.
        }
      }
      if (running.size || pending.size) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([...running.values(), new Promise<void>(resolve => {
            timer = setTimeout(resolve, 1000);
          })]);
        } finally { if (timer) clearTimeout(timer); }
      }
    }
  } finally {
    // Finalization must never overtake still-running branches.
    await Promise.allSettled(running.values());
  }
}

async function runGenerationBatchItem(entry: GenerationEntry,
  index: number, { getRuntime, journal, publish }: GenerationExecutionServices, unchanged: (index: number) => boolean) {
  const { batch, signatures, requests } = entry, item = batch.items[index];
  let submitted = false;
  try {
    if (!unchanged(index)) { item.state = 'stopped'; return; }
    const original = getRuntime()!.nodes().find(node => node.id === item.nodeId)!;
    await getRuntime()!.generate(item.nodeId, {
      authorizationId: batch.authorizationId,
      planId: journal ? batch.id : undefined,
      valid: () => unchanged(index),
      request: requests[index],
      reserve: (attemptId) => writeGenerationJournal(entry, journal,
        (record) => journal!.record(record, item.nodeId, 'submitted', attemptId)),
      submitted: () => { submitted = true; item.state = 'submitted'; publish(); },
    });
    const runtime = getRuntime();
    const node = runtime?.projectId === batch.projectId ? runtime.nodes().find(node => node.id === item.nodeId) : undefined;
    let state: GenerationBatch['items'][number]['state'] = !submitted ? 'stopped'
      : node?.status === 'success' && !node.generationAttemptId ? 'success'
        : node?.status === 'error' && !node.generationAttemptId ? 'failed' : 'unconfirmed';
    if (state === 'success' && node && configuration(original) !== configuration(node)) state = 'unconfirmed';
    await writeGenerationJournal(entry, journal, (record) => {
      const persisted = record.items.find(candidate => candidate.nodeId === item.nodeId);
      return persisted?.state === 'submitted'
        ? journal!.record(record, item.nodeId, ['success', 'failed'].includes(state) ? state : 'unconfirmed')
        : Promise.resolve(record);
    });
    if (state === 'success' && node) {
      for (let next = index + 1; next < batch.items.length; next++) {
        const expected: CanvasNode[] = JSON.parse(signatures[next]);
        signatures[next] = JSON.stringify(expected.map(input => input.id === item.nodeId ? node : input));
      }
    }
    item.state = state; // Downstream becomes ready only after the success journal commits.
  } catch {
    item.state = submitted || entry.journalFailed ? 'unconfirmed' : 'stopped';
  } finally { publish(); }
}

function createGenerationHistory({ entries, getRuntime, journal, publish, snapshot, error, setError, listeners }: {
  entries: GenerationEntries; getRuntime(): Runtime | null; journal?: GenerationPlanClient;
  publish(): void; snapshot(): GenerationBatch[]; error(): string; setError(value: string): void;
  listeners: Set<() => void>;
}) {
  return {
    async restore(projectId: string) {
      if (!journal || getRuntime()?.projectId !== projectId) return;
      let records: GenerationPlanRecord[];
      try {
        records = await journal.list(projectId);
        setError('');
      } catch {
        setError('批次记录读取失败，已保留原任务；请先核对节点状态，勿重复生成。');
        publish();
        return;
      }
      if (getRuntime()?.projectId !== projectId) return;
      for (const record of records) {
        if (entries.has(record.id)) continue;
        const batch: GenerationBatch = {
          ...record,
          recovered: true,
          state: record.state === 'cancelled' ? 'cancelled' : 'finished',
          items: record.items.map((item) => ({
            ...item,
            state:
              item.state === 'submitted'
                ? 'unconfirmed'
                : item.state === 'pending'
                  ? 'stopped'
                  : item.state,
          })),
        };
        entries.set(batch.id, { batch, record, signatures: [], requests: [] });
      }
      publish();
    },
    getSnapshot: snapshot,
    getError: error,
    cancelSession(sessionId: string) {
      for (const entry of entries.values())
        if (
          entry.batch.sessionId === sessionId &&
          ['pending', 'running'].includes(entry.batch.state)
        )
          entry.batch.state = 'cancelled';
      publish();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    cancel: async (id: string) => {
      const entry = entries.get(id);
      if (entry && ['pending', 'running'].includes(entry.batch.state)) {
        const running = entry.batch.state === 'running';
        entry.batch.state = 'cancelled';
        publish();
        if (running) await entry.completion;
        else if (journal && entry.record) {
          try {
            await writeGenerationJournal(entry, journal, (record) => journal.finish(record));
          } catch {
            /* Keep local stop; never replay. */
          }
        }
      }
    },
  };
}
function generationParameterDisplay(prepared: Record<string, unknown>, type: string, model: string) {
  const labels: Record<string, string> = {
    prompt: '提示词', resolution: '分辨率', aspectRatio: '比例', duration: '时长（秒）',
    generateCount: '生成数量', imageMode: '图片模式', videoMode: '视频模式', audioMode: '音频模式',
    languageMode: '文本模式', quality: '质量', detail: '细节', web_search: '联网搜索', lyrics: '歌词',
  };
  modelParameters(type, model).forEach((item) => { labels[item.key] = item.label; });
  return Object.entries(prepared).filter(([key, value]) =>
    !['nodeId', 'projectId', 'cost', 'imageModel', 'videoModel', 'audioModel', 'textModel', 'videoUrl'].includes(key)
      && ['string', 'number', 'boolean'].includes(typeof value))
    .map(([key, value]) => `${labels[key] || key}：${value}`).join('\n');
}

export type { CanvasCreationControl } from '../../../contracts/agentCanvasWorkspace';
