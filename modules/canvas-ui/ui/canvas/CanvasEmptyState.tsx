import * as React from 'react';
import { Type, Image, Video, AudioLines, Plus } from 'lucide-react';

const shortcuts = [
  { type: 'Text', label: '文本', Icon: Type },
  { type: 'Image', label: '图像', Icon: Image },
  { type: 'Video', label: '视频', Icon: Video },
  { type: 'Audio', label: '音频', Icon: AudioLines },
];

/** A view-only entry point: creation still goes through the canvas operation handlers. */
export function CanvasEmptyState({ onCreate, onMore }: {
  onCreate(type: string): void;
  onMore: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <div className="nako-canvas-empty">
      <div className="nako-canvas-empty-content">
        <span className="nako-canvas-empty-mark" aria-hidden="true"><Plus size={24} strokeWidth={1.25} /></span>
        <h1>从一个想法开始</h1>
        <p>双击画布添加节点，或拖入本地素材</p>
        <div className="nako-canvas-shortcuts" aria-label="快速创建节点">
          {shortcuts.map(({ type, label, Icon }) => (
            <button type="button" key={type} onClick={() => onCreate(type)} aria-label={`创建${label}节点`}>
              <Icon size={15} strokeWidth={1.6} /><span>{label}</span>
            </button>
          ))}
          <button type="button" onClick={onMore} aria-label="更多节点类型"><Plus size={15} /><span>更多</span></button>
        </div>
      </div>
    </div>
  );
}
