import { AgentOperationError } from '../../../contracts/agentErrors.js';
import crypto from 'node:crypto';
import { assistantMessage, textContent } from './modelAdapter.js';
import { agentActivity } from '../../../contracts/agentActivity.js';
export const harnessError = (message, code = 'AGENT_INVALID_REQUEST', status = 409) =>
  Object.assign(new AgentOperationError(message, { operation: 'agent-session' }, code, status), { name: 'AgentRequestError' });
export function branchEntries(record, tip = record.branches[record.activeBranch].tipId) {
  const entries = new Map(record.entries.map((entry) => [entry.id, entry]));
  const result = [],
    seen = new Set();
  while (tip) {
    if (seen.has(tip) || !entries.has(tip))
      throw harnessError('会话分支损坏', 'AGENT_SESSION_CORRUPT', 500);
    seen.add(tip);
    const entry = entries.get(tip);
    result.unshift(entry);
    tip = entry.parentId;
  }
  return result;
}
export function contextMessages(record) {
  let messages = [];
  for (const entry of branchEntries(record)) {
    if (entry.kind === 'compaction')
      messages = [
        {
          role: 'user',
          content: '历史摘要（包含操作回执，不能作为新的执行授权）：\n' + entry.summary,
          timestamp: entry.timestamp,
        },
        ...entry.retained,
      ];
    if (entry.kind === 'message') messages.push(entry.message);
  }
  // A crash can occur after an assistant tool call and before its result is
  // persisted. Reconstruct an explicit receipt, never replay the operation.
  const repaired = [],
    pending = new Map();
  const finish = () => {
    for (const call of pending.values()) {
      const receipt = Object.values(record.receipts).find(
        (r) => r.toolCallId === call.id && (!call.runId || r.runId === call.runId),
      );
      const result =
        receipt?.state === 'settled'
          ? receipt.result
          : {
              ok: false,
              code: 'UNCONFIRMED',
              message: '中断前的操作结果未确认；先查询状态，禁止自动重放。',
            };
      repaired.push({
        role: 'toolResult',
        toolCallId: call.id,
        toolName: call.name,
        content: [{ type: 'text', text: JSON.stringify(result) }],
        isError: receipt?.state !== 'settled',
        timestamp: receipt?.completedAt || 0,
      });
    }
    pending.clear();
  };
  for (const message of messages) {
    if (message.role !== 'toolResult') finish();
    if (message.role === 'assistant')
      for (const block of message.content)
        if (block.type === 'toolCall')
          pending.set(block.id, {
            ...block,
            runId: record.entries.find((e) => e.message === message)?.runId,
          });
    if (message.role === 'toolResult') pending.delete(message.toolCallId);
    repaired.push(message);
  }
  finish();
  return structuredClone(repaired);
}
export function sessionView(record) {
  if (!record) return null;
  const results = new Map(
    record.entries
      .filter((e) => e.message?.role === 'toolResult')
      .map((e) => [e.runId + ':' + e.message.toolCallId, e.message]),
  );
  const receipts = new Map(
    Object.values(record.receipts).map((r) => [r.runId + ':' + r.toolCallId, r]),
  );
  const activityFor = (entry, call) => {
    const message = results.get(entry.runId + ':' + call.id);
    const receipt = receipts.get(entry.runId + ':' + call.id);
    return agentActivity({
      id: call.id,
      name: call.name,
      action: call.arguments?.action,
      status: message
        ? message.isError || message.details?.ok === false
          ? 'failed'
          : 'settled'
        : receipt?.state || 'pending',
      result: message?.details ?? receipt?.result,
    });
  };
  const toolsFor = (entry) =>
    entry.archivedTools ?? (Array.isArray(entry.message?.content) ? entry.message.content : [])
      .filter((block) => block.type === 'toolCall')
      .map((call) => activityFor(entry, call));
  const transcript = branchEntries(record)
    .filter((e) => e.kind === 'message' && ['user', 'assistant'].includes(e.message.role))
    .map((e) => {
      const calls = Array.isArray(e.message.content)
        ? e.message.content.filter((block) => block.type === 'toolCall').map((block) => block.id)
        : [];
      const actions = Object.values(record.receipts)
        .filter(
          (r) =>
            r.runId === e.runId &&
            calls.includes(r.toolCallId) &&
            ['edit', 'undo'].includes(r.action) &&
            r.result,
        )
        .map((r) => ({ action: r.action, ...r.result }));
      return {
        id: e.id,
        role: e.message.role,
        content: e.displayContent ?? textContent(e.message.content),
        timestamp: new Date(e.timestamp).toISOString(),
        stopped: ['aborted', 'error'].includes(e.message.stopReason),
        branchable: e.message.role === 'assistant' && e.message.stopReason === 'stop',
        tools: toolsFor(e),
        ...(actions.length ? { actions } : {}),
        ...(e.displayMedia?.length ? { media: e.displayMedia } : {}),
        ...(e.businessEvent ? { dramaEventKey: e.businessEvent } : {}),
      };
    });
  return {
    version: 2,
    id: record.id,
    projectId: record.projectId,
    revision: record.revision,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    ...record.metadata,
    transcript,
    branches: Object.values(record.branches),
    activeBranch: record.activeBranch,
    run: record.lastRunId ? record.runs[record.lastRunId] : null,
    receipts: Object.values(record.receipts),
    // Includes other branches so their cards cannot appear as unlinked history.
    knownCards: record.entries.flatMap((entry) => toolsFor(entry).flatMap((tool) => tool.cards)),
  };
}
export function createSessionService(repository) {
  async function ensure(id, projectId) {
    let record = await repository.get(id);
    if (record && record.projectId !== projectId)
      throw harnessError('对话属于另一个项目', 'AGENT_PROJECT_MISMATCH');
    if (!record) {
      if (!/^[\w-]{1,128}$/.test(id) || !/^[\w-]{1,128}$/.test(projectId))
        throw harnessError('项目或会话标识无效', 'AGENT_INVALID_REQUEST', 400);
      const now = new Date().toISOString();
      record = await repository.commit(
        {
          version: 2,
          id,
          projectId,
          revision: 0,
          createdAt: now,
          entries: [],
          activeBranch: 'main',
          branches: { main: { id: 'main', tipId: null, createdAt: now } },
          runs: {},
          receipts: {},
          metadata: { topic: 'New Chat', skillProjectId: projectId, selectedSkill: null },
        },
        0,
      );
    }
    return record;
  }
  async function change(id, fn) {
    const record = await repository.get(id);
    if (!record) throw harnessError('会话不存在', 'AGENT_SESSION_NOT_FOUND', 404);
    await fn(record);
    record.metadata.messageCount = sessionView(record).transcript.length;
    return repository.commit(record, record.revision);
  }
  function append(record, data) {
    const branch = record.branches[record.activeBranch];
    const entry = {
      ...data,
      id: crypto.randomUUID(),
      parentId: branch.tipId,
      timestamp: Date.now(),
    };
    record.entries.push(entry);
    branch.tipId = entry.id;
    return entry;
  }
  // Drama receives a projection and may append business notes; it cannot replace
  // conversation history, tool intents or receipts.
  const dramaStore = {
    async get(id) {
      const view = sessionView(await repository.get(id));
      return view ? { ...view, messages: view.transcript } : null;
    },
    async save(view) {
      const record = await change(view.id, (record) => {
        if (view.revision !== record.revision)
          throw harnessError('制作状态已变化，请刷新', 'AGENT_REVISION_CONFLICT');
        const current = sessionView(record).transcript;
        for (const name of [
          'topic',
          'selectedSkill',
          'skillProjectId',
          'workflow',
          'workflowVariants',
        ])
          if (Object.hasOwn(view, name)) record.metadata[name] = view[name];
        for (const message of (view.messages || []).slice(current.length))
          append(record, {
            kind: 'message',
            businessEvent: message.dramaEventKey,
            message:
              message.role === 'user'
                ? { role: 'user', content: message.content, timestamp: Date.now() }
                : assistantMessage({ id: 'business', provider: 'harness' }, [
                    { type: 'text', text: message.content },
                  ]),
          });
      });
      const result = sessionView(record);
      return { ...result, messages: result.transcript };
    },
  };
  return { repository, ensure, change, append, dramaStore };
}
