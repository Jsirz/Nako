import crypto from 'node:crypto';
import { ERRORS, PluginError } from '../../../contracts/errors.js';
import { GENERATION_ADMISSION_CODES } from '../../../contracts/generationAdmission.js';

const TERMINAL_STATUSES = new Set(['success', 'failed', 'cancelled', 'unknown']);

export class GenerationAdmission {
  constructor(coordinator) {
    this.coordinator = coordinator;
  }

  begin({
    nodeId,
    attemptId,
    kind,
    modelName,
    modelIdKey,
    maxConcurrent = 1,
    timeEstimate = '5min',
    generateCount = 1,
    metadata = {},
    leaseHeartbeatMs,
    absoluteTimeoutMs,
  }) {
    const coordinator = this.coordinator;
    const taskId = String(nodeId || `generation-${coordinator.now()}-${coordinator.leaseSeed + 1}`);
    const concurrency = coordinator.getConcurrency(modelIdKey, maxConcurrent);
    const nextAttemptId = String(attemptId || crypto.randomUUID());
    let existing;
    try {
      existing = coordinator.getTask(taskId);
    } catch (cause) {
      throw new PluginError(ERRORS.taskPersistence, '无法读取生成任务记录，未准入本次请求。', {
        status: 503,
        context: { moduleId: 'generation-core', nodeId: taskId, attemptId: nextAttemptId },
        cause,
      });
    }
    const admittedAttemptIds = new Set(existing?.admittedAttemptIds || []);
    if (existing?.attemptId) admittedAttemptIds.add(existing.attemptId);
    if (admittedAttemptIds.has(nextAttemptId)) {
      return {
        ok: false,
        code: GENERATION_ADMISSION_CODES.duplicateAttempt,
        status: 409,
        retryable: false,
        message: '该生成尝试已准入，不会重复提交。请查询原任务；主动重试须使用新的 generationAttemptId。',
        nodeId: taskId,
        attemptId: nextAttemptId,
        inFlight: concurrency.inFlight,
        maxConcurrent: concurrency.maxConcurrent,
      };
    }
    if (existing && !TERMINAL_STATUSES.has(existing.status)) {
      return {
        ok: false,
        code: GENERATION_ADMISSION_CODES.nodeActive,
        inFlight: concurrency.inFlight,
        maxConcurrent: concurrency.maxConcurrent,
      };
    }
    if (concurrency.blocked) {
      return {
        ok: false,
        code: GENERATION_ADMISSION_CODES.modelConcurrency,
        inFlight: concurrency.inFlight,
        maxConcurrent: concurrency.maxConcurrent,
      };
    }
    return this.commitAdmission({
      taskId, nextAttemptId, kind, modelName, modelIdKey, timeEstimate, generateCount,
      metadata, leaseHeartbeatMs, absoluteTimeoutMs, admittedAttemptIds, concurrency,
    });
  }

  commitAdmission({
    taskId, nextAttemptId, kind, modelName, modelIdKey, timeEstimate, generateCount,
    metadata, leaseHeartbeatMs, absoluteTimeoutMs, admittedAttemptIds, concurrency,
  }) {
    const coordinator = this.coordinator;
    const inFlight = concurrency.inFlight + 1;
    const leaseId = coordinator.nextLeaseId(taskId);
    const estimatedMs = Math.max(0, Number(coordinator.parseTimeToMs(timeEstimate)) || 0);
    const ttlMs = Math.max(
      coordinator.minimumLeaseTtlMs,
      estimatedMs * Math.max(1, Number(generateCount) || 1) + coordinator.leaseSafetyMarginMs,
    );
    const heartbeatMs = Number.isFinite(Number(leaseHeartbeatMs))
      ? Math.max(1_000, Number(leaseHeartbeatMs)) : ttlMs;
    const absoluteTtlMs = Number.isFinite(Number(absoluteTimeoutMs))
      ? Math.max(ttlMs, Number(absoluteTimeoutMs)) : ttlMs;
    const controller = new AbortController();
    const startedAtMs = coordinator.now();
    const timestamp = new Date(startedAtMs).toISOString();
    const task = {
      ...structuredClone(metadata),
      nodeId: taskId,
      attemptId: nextAttemptId,
      admittedAttemptIds: [...admittedAttemptIds, nextAttemptId],
      kind,
      modelName,
      modelIdKey,
      maxConcurrent: concurrency.maxConcurrent,
      leaseId,
      status: 'loading',
      retryable: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      absoluteDeadlineAt: new Date(startedAtMs + absoluteTtlMs).toISOString(),
    };
    coordinator.persist(task);
    const timer = coordinator.setTimer(
      () => coordinator.expire(leaseId), Math.min(heartbeatMs, absoluteTtlMs),
    );
    coordinator.leases.set(leaseId, {
      leaseId,
      attemptId: task.attemptId,
      nodeId: taskId,
      modelIdKey,
      timer,
      released: false,
      heartbeatMs,
      absoluteDeadlineMs: startedAtMs + absoluteTtlMs,
    });
    coordinator.tasks.set(taskId, task);
    coordinator.controllers.set(taskId, controller);
    coordinator.inFlightByModelId.set(modelIdKey, inFlight);
    return {
      ok: true,
      leaseId,
      attemptId: task.attemptId,
      nodeId: taskId,
      signal: controller.signal,
      inFlight,
      maxConcurrent: concurrency.maxConcurrent,
      ttlMs,
      absoluteTtlMs,
    };
  }

