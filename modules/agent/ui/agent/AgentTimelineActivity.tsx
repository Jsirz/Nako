import { useSyncExternalStore } from 'react';
import type { AgentActivity, AgentCardReference } from '../../../contracts/agentActivity.js';
import type { CanvasCreationControl } from './canvasCreationControl';
import type { CanvasProjectControl } from './canvasProjectControl';
import type { CanvasBudgetControl } from './canvasBudgetControl';
import type { CanvasProductControl } from './canvasProductControl';
import { AgentGenerationBatches } from './AgentGenerationBatches';
import { AgentProjectRequests } from './AgentProjectRequests';
import { AgentBudgets } from './AgentBudgets';
import { AgentProductRequests } from './AgentProductRequests';
import { AgentNodeRunCard } from './AgentNodeRunCard';

export interface AgentCardControllers {
  sessionId: string;
  creation?: CanvasCreationControl;
  projects?: CanvasProjectControl;
  budgets?: CanvasBudgetControl;
  products?: CanvasProductControl;
}
const keyOf = (card: AgentCardReference) => card.kind + ':' + card.id;
/** A replayed receipt may refer to an earlier card; keep that card at its first occurrence. */
export function timelineActivities<T extends { tools?: AgentActivity[] }>(messages: readonly T[]) {
  const seen = new Set<string>();
  return messages.map((message) => ({
    ...message,
    tools: message.tools?.map((tool) => ({
      ...tool,
      cards: (tool.cards || []).filter((card) => {
        const key = keyOf(card);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }),
    })),
  }));
}
function Card({
  card,
  controllers,
}: {
  card: AgentCardReference;
  controllers: AgentCardControllers;
}) {
  const props = { sessionId: controllers.sessionId, cardIds: [card.id], showError: false };
  if (card.kind === 'node') return <AgentNodeRunCard id={card.id} />;
  if (card.kind === 'generation' && controllers.creation)
    return <AgentGenerationBatches {...props} controller={controllers.creation} />;
  if (card.kind === 'project' && controllers.projects)
    return <AgentProjectRequests {...props} controller={controllers.projects} />;
  if (card.kind === 'budget' && controllers.budgets)
    return <AgentBudgets {...props} controller={controllers.budgets} />;
  if (card.kind === 'product' && controllers.products)
    return <AgentProductRequests {...props} controller={controllers.products} />;
  return null;
}
const toolNames: Record<string, string> = {
  canvas_control: '画布',
  project_control: '项目',
  generation_control: '生成',
  media_control: '媒体',
  workflow_control: '工作流',
  drama_plan: '制作计划',
};
const actionNames: Record<string, string> = {
  read: '读取画布',
  edit: '编辑画布',
  models: '查询模型',
  tasks: '查询任务',
  prepareGeneration: '准备生成',
  prepareBudget: '申请连续生成授权',
  runGeneration: '执行生成',
  budgets: '查询授权',
  media: '处理素材',
  product: '打开操作流程',
};
const statuses: Record<string, string> = {
  running: '执行中',
  pending: '回执待确认',
  unknown: '结果未确认',
  settled: '回执已保存',
  failed: '失败',
  interrupted: '历史操作未完成（导入后不自动执行）',
};
export function AgentTimelineActivity({
  tools = [],
  controllers,
}: {
  tools?: AgentActivity[];
  controllers: AgentCardControllers;
}) {
  if (!tools.length) return null;
  const active = tools.some((tool) => tool.status === 'running');
  const unresolved = tools.some((tool) => ['failed', 'unknown', 'pending'].includes(tool.status));
  return (
    <div className="my-2 space-y-2" data-agent-timeline-activity="true">
      <details
        className="rounded-lg bg-[var(--nk-surface)] p-3 text-xs text-[var(--nk-text-secondary)]"
        open={active || unresolved}
      >
        <summary className="cursor-pointer">
          {active ? '正在执行' : unresolved ? '操作需要核对' : '操作记录'} · {tools.length} 项
        </summary>
        <div className="mt-2 space-y-1" aria-live="polite">
          {tools.map((tool) => (
            <p key={tool.id}>
              {actionNames[tool.action || ''] || toolNames[tool.name] || tool.name} ·{' '}
              {statuses[tool.status] || tool.status}
            </p>
          ))}
        </div>
      </details>
      {tools.flatMap((tool) =>
        (tool.cards || []).map((card) => (
          <Card key={keyOf(card)} card={card} controllers={controllers} />
        )),
      )}
    </div>
  );
}

const empty: never[] = [];
const emptySnapshot = () => empty;
const noSubscribe = () => () => {};
/** Pending receipts can outlive their message stream; keep them visible for reconciliation. */
export function AgentUnlinkedActivity({
  controllers,
  knownCards,
}: {
  controllers: AgentCardControllers;
  knownCards: AgentCardReference[];
}) {
  const batches = useSyncExternalStore(
    controllers.creation?.subscribe || noSubscribe,
    controllers.creation?.getSnapshot || emptySnapshot,
  );
  const projects = useSyncExternalStore(
    controllers.projects?.subscribe || noSubscribe,
    controllers.projects?.getSnapshot || emptySnapshot,
  );
  const budgets = useSyncExternalStore(
    controllers.budgets?.subscribe || noSubscribe,
    controllers.budgets?.getSnapshot || emptySnapshot,
  );
  const products = useSyncExternalStore(
    controllers.products?.subscribe || noSubscribe,
    controllers.products?.getSnapshot || emptySnapshot,
  );
  const excluded = (kind: AgentCardReference['kind']) =>
    knownCards.filter((card) => card.kind === kind).map((card) => card.id);
  const cards: AgentCardReference[] = [];
  for (const [kind, records] of [
    ['generation', batches],
    ['project', projects],
    ['budget', budgets],
    ['product', products],
  ] as const) {
    for (const record of records)
      if (
        !excluded(kind).includes(record.id) &&
        (record.sessionId === controllers.sessionId ||
          (kind === 'budget' && record.state === 'approved'))
      )
        cards.push({ kind, id: record.id });
  }
  const errors = [controllers.creation?.getError(), controllers.budgets?.getError()].filter(
    Boolean,
  );
  if (!cards.length && !errors.length) return null;
  return (
    <details
      className="mb-3 text-xs text-[var(--nk-text-secondary)]"
      data-agent-unlinked-activity="true"
    >
      <summary className="cursor-pointer">未关联到消息的操作记录 · {cards.length}</summary>
      <div className="mt-2 space-y-2">
        {errors.map((error, index) => (
          <p role="alert" key={index}>
            {error}
          </p>
        ))}
        {cards.map((card) => (
          <Card key={keyOf(card)} card={card} controllers={controllers} />
        ))}
      </div>
    </details>
  );
}
