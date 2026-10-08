import type * as ReactTypes from 'react';
import type { AnnotationTool } from './imageAnnotationDrawing';

type Runtime = Pick<typeof ReactTypes, 'createElement'>;
const tools: { tool: AnnotationTool; title: string; paths?: string[]; circle?: boolean }[] = [
  { tool: 'brush', title: '画笔工具', paths: ['M3 21v-4a4 4 0 1 1 4 4h-4', 'M21 3a16 16 0 0 0 -12.8 10.2', 'M21 3a16 16 0 0 1 -10.2 12.8', 'M10.6 9a9 9 0 0 1 4.4 4.4'] },
  { tool: 'rectangle', title: '矩形工具', paths: ['M3 5m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z'] },
  { tool: 'circle', title: '圆形工具', circle: true },
  { tool: 'arrow', title: '箭头工具', paths: ['M5 12l14 0', 'M13 18l6 -6', 'M13 6l6 6'] },
  { tool: 'line', title: '直线工具', paths: ['M5 12l14 0'] },
  { tool: 'eraser', title: '橡皮擦', paths: ['M19 20h-10.5l-4.21 -4.3a1 1 0 0 1 0 -1.41l10 -10a1 1 0 0 1 1.41 0l5 5a1 1 0 0 1 0 1.41l-9.2 9.3', 'M18 13.3l-6.3 -6.3'] },
];

export function renderAnnotationTools(_React: Runtime, tool: AnnotationTool, setTool: (tool: AnnotationTool) => void) {
  return (
    <div role={'group'} className={'flex items-center gap-1 p-1 rounded-full bg-[var(--nk-input)]'}>
      {tools.map(entry => (
        <button
          key={entry.tool} onClick={() => setTool(entry.tool)} title={entry.title}
          className={`inline-flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 ${tool === entry.tool ? 'bg-[var(--nk-hover)] text-[var(--nk-text)]' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)]'}`}
        >
          <svg xmlns={'http://www.w3.org/2000/svg'} width={'18'} height={'18'} viewBox={'0 0 24 24'}
            fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'}>
            {entry.circle && <circle cx={'12'} cy={'12'} r={'9'} />}
            {entry.paths?.map(path => <path key={path} d={path} />)}
          </svg>
        </button>
      ))}
    </div>
  );
}

interface BrushSettings {
  brushSize: number;
  setBrushSize(value: number): void;
  color: string;
  setColor(value: string): void;
  opacity: number;
  setOpacity(value: number): void;
}
const numberClass = 'h-7 px-1.5 rounded-md bg-[var(--nk-input)] border border-[var(--nk-border-control)] text-[10px] text-[var(--nk-text)] outline-none focus:border-[var(--nk-info)] text-center tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
const sliderClass = 'w-full h-1 bg-[var(--nk-surface-raised)] rounded-lg appearance-none cursor-pointer accent-[var(--nk-focus)]';

export function renderAnnotationBrushSettings(_React: Runtime, { brushSize, setBrushSize, color, setColor, opacity, setOpacity }: BrushSettings) {
  return (
    <div className={'flex items-center gap-3 px-2'}>
      <div className={'flex items-center justify-center w-10 h-10 shrink-0 bg-[var(--nk-input)] rounded-lg'}>
        <div className={'rounded-full shadow-inner transition-all duration-75'} style={{
          width: `${Math.min(32, Math.max(2, brushSize / 1.5))}px`,
          height: `${Math.min(32, Math.max(2, brushSize / 1.5))}px`,
          backgroundColor: color, opacity, boxShadow: '0 0 0 1px rgba(255,255,255,0.2)',
        }} />
      </div>
      <div className={'flex items-center gap-2'}>
        <input type={'color'} value={color} title={'选择颜色'} onChange={event => setColor(event.target.value)}
          className={'size-5 aspect-square rounded-full border-none cursor-pointer bg-transparent'} />
        <div className={'flex items-center gap-2 h-8 w-[136px]'}>
          <input type={'range'} min={'5'} max={'60'} value={brushSize} title={`粗细: ${brushSize}px`}
            onChange={event => setBrushSize(parseInt(event.target.value))} className={sliderClass} />
          <input type={'number'} min={'5'} max={'60'} step={'1'} value={brushSize} title={`粗细: ${brushSize}px`}
            onChange={event => {
              const value = parseInt(event.target.value, 10);
              if (!Number.isNaN(value)) setBrushSize(Math.max(5, Math.min(60, value)));
            }} className={'w-[46px] ' + numberClass} />
        </div>
      </div>
      <div className={'shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6'} />
      <div className={'flex items-center gap-2'}>
        <span className={'text-[10px] text-[var(--nk-text-muted)] font-bold w-4'}>{'OP'}</span>
        <div className={'flex items-center gap-2 h-8 w-[132px]'}>
          <input type={'range'} min={'0.1'} max={'1.0'} step={'0.1'} value={opacity}
            title={`透明度: ${Math.round(opacity * 100)}%`}
            onChange={event => setOpacity(parseFloat(event.target.value))} className={sliderClass} />
          <input type={'number'} min={'10'} max={'100'} step={'10'} value={Math.round(opacity * 100)}
            title={`透明度: ${Math.round(opacity * 100)}%`}
            onChange={event => {
              const value = parseInt(event.target.value, 10);
              if (!Number.isNaN(value)) setOpacity(Math.max(0.1, Math.min(1, value / 100)));
            }} className={'w-[48px] ' + numberClass} />
        </div>
      </div>
    </div>
  );
}