  adopt(taskRecord, { leaseHeartbeatMs = 30_000, absoluteDeadlineMs } = {}) {
    const coordinator = this.coordinator;
    const nodeId = String(taskRecord?.nodeId || '');
    if (!nodeId || taskRecord?.status !== 'loading' || TERMINAL_STATUSES.has(taskRecord?.status))
      return { ok: false, code: 'GENERATION_RECOVERY_NOT_ACTIVE' };
    if (coordinator.tasks.has(nodeId)) {
      const existing = coordinator.tasks.get(nodeId);
      return {
        ok: true,
        nodeId,
        leaseId: existing.leaseId,
        signal: coordinator.controllers.get(nodeId)?.signal,
        recovered: false,
      };
    }
    const modelIdKey = String(taskRecord.modelIdKey || 'comfy:recovered');
    const timestampMs = coordinator.now();
    const persistedDeadline = Date.parse(taskRecord.absoluteDeadlineAt || '');
    const fallbackDeadline = timestampMs + Math.max(1_000, Number(absoluteDeadlineMs) || 30 * 60_000);
    const absoluteDeadline = Number.isFinite(persistedDeadline) ? persistedDeadline : fallbackDeadline;
    if (absoluteDeadline <= timestampMs) return this.expireRecovery(taskRecord, nodeId, timestampMs);
    const leaseId = coordinator.nextLeaseId(nodeId, timestampMs);
    const controller = new AbortController();
    const heartbeatMs = Math.max(1_000, Number(leaseHeartbeatMs) || 30_000);
    const task = {
      ...taskRecord,
      leaseId,
      phase: 'recovering',
      updatedAt: new Date(timestampMs).toISOString(),
      absoluteDeadlineAt: new Date(absoluteDeadline).toISOString(),
    };
    coordinator.persist(task);
    const timer = coordinator.setTimer(
      () => coordinator.expire(leaseId), Math.min(heartbeatMs, absoluteDeadline - timestampMs),
    );
    coordinator.leases.set(leaseId, {
      leaseId,
      nodeId,
      modelIdKey,
      timer,
      released: false,
      heartbeatMs,
      absoluteDeadlineMs: absoluteDeadline,
    });
    coordinator.tasks.set(nodeId, task);
    coordinator.controllers.set(nodeId, controller);
    coordinator.inFlightByModelId.set(
      modelIdKey, Number(coordinator.inFlightByModelId.get(modelIdKey) || 0) + 1,
    );
    return {
      ok: true,
      nodeId,
      leaseId,
      signal: controller.signal,
      recovered: true,
      absoluteDeadlineMs: absoluteDeadline,
    };
  }

  expireRecovery(taskRecord, nodeId, timestampMs) {
    const coordinator = this.coordinator;
    const expired = {
      ...taskRecord,
      status: 'failed',
      phase: 'recovery-expired',
      code: 'WORKFLOW_RUN_TIMEOUT',
      diagnosticCode: 'WORKFLOW_RUN_TIMEOUT',
      error: '工作流测试在服务重启期间超过最长执行时间。',
      retryable: true,
      remoteMayContinue: Boolean(taskRecord.promptId),
      updatedAt: new Date(timestampMs).toISOString(),
      finishedAt: new Date(timestampMs).toISOString(),
    };
    coordinator.persist(expired);
    coordinator.tasks.set(nodeId, expired);
    return { ok: false, code: 'GENERATION_RECOVERY_EXPIRED', task: cloneTask(expired) };
  }
}

function cloneTask(task) {
  return task ? structuredClone(task) : null;
}
