import { useRef, useState } from 'react';
import { Check, FilePlus2, Pencil } from 'lucide-react';

export function AgentMessageExport({ content, create, disabled }: { content: string; create(text: string): string; disabled?: boolean }) {
  const locked = useRef(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? content;
  const exportText = async () => {
    if (disabled || locked.current || !text.trim()) return;
    locked.current = true;
    setBusy(true);
    try {
      create(text);
      try { await navigator.clipboard.writeText(text); setStatus('已复制并创建文本节点'); }
      catch { setStatus('已创建文本节点；剪贴板复制失败'); }
    } catch (error) { setStatus(error instanceof Error ? error.message : '创建文本节点失败'); }
    finally { locked.current = false; setBusy(false); }
  };
  return <div className="mt-2 text-xs text-[var(--nk-text-secondary)]">
    {editing && <textarea aria-label="编辑画布结果" value={text} disabled={disabled || busy}
      onChange={(event) => { setDraft(event.target.value); setStatus(''); }} rows={8}
      className="mb-2 w-full resize-y rounded-md border border-[var(--nk-border-control)] bg-[var(--nk-input)] p-2 text-sm leading-relaxed text-[var(--nk-text)]" />}
    <div className="flex flex-wrap items-center justify-end gap-2">
      {status && <span role="status">{status}</span>}
      <button type="button" disabled={disabled || busy} title={editing ? '完成编辑' : '编辑结果'}
        aria-label={editing ? '完成编辑' : '编辑结果'}
        onClick={() => { if (!editing) setDraft(text); setEditing(!editing); }}
        className="p-1.5 rounded-md hover:bg-[var(--nk-hover)] disabled:opacity-50">
        {editing ? <Check size={14} aria-hidden="true" /> : <Pencil size={14} aria-hidden="true" />}
      </button>
      <button type="button" disabled={disabled || busy || !text.trim()} onClick={() => void exportText()}
        className="rounded-md border border-[var(--nk-border-control)] bg-[var(--nk-surface)] px-2 py-1 text-[var(--nk-text-secondary)] enabled:hover:text-[var(--nk-text)] enabled:hover:bg-[var(--nk-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nk-focus)] disabled:opacity-50 disabled:cursor-not-allowed">
        <FilePlus2 size={14} aria-hidden="true" className="mr-1 inline-block" />{busy ? '正在创建…' : '复制并新建文本节点'}
      </button>
    </div>
  </div>;
}
