import { Download, FolderOpen, LoaderCircle } from 'lucide-react';

export function CanvasTransferMenu(props: {
  busy: boolean;
  onImport(): void;
  onExport(): Promise<void>;
  close(): void;
  onError(message: string): void;
}) {
  const itemClass = 'w-full h-9 px-2.5 rounded-md text-left text-sm text-[var(--nk-text)] hover:bg-[var(--nk-surface-raised)] flex items-center gap-2 disabled:opacity-50';
  return <>
    <button type="button" title="导入 .nako 中的画布、素材和 Agent 聊天记录" className={itemClass} disabled={props.busy} onClick={() => {
      props.close();
      props.onImport();
    }}><FolderOpen size={14} />导入画布</button>
    <button type="button" title="导出画布、素材和 Agent 已保存的聊天记录" className={itemClass} disabled={props.busy} onClick={() => {
      props.close();
      props.onError('');
      void props.onExport().catch(error => props.onError(error instanceof Error ? error.message : '画布导出失败。'));
    }}><Download size={14} />导出画布</button>
    {props.busy && <span role="status" className="flex items-center gap-2 px-2.5 py-2 text-xs text-[var(--nk-text-secondary)]"><LoaderCircle size={14} className="animate-spin" />正在传输画布</span>}
  </>;
}
