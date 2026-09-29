import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
    if (!filePath) throw new Error('GenerationTaskJournal requires filePath');
    this.filePath = filePath;
    this.now = now;
    this.maxEntries = Math.max(1, Number(maxEntries) || 1_000);
    this.tasks = new Map();
    this.load();
  }

  load() {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      const records = parsed?.version === 1 ? parsed.tasks : null;
      if (!Array.isArray(records)) throw new Error('Invalid generation task journal shape');

      for (const record of records) {
        if (record?.nodeId) this.tasks.set(String(record.nodeId), clone(record));
      }
      if (this.recoverInterruptedTasks()) this.flush();
    } catch {
      const quarantinePath = `${this.filePath}.corrupt-${this.now()}`;
      fs.renameSync(this.filePath, quarantinePath);
      this.tasks.clear();
    }
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

  flush() {
    const ordered = Array.from(this.tasks.values())
      .sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')));
    const active = ordered.filter((task) => ACTIVE_STATUSES.has(task.status));
    const terminalBudget = Math.max(0, this.maxEntries - active.length);
    const tasks = [
      ...active,
      ...ordered.filter((task) => !ACTIVE_STATUSES.has(task.status)).slice(-terminalBudget),
    ];
    atomicWriteJournal(this.filePath, tasks);
  }

  upsert(task) {
    if (!task?.nodeId) throw new Error('Generation task requires nodeId');
    this.tasks.set(String(task.nodeId), clone(task));
    this.flush();
    return this.get(task.nodeId);
  }

  get(nodeId) {
    return clone(this.tasks.get(String(nodeId)));
  }

  list() {
    return Array.from(this.tasks.values(), clone);
  }
}
