import { DramaExecutionError } from '../../../../contracts/dramaExecutionError.js';
export { DramaExecutionError } from '../../../../contracts/dramaExecutionError.js';
import crypto from 'node:crypto';
import { OFFICIAL_DRAMA_BUNDLE, officialProductionBundle } from './officialDramaBundle.js';
import { productionProfileForBundle } from '../../../../contracts/officialProductionProfiles.js';

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const sharedLocks = new Map();
const TERMINAL = new Set(['success', 'failed', 'cancelled', 'unknown']);
const UNSURE_CODES = new Set([
  'GENERATION_INTERRUPTED',
  'GENERATION_TIMEOUT',
  'GENERATION_LEASE_EXPIRED',
  'PROVIDER_NETWORK_ERROR',
  'UPSTREAM_INVALID_RESPONSE',
  'GENERATION_CANCELLED',
]);
const clone = (value) => structuredClone(value);
const digest = (value) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function id(value) {
  if (
    typeof value !== 'string' ||
    !SAFE_ID.test(value) ||
    ['__proto__', 'constructor', 'prototype'].includes(value)
  ) {
    throw new DramaExecutionError('制作任务标识无效', 'DRAMA_REFERENCE_INVALID', 400);
  }
  return value;
}

function uuidFrom(value) {
  const hex = digest(value).split('');
  hex[12] = '4';
  hex[16] = '8';
  const result = hex.slice(0, 32).join('');
  return `${result.slice(0, 8)}-${result.slice(8, 12)}-${result.slice(12, 16)}-${result.slice(16, 20)}-${result.slice(20)}`;
}

function publicRecord(record) {
  if (!record) return null;
  const fields = [
    'planId',
    'projectId',
    'planRevision',
    'assetId',
    'attemptId',
    'attemptNumber',
    'stateRevision',
    'name',
    'kind',
    'status',
    'phase',
    'code',
    'error',
    'retryable',
    'remoteMayContinue',
    'width',
    'height',
    'createdAt',
    'updatedAt',
    'runId',
    'outputs',
  ];
  return Object.fromEntries(
    fields.filter((key) => record[key] !== undefined).map((key) => [key, clone(record[key])]),
  );
}

function checkedOutputs(outputs, projectId) {
  if (Array.isArray(outputs) && outputs.length > 1000)
    throw new DramaExecutionError('图像结果数量超过安全上限');
  return (Array.isArray(outputs) ? outputs : []).flatMap((output) => {
    if (output?.mediaKind !== 'image' || typeof output.url !== 'string' || !output.assetId)
      return [];
    const prefix = `/library/media/${encodeURIComponent(projectId)}/images/`;
    if (!output.url.startsWith(prefix)) return [];
    const filename = output.url.slice(prefix.length);
    if (!/^[A-Za-z0-9._-]+\.(?:png|jpe?g|webp|gif|avif)$/i.test(filename)) return [];
    return [
      {
        mediaId: id(String(output.assetId)),
        url: output.url,
        mediaKind: 'image',
        ...(Number.isFinite(output.bytes) ? { bytes: output.bytes } : {}),
        ...(typeof output.sha256 === 'string' ? { sha256: output.sha256 } : {}),
      },
    ];
  });
}

function bindField(bindingSet, field, mediaKind) {
  const matching = bindingSet.bindings.filter(
    (binding) =>
      String(binding.target?.nodeId) === field.nodeId &&
      binding.target?.fieldName === field.fieldName,
  );
  if (
    matching.length !== 1 ||
    (mediaKind && matching[0].control?.mediaKind !== mediaKind) ||
    (!mediaKind && matching[0].control?.kind === 'asset')
  ) {
    throw new DramaExecutionError(
      '官方工作流开放字段已经变化，请核对应用后再运行',
      'DRAMA_WORKFLOW_SCHEMA_CHANGED',
    );
  }
  return matching[0].key;
}

