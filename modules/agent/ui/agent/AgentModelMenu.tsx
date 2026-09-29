import { Check, Plug } from 'lucide-react';
import { agentVisionLabels, agentVisionHints, type AgentVision } from './agentVision';

interface Model {
  id: string;
  label: string;
  vision?: AgentVision;
}
interface Props {
  models: Model[];
  selected: string;
  onSelect(id: string): void;
  onServices(): void;
}
const row =
  'w-full px-3 py-2 text-left text-xs text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nk-focus)]';

function ModelOption({
  model,
  selected,
  onSelect,
}: {
  model: Model;
  selected: boolean;
  onSelect(id: string): void;
}) {
  return (
    <button
      type="button"
      aria-label={model.label}
      aria-pressed={selected}
      onClick={() => onSelect(model.id)}
      className={`${row} flex items-center gap-2 ${selected ? 'bg-[var(--nk-surface-raised)] text-[var(--nk-text)]' : ''}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{model.label}</span>
        {model.id && (
          <span
            className="block text-[10px] text-[var(--nk-text-muted)]"
            title={agentVisionHints[model.vision ?? 'unknown']}
          >
            {agentVisionLabels[model.vision ?? 'unknown']}
            {model.vision === 'supported' ? ' · 推荐用于画布' : ''}
          </span>
        )}
      </span>
      {selected && <Check size={14} className="shrink-0" aria-hidden="true" />}
    </button>
  );
}

export function AgentModelMenu({ models, selected, onSelect, onServices }: Props) {
  return (
    <div className="absolute bottom-full right-0 mb-2 w-64 max-w-[min(calc(100vw-112px),calc(100cqw-112px))] max-h-[min(480px,65vh)] overflow-y-auto overscroll-contain bg-[var(--nk-surface)] border border-[var(--nk-border-control)] rounded-lg shadow-2xl z-50">
      <div className="px-3 py-2 text-xs text-[var(--nk-text-muted)] border-b border-[var(--nk-border-control)]">
        选择模型
      </div>
      {models.map((model) => (
        <ModelOption
          key={model.id}
          model={model}
          selected={model.id === selected}
          onSelect={onSelect}
        />
      ))}
      {!models.some((model) => model.id) && (
        <p className="px-3 py-3 text-xs text-[var(--nk-text-muted)]">尚未配置文本模型</p>
      )}
      <div className="border-t border-[var(--nk-border-control)] py-1">
        <button type="button" className={`${row} flex items-center gap-2`} onClick={onServices}>
          <Plug size={14} aria-hidden="true" />
          连接模型服务
        </button>
      </div>
    </div>
  );
}
