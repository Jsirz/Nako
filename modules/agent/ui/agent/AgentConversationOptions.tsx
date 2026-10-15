import { Check, Hand, Zap } from 'lucide-react';
import type { AgentWorkspace } from './agentWorkspace';
import { AgentOptionPopover } from './AgentOptionPopover';

interface Props {
  value: AgentWorkspace;
  patch(value: Partial<AgentWorkspace>): void;
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

export function AgentConversationOptions(props: Props) {
  return <div className="flex shrink-0 items-center gap-1" data-agent-conversation-options="true">
    {props.generation && <ExecutionOptions {...props} />}
  </div>;
}