/** One instance per authenticated user runtime. Never derive storage paths from request IDs. */
export function createDramaExecutionService({
  planStore,
  libraryDirectory,
  executionStore,
  runningHubLibraryService,
  configurationStore,
  workflowCanvasNodeService,
  testRunService,
  runStore,
  generationCoordinator,
  compileSegment,
  appContext = {},
  now = () => new Date().toISOString(),
} = {}) {
  if (!planStore || !libraryDirectory || !generationCoordinator || !compileSegment) {
    throw new Error(
      'Drama execution requires user-scoped stores and the shared generation runtime',
    );
  }
  if (!executionStore) throw new Error('Drama execution requires a persistent execution store');
  const { root, read, write } = executionStore;
  const inFlight = new Set();
  let appLock = Promise.resolve();

  async function withLock(key, operation) {
    const lockKey = `${root}\0${key}`;
    const next = (sharedLocks.get(lockKey) || Promise.resolve())
      .catch(() => undefined)
      .then(operation);
    sharedLocks.set(lockKey, next);
    try {
      return await next;
    } finally {
      if (sharedLocks.get(lockKey) === next) sharedLocks.delete(lockKey);
    }
  }

  async function requirePlan(input, approval = false) {
    id(input.planId);
    id(input.projectId);
    const plan = await planStore.get(input.planId, input.projectId);
    if (!plan || plan.projectId !== input.projectId || plan.id !== input.planId) {
      throw new DramaExecutionError('制作计划不存在于当前项目', 'DRAMA_PLAN_NOT_FOUND', 404);
    }
    if (
      approval &&
      (plan.revision !== input.planRevision || plan.approvedRevision !== plan.revision)
    ) {
      throw new DramaExecutionError(
        '计划已变化，请重新审核并确认当前版本',
        'DRAMA_PLAN_APPROVAL_REQUIRED',
      );
    }
    return plan;
  }

  async function patch(record, values, { expectedRevision } = {}) {
    return withLock(record.planId, async () => {
      const data = await read(record.planId, record.projectId);
      const current = data.attempts.find(
        (item) => item.assetId === record.assetId && item.attemptId === record.attemptId,
      );
      if (!current) throw new DramaExecutionError('制作执行记录缺失');
      // Recovery may have observed an older pending snapshot before the live launch
      // persisted a definitive result. A delayed query must return, not replace, it.
      if (expectedRevision !== undefined && (current.stateRevision || 0) !== expectedRevision)
        return clone(current);
      if (current.status === 'success' && values.status !== 'success') return clone(current);
      if (['failed', 'cancelled'].includes(current.status) && values.status === 'pending')
        return clone(current);
      Object.assign(current, values, {
        updatedAt: now(),
        stateRevision: (current.stateRevision || 1) + 1,
      });
      await write(data);
      return clone(current);
    });
  }

  async function prepareApp(route) {
    const operation = appLock
      .catch(() => undefined)
      .then(async () => {
        let app = (await runningHubLibraryService.listApps()).find(
          (item) => item.webAppId === route.webAppId && item.credentialRef === route.provider,
        );
        // createApp replaces existing definitions; call only when none exists, never overwrite user imports.
        if (!app)
          app = await runningHubLibraryService.createApp({
            webAppId: route.webAppId,
            credentialRef: route.provider,
          });
        const deployments = await configurationStore.listDeployments(app.definitionId);
        const deployment = deployments
          .filter(
            (item) =>
              item.runner === 'runninghub-webapp' &&
              item.connection?.remoteWebAppId === route.webAppId &&
              item.connection?.credentialRef === route.provider,
          )
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
        const bindings = (await configurationStore.listBindingSets(app.definitionId)).sort(
          (a, b) => b.revision - a.revision,
        )[0];
        if (!deployment || !bindings)
          throw new DramaExecutionError('官方工作流配置不完整', 'DRAMA_WORKFLOW_SCHEMA_CHANGED');
        const fields = Object.fromEntries(
          Object.entries(route.fields).map(([name, field]) => [name, bindField(bindings, field)]),
        );
        const images = (route.images || []).map((field) => ({
          ...field,
          bindingKey: bindField(bindings, field, 'image'),
        }));
        const audio = (route.audio || []).map((field) => ({
          ...field,
          bindingKey: bindField(bindings, field, 'audio'),
        }));
        if (
          route === OFFICIAL_DRAMA_BUNDLE.characters &&
          bindings.bindings.some((binding) => binding.control?.kind === 'asset')
        ) {
          throw new DramaExecutionError(
            '人物工作流新增了素材输入，需要重新确认',
            'DRAMA_WORKFLOW_SCHEMA_CHANGED',
          );
        }
        const blueprint = await workflowCanvasNodeService.createBlueprint(app.definitionId, {
          deploymentId: deployment.id,
          bindingSetId: bindings.id,
        });
        return { blueprint, fields, images, audio };
      });
    appLock = operation;
    return operation;
  }

  async function launch(record, context) {
    const key = `${record.planId}:${record.assetId}:${record.attemptId}`;
    inFlight.add(key);
    try {
      if (record.kind === 'scene')
        throw new DramaExecutionError('原场景线路已移除', 'DRAMA_MODEL_UNAVAILABLE', 400);
      else {
        const { blueprint, fields } = await prepareApp(OFFICIAL_DRAMA_BUNDLE.characters);
        await patch(record, { phase: 'submitting' });
        // Asset production is a receipt-producing execution, not a canvas workflow node run.
        // The existing workflow-test journal owns durable interrupted-task recovery; no
        // TestAttestation is issued here, and the later video canvas node remains a draft.
        const run = await testRunService.start({
          idempotencyKey: record.idempotencyKey,
          kind: 'workflow-test',
          definitionId: blueprint.workflowRef.definitionId,
          request: {
            deploymentId: blueprint.workflowRef.deploymentId,
            bindingSetId: blueprint.workflowRef.bindingSetId,
            projectId: record.projectId,
            values: {
              [fields.prompt]: record.snapshot.prompt,
              [fields.width]: record.width,
              [fields.height]: record.height,
            },
            confirmExecution: true,
            confirmPaidExecution: true,
          },
        });
        await patch(record, { runId: run.runId, phase: run.phase || 'running' });
      }
    } catch (error) {
      const code = String(error?.code || 'DRAMA_SUBMISSION_UNCERTAIN');
      // A lost response is not evidence that no remote task was created.
      const preflight = [
        'DRAMA_MODEL_UNAVAILABLE',
        'DRAMA_WORKFLOW_SCHEMA_CHANGED',
        'RUNNINGHUB_CREDENTIAL_MISSING',
        'MODEL_CONCURRENCY_LIMIT',
        'NODE_GENERATION_ACTIVE',
        'PROMPT_TOO_SHORT',
      ].includes(code);
      await patch(record, {
        status: preflight ? 'failed' : 'unknown',
        phase: preflight ? 'rejected' : 'submission-unknown',
        code: preflight ? code : 'DRAMA_SUBMISSION_UNCERTAIN',
        retryable: preflight,
        remoteMayContinue: !preflight,
        error: preflight
          ? '生成尚未提交，请检查模型配置或工作流字段后手动重试。'
          : '无法确认远端任务结果，系统不会自动重新提交。请先核对原任务。',
      }).catch(() => undefined);
    } finally {
      inFlight.delete(key);
    }
  }

  async function refresh(record) {
    if (TERMINAL.has(record.status) && record.status !== 'unknown') return record;
    const observedRevision = record.stateRevision || 0;
    let recoveredRunId;
    // Commit recovered identity and its observed task status together: an intermediate
    // identity write would advance our own revision and reject the final status update.
    const patchObserved = (values) =>
      patch(
        record,
        {
          ...(recoveredRunId ? { runId: recoveredRunId } : {}),
          ...values,
        },
        { expectedRevision: observedRevision },
      );
    let task;
    if (record.kind === 'character') {
      let runId = record.runId;
      if (!runId && runStore?.getIdempotency) {
        runId = (await runStore.getIdempotency(record.idempotencyKey).catch(() => null))?.runId;
      }
      if (runId) task = await testRunService.getRun(runId).catch(() => null);
      if (runId && runId !== record.runId) recoveredRunId = runId;
    } else {
      task = generationCoordinator.getTask(record.taskNodeId);
      if (task?.attemptId !== record.attemptId || task?.projectId !== record.projectId) task = null;
    }
    if (!task) {
      if (inFlight.has(`${record.planId}:${record.assetId}:${record.attemptId}`)) return record;
      return patchObserved({
        status: 'unknown',
        phase: 'recovery-unknown',
        code: 'DRAMA_RECOVERY_UNKNOWN',
        retryable: false,
        remoteMayContinue: true,
        error: '未能恢复原执行记录，已停止自动提交，避免重复付费。',
      });
    }
    if (task.status === 'success') {
      const outputs = checkedOutputs(task.receipt?.outputs || task.outputs, record.projectId);
      return patchObserved(
        outputs.length
          ? {
              status: 'success',
              phase: 'completed',
              outputs,
              retryable: false,
              remoteMayContinue: false,
            }
          : {
              status: 'unknown',
              phase: 'output-unavailable',
              code: 'DRAMA_OUTPUT_UNAVAILABLE',
              retryable: false,
              error: '远端已完成，但本机图像结果不可用；不会重新生成。',
            },
      );
    }
    if (TERMINAL.has(task.status)) {
      const uncertain =
        task.status === 'unknown' ||
        task.remoteMayContinue ||
        UNSURE_CODES.has(task.code) ||
        (record.kind === 'scene' &&
          ![
            'PROVIDER_BALANCE_INSUFFICIENT',
            'PROVIDER_TOKEN_QUOTA_INSUFFICIENT',
            'INVALID_GENERATION_REQUEST',
            'PROVIDER_AUTH_FAILED',
            'PROVIDER_CREDENTIAL_MISSING',
            'PROVIDER_RATE_LIMIT',
          ].includes(task.code));
      return patchObserved({
        status: uncertain ? 'unknown' : task.status,
        phase: uncertain ? 'recovery-unknown' : 'failed',
        code: uncertain ? 'DRAMA_RECOVERY_UNKNOWN' : 'DRAMA_GENERATION_FAILED',
        retryable: !uncertain,
        remoteMayContinue: Boolean(uncertain),
        error: uncertain
          ? '远端结果尚不明确，只能继续核对原任务，不能重提。'
          : '本次生成失败，可明确确认后重试该资产。',
      });
    }
    return patchObserved({ status: 'pending', phase: task.phase || 'running', retryable: false });
  }

  async function beginAsset(input, context = appContext) {
    if (input.confirmPaidExecution !== true || input.maxAssets !== 1) {
      throw new DramaExecutionError(
        '每次生成须明确确认一项资产的费用',
        'DRAMA_PAID_CONFIRMATION_REQUIRED',
      );
    }
    const plan = await requirePlan(input, true);
    id(input.assetId);
    id(input.attemptId);
    const asset = plan.assets.find((item) => item.id === input.assetId);
    if (!asset || !['character', 'scene'].includes(asset.kind))
      throw new DramaExecutionError('计划资产不存在');
    if (asset.kind === 'scene')
      throw new DramaExecutionError(
        '原场景线路已移除，请在画布选择第三方模型生成场景并手动连线',
        'DRAMA_MODEL_UNAVAILABLE',
        400,
      );
    if (
      !Number.isInteger(asset.width) ||
      !Number.isInteger(asset.height) ||
      asset.width < 64 ||
      asset.height < 64 ||
      asset.width > 4096 ||
      asset.height > 4096 ||
      typeof asset.prompt !== 'string' ||
      asset.prompt.trim().length < 5
    ) {
      throw new DramaExecutionError(
        '资产提示词或尺寸不完整，请先修改计划',
        'DRAMA_ASSET_INVALID',
        400,
      );
    }
    const fingerprint = digest({ asset, projectId: plan.projectId, planRevision: plan.revision });
    let created = false;
    const record = await withLock(plan.id, async () => {
      // Plan edits share this lock; check again after waiting, not just before admission.
      await requirePlan(input, true);
      const data = await read(plan.id, plan.projectId);
      const existing = data.attempts.find(
        (item) => item.assetId === asset.id && item.attemptId === input.attemptId,
      );
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new DramaExecutionError('同次尝试不能更换生成参数', 'DRAMA_ATTEMPT_CONFLICT');
        return existing;
      }
      const attempts = data.attempts.filter((item) => item.assetId === asset.id);
      const previous = attempts.at(-1);
      if (
        previous &&
        (!['failed', 'cancelled'].includes(previous.status) ||
          previous.remoteMayContinue ||
          input.retryOfAttemptId !== previous.attemptId)
      ) {
        throw new DramaExecutionError(
          '已有任务不可重提；失败重试须明确指定上一尝试',
          'DRAMA_RETRY_NOT_ALLOWED',
        );
      }
      if (attempts.length >= 10 || data.attempts.length >= 500)
        throw new DramaExecutionError('本计划重试次数已达上限');
      const current = {
        planId: plan.id,
        projectId: plan.projectId,
        planRevision: plan.revision,
        assetId: asset.id,
        attemptId: input.attemptId,
        attemptNumber: attempts.length + 1,
        taskNodeId: `drama-${digest([plan.id, asset.id, input.attemptId]).slice(0, 40)}`,
        idempotencyKey: uuidFrom([plan.id, asset.id, input.attemptId]),
        fingerprint,
        kind: asset.kind,
        name: asset.name,
        width: asset.width,
        height: asset.height,
        snapshot: clone(asset),
        status: 'pending',
        phase: 'reserved',
        stateRevision: 1,
        retryable: false,
        outputs: [],
        createdAt: now(),
        updatedAt: now(),
      };
      data.attempts.push(current);
      await write(data); // Persist before anything can create a paid task.
      created = true;
      return current;
    });
    if (created) void launch(record, context);
    return publicRecord(record);
  }

  async function getAsset(input) {
    await requirePlan(input);
    id(input.assetId);
    if (input.attemptId) id(input.attemptId);
    const data = await read(input.planId, input.projectId);
    const record = data.attempts
      .filter(
        (item) =>
          item.assetId === input.assetId &&
          (!input.attemptId || item.attemptId === input.attemptId),
      )
      .at(-1);
    return record ? publicRecord(await refresh(record)) : null;
  }

  async function getPlanExecution(input) {
    const plan = await requirePlan(input);
    const assets = [];
    for (const asset of plan.assets) {
      const record = await getAsset({ ...input, assetId: asset.id });
      if (record) assets.push(record);
    }
    return { planId: plan.id, projectId: plan.projectId, planRevision: plan.revision, assets };
  }

  async function compose(input) {
    const plan = await requirePlan(input, true);
    if (input.confirmAssets !== true)
      throw new DramaExecutionError('请先确认人物和场景资产', 'DRAMA_ASSET_CONFIRMATION_REQUIRED');
    const execution = await getPlanExecution(input);
    if (
      execution.assets.length !== plan.assets.length ||
      execution.assets.some(
        (asset) =>
          asset.status !== 'success' ||
          asset.planRevision !== plan.revision ||
          !asset.outputs.length,
      )
    )
      throw new DramaExecutionError(
        '当前计划仍有尚未完成的资产，不能创建文戏连线',
        'DRAMA_ASSETS_NOT_READY',
      );
    const assets = execution.assets.map((asset) => ({
      ...publicRecord(asset),
      ...asset.outputs[0],
    }));
    const byId = new Map(assets.map((asset) => [asset.assetId, asset]));
    const bundle = officialProductionBundle(plan.bundleId);
    const configuration = await prepareApp(bundle.drama);
    if (productionProfileForBundle(bundle.id)?.mode === 'assets') {
      const referenced = [...assets].sort(
        (a, b) => Number(a.kind === 'scene') - Number(b.kind === 'scene'),
      );
      if (referenced.length > configuration.images.length)
        throw new DramaExecutionError('武戏资产超过六个图片输入槽，请拆分制作范围');
      const blueprint = clone(configuration.blueprint);
      blueprint.title = `打斗武戏 · ${plan.title}`;
      const prompt = `${plan.script.text}\n\n参考图片对应关系：\n${referenced.map((asset, index) => `image${index + 1}：${asset.kind === 'character' ? '人物' : '场景'}「${asset.name}」`).join('\n')}`;
      return {
        planId: plan.id,
        projectId: plan.projectId,
        planRevision: plan.revision,
        assets,
        segments: [
          {
            segmentId: 'ASSETS',
            title: blueprint.title,
            blueprint,
            // No dialogue compiler, duration injection or changes to RH defaults.
            values: { ...blueprint.parameterValues, [configuration.fields.prompt]: prompt },
            inputBindings: referenced.map((asset, index) => ({
              bindingKey: configuration.images[index].bindingKey,
              assetId: asset.assetId,
              attemptId: asset.attemptId,
              mediaId: asset.mediaId,
              picture: index + 1,
              mediaKind: 'image',
            })),
          },
        ],
      };
    }
    const segments = plan.segments.map((segment) => {
      const referenced = [...new Set([...segment.characterIds, segment.sceneId])].map((assetId) => {
        const asset = byId.get(assetId);
        if (!asset)
          throw new DramaExecutionError('文戏引用的资产不存在', 'DRAMA_ASSET_REFERENCE_INVALID');
        return asset;
      });
      const compiled = compileSegment(plan, segment.id, {
        images: referenced.map((asset) => ({ assetId: asset.assetId, mediaId: asset.mediaId })),
        audio: [],
      });
      const blueprint = clone(configuration.blueprint);
      blueprint.title = segment.title;
      const values = {
        ...blueprint.parameterValues,
        [configuration.fields.prompt]: compiled.prompt,
        [configuration.fields.duration]: segment.duration,
      };
      const inputBindings = referenced.map((asset, index) => {
        if (!configuration.images[index])
          throw new DramaExecutionError('文戏图片数量超过六个输入槽');
        const bindingKey = configuration.images[index].bindingKey;
        return {
          bindingKey,
          assetId: asset.assetId,
          attemptId: asset.attemptId,
          mediaId: asset.mediaId,
          picture: index + 1,
          mediaKind: 'image',
        };
      });
      return { segmentId: segment.id, title: segment.title, blueprint, values, inputBindings };
    });
    return {
      planId: plan.id,
      projectId: plan.projectId,
      planRevision: plan.revision,
      assets,
      segments,
    };
  }

  async function withEditablePlan(input, action) {
    await requirePlan(input);
    return withLock(input.planId, async () => {
      const data = await read(input.planId, input.projectId);
      if (data.attempts.length) {
        throw new DramaExecutionError(
          '资产生成已开始，当前计划不能再修改；请创建新计划',
          'DRAMA_PLAN_EXECUTION_LOCKED',
        );
      }
      return action();
    });
  }

  return Object.freeze({ beginAsset, getAsset, getPlanExecution, compose, withEditablePlan });
}
