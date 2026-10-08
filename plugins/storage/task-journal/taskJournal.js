import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ERRORS, PluginError } from '../../../modules/contracts/index.js';

const ACTIVE_STATUSES = new Set(['loading', 'queued']);

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : null;
}

function atomicWriteJournal(filePath, records) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${crypto.randomUUID()}`;
  try {
    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify({ version: 1, tasks: records }, null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx' },
    );
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

export class GenerationTaskJournal {
  constructor({ filePath, now = () => Date.now(), maxEntries = 1_000 }) {
    if (!filePath) throw new PluginError(ERRORS.invalidConfiguration, 'GenerationTaskJournal requires filePath', { context: { moduleId: 'storage.task-journal' } });
    this.filePath = filePath;
    this.now = now;
    this.maxEntries = Math.max(1, Number(maxEntries) || 1_000);
    this.tasks = new Map();
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) return;
    let records;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      records = parsed?.version === 1 ? parsed.tasks : null;
      if (!Array.isArray(records)) throw new PluginError(ERRORS.invalidConfiguration, 'Invalid generation task journal shape', {
        context: { moduleId: 'storage.task-journal', operation: 'load', filePath: this.filePath }
      });
    } catch (cause) {
      if (!(cause instanceof SyntaxError) && !(cause instanceof PluginError)) throw cause;
      fs.renameSync(this.filePath, `${this.filePath}.corrupt-${this.now()}`);
      return;
    }
    for (const record of records) {
      if (record?.nodeId) this.tasks.set(String(record.nodeId), clone(record));
    }
    // A failed recovery write must not quarantine an otherwise valid journal.
    if (this.recoverInterruptedTasks()) this.flush();
  }

  recoverInterruptedTasks() {
    let changed = false;
    const currentTime = this.now();
    const timestamp = new Date(currentTime).toISOString();
    for (const task of this.tasks.values()) {
      if (!ACTIVE_STATUSES.has(task.status)) continue;
      if (task.phase === 'observation-paused') continue;
      if (task.kind === 'workflow-test') {
        Object.assign(task, {
          status: 'loading',
          interruptedPhase: task.interruptedPhase || task.phase,
          phase: 'recovering',
          retryable: false,
          updatedAt: timestamp,
        });
        changed = true;
        continue;
      }
      const startedAt = Date.parse(task.createdAt || task.updatedAt);
      Object.assign(task, {
        status: 'unknown',
        code: 'GENERATION_INTERRUPTED',
        diagnosticCode: 'GENERATION_INTERRUPTED',
        error: '生成服务曾中断，结果与费用尚未确认。请先核对服务商任务记录，避免重复生成。',
        retryable: false,
        durationMs: Number.isFinite(startedAt) ? Math.max(0, currentTime - startedAt) : 0,
        updatedAt: timestamp,
        finishedAt: timestamp,
      });
      changed = true;
    }
    return changed;
  }

  flush(records = this.tasks) {
    const ordered = Array.from(records.values())
      .sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')));
    const active = ordered.filter((task) => ACTIVE_STATUSES.has(task.status));
    const terminalBudget = Math.max(0, this.maxEntries - active.length);
    const tasks = [
      ...active,
      ...(terminalBudget ? ordered.filter((task) => !ACTIVE_STATUSES.has(task.status)).slice(-terminalBudget) : []),
    ];
    try { atomicWriteJournal(this.filePath, tasks); }
    catch (cause) {
      throw new PluginError(ERRORS.taskPersistence, '生成任务日志写入失败。', {
        context: { moduleId: 'storage.task-journal', operation: 'flush' }, cause,
      });
    }
  }

  upsert(task) {
    if (!task?.nodeId) throw new PluginError(ERRORS.invalidConfiguration, 'Generation task requires nodeId', { context: { moduleId: 'storage.task-journal' } });
    const next = new Map(this.tasks);
    next.set(String(task.nodeId), clone(task));
    this.flush(next);
    this.tasks = next;
    return this.get(task.nodeId);
  }

  get(nodeId) {
    return clone(this.tasks.get(String(nodeId)));
  }

  list() {
    return Array.from(this.tasks.values(), clone);
  }
}
