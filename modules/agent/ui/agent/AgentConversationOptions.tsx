import { Brain, Check, Hand, Zap } from 'lucide-react';
import type { AgentWorkspace } from './agentWorkspace';
import type { agentThinking } from './agentThinking';
import { AgentOptionPopover } from './AgentOptionPopover';

interface Props {
  value: AgentWorkspace;
  patch(value: Partial<AgentWorkspace>): void;
  thinking?: ReturnType<typeof agentThinking>;
  disabled: boolean;
  generation: boolean;
}
const modes = [
  { value: 'confirm', label: '手动确认', description: 'Agent 在执行生成前都会寻求您的确认', icon: Hand },
  { value: 'direct', label: '自动生成', description: 'Agent 会自主规划生成任务并自动执行', icon: Zap },
] as const;

function ExecutionOptions({ value, patch, disabled }: Props) {
  const selected = modes.find((mode) => mode.value === value.generationApproval) || modes[0];
  return (
    <AgentOptionPopover label="生成执行方式" title={selected.label} icon={selected.icon} disabled={disabled} menu>
      {(close) => modes.map(({ value: mode, label, description, icon: Icon }) => (
        <button key={mode} type="button" role="menuitemradio" aria-checked={selected.value === mode}
          className="nako-agent-option-row" disabled={disabled}
          onClick={() => { patch({ generationApproval: mode }); close(); }}>
          <Icon size={18} aria-hidden="true" />
          <span className="min-w-0 flex-1"><span className="block font-medium">{label}</span>
            <span className="nako-agent-option-description">{description}</span></span>
          <Check size={16} aria-hidden="true" className={selected.value === mode ? 'shrink-0' : 'invisible shrink-0'} />
        </button>
      ))}
    </AgentOptionPopover>
  );
}

function ThinkingOptions({ thinking, patch, disabled }: Props) {
  if (!thinking) return null;
  const hint = !thinking.supported ? '当前模型未提供思考设置'
    : !thinking.canDisable ? '当前模型要求开启思考' : '会话思考';
  return (
    <AgentOptionPopover label="思考设置" title={`${hint} · ${thinking.enabled ? '开启' : '关闭'}`} icon={Brain} disabled={disabled}>
      {() => <div className="nako-agent-thinking-options">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">会话思考</span>
          <button type="button" role="switch" aria-label="会话思考" aria-checked={thinking.enabled}
            title={hint} disabled={disabled || !thinking.canDisable}
            className="nako-agent-thinking-switch" onClick={() => patch({ thinkingEnabled: !thinking.enabled })}>
            <span />
          </button>
        </div>
        {(!thinking.supported || !thinking.canDisable) && <p className="nako-agent-option-description">{hint}</p>}
        <label className="mt-3 flex items-center justify-between gap-3">
          <span>思考强度</span>
          <select aria-label="会话思考强度" value={thinking.effort}
            disabled={disabled || !thinking.enabled || !thinking.options.length}
            className="min-w-0 rounded-md border border-[var(--nk-border-control)] bg-[var(--nk-input)] px-2 py-1 disabled:opacity-50"
            onChange={(event) => patch({ thinkingEffort: event.target.value })}>
            {!thinking.options.length && <option value="">{thinking.supported ? '模型自动' : '不可用'}</option>}
            {thinking.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </div>}
    </AgentOptionPopover>
  );
}

export function AgentConversationOptions(props: Props) {
  return <div className="flex shrink-0 items-center gap-1" data-agent-conversation-options="true">
    {props.generation && <ExecutionOptions {...props} />}
    <ThinkingOptions {...props} />
  </div>;
}
