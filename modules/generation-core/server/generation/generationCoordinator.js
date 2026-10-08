import crypto from 'node:crypto';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { GenerationAdmission } from './generationAdmission.js';
import {
  canRecoverGenerationTask,
  isRecoverableProvider,
  sanitizeRemoteTaskReference,
} from './generationTaskRecovery.js';

const TERMINAL_STATUSES = new Set(['success', 'failed', 'cancelled', 'unknown']);

function cloneTask(task) {
  return task ? structuredClone(task) : null;
}

function normalizeLimit(value) {
  if (value === 0) return 0; // Explicitly unlimited local admission; provider limits still apply.
  return Math.max(1, Number(value) || 1);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function createSchedulerCommitProof({ runId, receiptPayloadHash, finishedAt }) {
  const payload = {
    runId,
    status: 'success',
    receiptPayloadHash,
    finishedAt,
  };
  return {
    ...payload,
    commitHash: sha256(JSON.stringify(payload)),
  };
}

class GenerationCoordinator {
  constructor({
    parseTimeToMs = () => 15 * 60 * 1_000,
    now = () => Date.now(),
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    minimumLeaseTtlMs = 180_000,
    leaseSafetyMarginMs = 120_000,
    taskStore = null,
  } = {}) {
    Object.assign(this, { parseTimeToMs, now, setTimer, clearTimer,
      minimumLeaseTtlMs, leaseSafetyMarginMs, taskStore });
    this.inFlightByModelId = new Map();
    this.leases = new Map();
    this.tasks = new Map();
    this.controllers = new Map();
    this.leaseSeed = 0;
    for (const name of Object.getOwnPropertyNames(GenerationCoordinator.prototype)) {
      if (name !== 'constructor') this[name] = this[name].bind(this);
    }
    this.admission = new GenerationAdmission(this);
  }

  persist(task) {
    try { this.taskStore?.upsert?.(cloneTask(task)); }
    catch (cause) {
      throw new PluginError(ERRORS.taskPersistence, '生成任务状态保存失败，未发布本次状态。', {
        context: { moduleId: 'generation-core', nodeId: task.nodeId, attemptId: task.attemptId }, cause,
      });
    }
  }
  getConcurrency(modelIdKey, maxConcurrent = 1) {
    const { inFlightByModelId } = this;
    const limit = normalizeLimit(maxConcurrent);
    const inFlight = Number(inFlightByModelId.get(modelIdKey) || 0);
    return {
      inFlight,
      maxConcurrent: limit,
      available: limit === 0 ? null : Math.max(0, limit - inFlight),
      blocked: limit > 0 && inFlight >= limit,
    };
  }

  release(leaseId) {
    const { leases, clearTimer, inFlightByModelId } = this;
    if (!leaseId) return false;
    const lease = leases.get(leaseId);
    if (!lease || lease.released) return false;

    lease.released = true;
    clearTimer(lease.timer);
    const current = Number(inFlightByModelId.get(lease.modelIdKey) || 0);
    const next = Math.max(0, current - 1);
    if (next === 0) inFlightByModelId.delete(lease.modelIdKey);
    else inFlightByModelId.set(lease.modelIdKey, next);
    leases.delete(leaseId);
    return true;
  }

  transition(nodeId, status, details = {}, timestampMs = this.now(), expectedAttemptId) {
    const { tasks, controllers, persist, release } = this;
    const task = tasks.get(nodeId);
    if (
      !task ||
      TERMINAL_STATUSES.has(task.status) ||
      (expectedAttemptId && task.attemptId !== expectedAttemptId)
    )
      return false;

    const next = { ...task, ...structuredClone(details), status, updatedAt: new Date(timestampMs).toISOString() };
    if (TERMINAL_STATUSES.has(status)) {
      next.finishedAt = next.updatedAt;
      const startedAtMs = Date.parse(next.createdAt);
      next.durationMs = Number.isFinite(startedAtMs) ? Math.max(0, timestampMs - startedAtMs) : 0;
      next.diagnosticCode = details.code || (status === 'success' ? 'GENERATION_SUCCEEDED'
        : status === 'cancelled' ? 'GENERATION_CANCELLED' : status === 'unknown' ? 'WORKFLOW_RUN_UNKNOWN' : 'GENERATION_FAILED');
    }
    persist(next);
    tasks.set(nodeId, next);
    if (TERMINAL_STATUSES.has(status)) {
      release(task.leaseId);
      controllers.delete(nodeId);
    }
    return cloneTask(next);
  }

  expire(leaseId) {
    const { leases, tasks, controllers, finalizeUnknown, transition, release } = this;
    const lease = leases.get(leaseId);
    if (!lease) return;
    const task = tasks.get(lease.nodeId);
    if (task && !TERMINAL_STATUSES.has(task.status)) {
      if (task.remoteTask || task.remoteSubmissionStarted) {
        controllers.get(task.nodeId)?.abort();
        finalizeUnknown(
          task.nodeId,
          {
            code: task.remoteTask
              ? 'GENERATION_OBSERVATION_INTERRUPTED'
              : 'GENERATION_SUBMISSION_UNKNOWN',
            error: '原任务仍可能在服务商运行，请先核对任务记录，避免重复生成。',
          },
          task.attemptId,
        );
        return;
      }
      transition(lease.nodeId, 'failed', {
        code: 'GENERATION_LEASE_EXPIRED',
        error: '生成任务超过最长执行时间，可重试。',
        retryable: true,
      });
      return;
    }
    release(leaseId);
  }

  begin(request) {
    return this.admission.begin(request);
  }

  adopt(taskRecord, options) {
    return this.admission.adopt(taskRecord, options);
  }

  nextLeaseId(nodeId, timestampMs = this.now()) {
    return `lease_${timestampMs}_${++this.leaseSeed}_${nodeId}`;
  }

  update(nodeId, details = {}, expectedAttemptId) {
    const { tasks, transition, now } = this;
    const task = tasks.get(nodeId);
    if (!task || TERMINAL_STATUSES.has(task.status)) return false;
    return transition(nodeId, task.status, details, now(), expectedAttemptId);
  }

  pauseObservation(nodeId, details = {}) {
    const { tasks, now, persist, release, controllers } = this;
    const task = tasks.get(nodeId);
    if (!task || TERMINAL_STATUSES.has(task.status)) return false;
    const timestamp = new Date(now()).toISOString();
    const next = { ...task, ...structuredClone(details), status: 'loading', phase: 'observation-paused',
      updatedAt: timestamp, observationPausedAt: details.observationPausedAt || timestamp };
    delete next.leaseId;
    persist(next);
    tasks.set(nodeId, next);
    release(task.leaseId);
    controllers.delete(nodeId);
    return cloneTask(next);
  }

  reacquireObservation(
    nodeId,
    { leaseHeartbeatMs = 30_000, absoluteTimeoutMs = 30 * 60_000 } = {},
  ) {
    const { tasks, taskStore, getConcurrency, now, persist, setTimer, expire,
      leases, inFlightByModelId, controllers } = this;
    const persisted = tasks.get(nodeId) || taskStore?.get?.(nodeId);
    if (!persisted || persisted.status !== 'loading' || persisted.phase !== 'observation-paused') {
      return { ok: false, code: 'WORKFLOW_OBSERVATION_NOT_PAUSED' };
    }
    const task = persisted;
    const concurrency = getConcurrency(task.modelIdKey, task.maxConcurrent ?? 1);
    if (concurrency.blocked) {
      return { ok: false, code: 'MODEL_CONCURRENCY_LIMIT' };
    }
    const timestampMs = now();
    const heartbeatMs = Math.max(1_000, Number(leaseHeartbeatMs) || 30_000);
    const absoluteTtlMs = Math.max(heartbeatMs, Number(absoluteTimeoutMs) || 30 * 60_000);
    const leaseId = this.nextLeaseId(nodeId, timestampMs);
    const controller = new AbortController();
    const next = { ...task, leaseId, phase: 'observation-resuming', code: undefined, error: undefined,
      retryable: false, updatedAt: new Date(timestampMs).toISOString(),
      observationResumedAt: new Date(timestampMs).toISOString(),
      absoluteDeadlineAt: new Date(timestampMs + absoluteTtlMs).toISOString() };
    persist(next);
    const timer = setTimer(() => expire(leaseId), Math.min(heartbeatMs, absoluteTtlMs));
    leases.set(leaseId, { leaseId, nodeId, modelIdKey: task.modelIdKey, timer, released: false,
      heartbeatMs, absoluteDeadlineMs: timestampMs + absoluteTtlMs });
    inFlightByModelId.set(task.modelIdKey, concurrency.inFlight + 1);
    controllers.set(nodeId, controller);
    tasks.set(nodeId, next);
    return { ok: true, nodeId, leaseId, signal: controller.signal, task: cloneTask(next),
    };
  }

  heartbeat(nodeId) {
    const { tasks, leases, now, expire, persist, clearTimer, setTimer } = this;
    const task = tasks.get(nodeId);
    const lease = task ? leases.get(task.leaseId) : null;
    if (!task || !lease || TERMINAL_STATUSES.has(task.status)) return false;
    const timestampMs = now();
    const remainingMs = lease.absoluteDeadlineMs - timestampMs;
    if (remainingMs <= 0) {
      expire(lease.leaseId);
      return false;
    }
    const updatedAt = new Date(timestampMs).toISOString();
    const next = { ...task, updatedAt, lastHeartbeatAt: updatedAt };
    persist(next);
    tasks.set(nodeId, next);
    clearTimer(lease.timer);
    lease.timer = setTimer(() => expire(lease.leaseId), Math.min(lease.heartbeatMs, remainingMs));
    return cloneTask(next);
  }

  complete(nodeId, result = {}, expectedAttemptId) {
    const { transition, now } = this;
    return transition(
      nodeId,
      'success',
      {
        ...result,
        code: undefined,
        error: undefined,
        retryable: false,
      },
      now(),
      expectedAttemptId,
    );
  }

  completeIfActive(nodeId, receiptPayloadHash, pendingReceiptId) {
    const { tasks, controllers, now, transition } = this;
    if (!/^[a-f\d]{64}$/i.test(String(receiptPayloadHash || ''))) return false;
    if (!String(pendingReceiptId || '').trim()) return false;
    const task = tasks.get(nodeId);
    if (!task || TERMINAL_STATUSES.has(task.status) || controllers.get(nodeId)?.signal.aborted) {
      return false;
    }
    const timestampMs = now();
    const finishedAt = new Date(timestampMs).toISOString();
    const schedulerCommitProof = createSchedulerCommitProof({
      runId: nodeId,
      receiptPayloadHash,
      finishedAt,
    });
    return transition(
      nodeId,
      'success',
      {
        receiptPayloadHash,
        pendingReceiptId,
        schedulerCommitProof,
        code: undefined,
        error: undefined,
        retryable: false,
        remoteMayContinue: false,
        remoteCancelConfirmed: true,
      },
      timestampMs,
    );
  }

  fail(nodeId, details = {}, expectedAttemptId) {
    const { transition, now } = this;
    return transition(
      nodeId,
      'failed',
      {
        code: details.code || 'GENERATION_FAILED',
        error: details.error || '生成失败，请重试。',
        retryable: Boolean(details.retryable),
        ...details,
      },
      now(),
      expectedAttemptId,
    );
  }

  cancel(nodeId) {
    const { tasks, controllers, transition } = this;
    const task = tasks.get(nodeId);
    if (!task || TERMINAL_STATUSES.has(task.status)) {
      return { ok: false, code: 'GENERATION_NOT_ACTIVE', task: cloneTask(task) };
    }
    controllers.get(nodeId)?.abort();
    const cancelled = transition(nodeId, 'cancelled', {
      code: 'GENERATION_CANCELLED',
      error: '生成任务已取消。',
      retryable: true,
    });
    return { ok: true, task: cancelled };
  }

  requestCancel(nodeId, details = {}) {
    const { tasks, controllers, update, now } = this;
    const task = tasks.get(nodeId);
    if (!task || TERMINAL_STATUSES.has(task.status)) {
      return { ok: false, code: 'GENERATION_NOT_ACTIVE', task: cloneTask(task) };
    }
    controllers.get(nodeId)?.abort();
    const cancelling = update(nodeId, {
      phase: 'cancelling',
      cancellationRequestedAt: new Date(now()).toISOString(),
      remoteMayContinue: true,
      ...details,
    });
    return { ok: true, task: cancelling };
  }

  finalizeCancel(nodeId, details = {}) {
    const { transition, getTask } = this;
    const cancelled = transition(nodeId, 'cancelled', {
      code: 'WORKFLOW_RUN_CANCELLED',
      error: '工作流测试已取消。',
      retryable: false,
      ...details,
    });
    return cancelled
      ? { ok: true, task: cancelled }
      : { ok: false, code: 'GENERATION_NOT_ACTIVE', task: getTask(nodeId) };
  }

  finalizeUnknown(nodeId, details = {}, expectedAttemptId) {
    const { transition, now } = this;
    return transition(
      nodeId,
      'unknown',
      {
        code: 'COMFYUI_SUBMISSION_UNKNOWN',
        error: '无法确认工作流是否已提交，系统不会自动重提。',
        retryable: false,
        remoteMayContinue: true,
        ...details,
      },
      now(),
      expectedAttemptId,
    );
  }

  reconcileRemoteTask(nodeId, expectedAttemptId, status, details = {}) {
    const { getTask, now, persist, tasks } = this;
    const task = getTask(nodeId);
    if (
      !expectedAttemptId ||
      task?.attemptId !== expectedAttemptId ||
      !canRecoverGenerationTask(task) ||
      !['success', 'failed', 'partial'].includes(status)
    )
      return false;
    const timestamp = new Date(now()).toISOString();
    const reconciled = {
      ...task,
      ...structuredClone(details),
      status: status === 'partial' ? 'unknown' : status,
      retryable: false,
      remoteMayContinue: false,
      code: status === 'success' ? undefined : details.code,
      error: status === 'success' ? undefined : details.error,
      diagnosticCode: status === 'success' ? 'GENERATION_RECOVERED' : details.code,
      updatedAt: timestamp,
      finishedAt: timestamp,
      durationMs: Math.max(0, now() - Date.parse(task.createdAt)),
    };
    persist(reconciled);
    tasks.set(nodeId, reconciled);
    return cloneTask(reconciled);
  }

  recordRemoteTask(nodeId, expectedAttemptId, reference, slot = 0) {
    const { getTask, update, now, persist, tasks } = this;
    const task = getTask(nodeId);
    const remoteTask = sanitizeRemoteTaskReference(reference);
    if (
      !expectedAttemptId ||
      task?.attemptId !== expectedAttemptId ||
      !remoteTask ||
      !isRecoverableProvider(task.kind, task.providerName) ||
      task.providerName !== remoteTask.providerName
    )
      return false;
    let recordedReference = { remoteTask };
    if (task.kind === 'image') {
      if (
        !Number.isInteger(slot) ||
        slot < 0 ||
        slot >= task.requestedCount ||
        slot >= task.remoteSubmissionCount
      )
        return false;
      const references = [...(task.remoteTasks || [])];
      if (references[slot] && JSON.stringify(references[slot]) !== JSON.stringify(remoteTask))
        return false;
      references[slot] = remoteTask;
      recordedReference = { remoteTasks: references };
    }
    if (task.status === 'loading') return update(nodeId, recordedReference, expectedAttemptId);
    if (
      task.status !== 'unknown' ||
      ![
        'GENERATION_SUBMISSION_UNKNOWN',
        'GENERATION_OBSERVATION_INTERRUPTED',
        'GENERATION_INTERRUPTED',
      ].includes(task.code)
    )
      return false;
    const recorded = {
      ...task,
      ...recordedReference,
      code: 'GENERATION_OBSERVATION_INTERRUPTED',
      diagnosticCode: 'GENERATION_OBSERVATION_INTERRUPTED',
      retryable: false,
      updatedAt: new Date(now()).toISOString(),
    };
    persist(recorded);
    tasks.set(nodeId, recorded);
    return cloneTask(recorded);
  }

  getTask(nodeId) {
    return cloneTask(this.tasks.get(nodeId) || this.taskStore?.get?.(nodeId));
  }

  isActive(nodeId) {
    const { tasks, controllers, leases } = this;
    const task = tasks.get(nodeId);
    const controller = task ? controllers.get(nodeId) : null;
    return (
      task?.status === 'loading' &&
      Boolean(task.leaseId && leases.has(task.leaseId) && controller && !controller.signal.aborted)
    );
  }

  dispose() {
    const { leases, clearTimer, inFlightByModelId, controllers } = this;
    for (const lease of leases.values()) clearTimer(lease.timer);
    leases.clear();
    inFlightByModelId.clear();
    controllers.clear();
  }

}

export function createGenerationCoordinator(options) {
  const coordinator = new GenerationCoordinator(options);
  return {
    adopt: coordinator.adopt,
    begin: coordinator.begin,
    cancel: coordinator.cancel,
    complete: coordinator.complete,
    completeIfActive: coordinator.completeIfActive,
    dispose: coordinator.dispose,
    fail: coordinator.fail,
    finalizeCancel: coordinator.finalizeCancel,
    finalizeUnknown: coordinator.finalizeUnknown,
    getConcurrency: coordinator.getConcurrency,
    getTask: coordinator.getTask,
    heartbeat: coordinator.heartbeat,
    isActive: coordinator.isActive,
    pauseObservation: coordinator.pauseObservation,
    reacquireObservation: coordinator.reacquireObservation,
    reconcileRemoteTask: coordinator.reconcileRemoteTask,
    recordRemoteTask: coordinator.recordRemoteTask,
    release: coordinator.release,
    requestCancel: coordinator.requestCancel,
    update: coordinator.update,
  };
}
