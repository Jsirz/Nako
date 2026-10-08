import { canvasError } from '../../../contracts/canvasErrors.js';
import { createPortal } from 'react-dom';
import type { CanvasComponent } from '../app/canvasComponentType';
import type * as ReactTypes from 'react';
import { activateModal } from '../design/modalFocus';
import { renderAnnotationBrushSettings, renderAnnotationTools } from './renderAnnotationTools';
import { resizeLimit } from './imageResizeGeometry';
import {
  renderAnnotations,
  type AnnotationStroke,
  type AnnotationTool,
} from './imageAnnotationDrawing';
type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'useState' | 'useRef' | 'useEffect' | 'useLayoutEffect' | 'useCallback'
>;
interface Props {
  initialMask?: boolean;
  saveLabel?: string;
  node?: { id: string; resultUrl?: string; title?: string };
  projectId?: string;
  onSave(
    id: string,
    data: string,
    dimensions: { width: number; height: number },
  ): Promise<unknown> | unknown;
  onClose(): void;
}
interface Icons {
  Close: CanvasComponent;
  Save: CanvasComponent;
  Spinner: CanvasComponent;
}
interface Timeline {
  past: AnnotationStroke[][];
  present: AnnotationStroke[];
  future: AnnotationStroke[][];
}

export function CanvasImageAnnotation(
  React: Runtime,
  props: Props,
  icons: Icons,
) {
  const state = useAnnotationState(React, props);
  const actions = annotationActions(props, state);
  return renderAnnotation(React, props, icons, state, actions);
}

function useAnnotationState(React: Runtime, { node, projectId, onClose, initialMask = false }: Props) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null),
    canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null),
    sessionRef = React.useRef(0),
    savingRef = React.useRef(false);
  const activeRef = React.useRef<AnnotationStroke | null>(null);
  const pointerRef = React.useRef<{
    id: number;
    x: number;
    y: number;
    pan: boolean;
  } | null>(null);
  const historyRef = React.useRef<Timeline>({
    past: [],
    present: [],
    future: [],
  });
  const closeRef = React.useRef(onClose);
  React.useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const [tool, setTool] = React.useState<AnnotationTool>('brush');
  const [color, setColor] = React.useState('#ef4444'),
    [brushSize, setBrushSize] = React.useState(12),
    [opacity, setOpacity] = React.useState(0.6);
  const [mask, setMask] = React.useState(false),
    [saving, setSaving] = React.useState(false),
    [loaded, setLoaded] = React.useState(false),
    [error, setError] = React.useState('');
  const [history, setHistory] = React.useState<Timeline>(historyRef.current);
  const strokes = history.present,
    redoStrokes = history.future;
  const [display, setDisplay] = React.useState({ width: 0, height: 0 });
  const [viewport, setViewport] = React.useState({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = React.useState(false),
    [drawing, setDrawing] = React.useState(false);
  const [cursor, setCursor] = React.useState({ x: 0, y: 0 }),
    [cursorVisible, setCursorVisible] = React.useState(false);
  const id = node?.id,
    url = node?.resultUrl;
  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current,
      image = imageRef.current;
    if (!canvas || !image || !canvas.width || !canvas.height) return;
    const current = historyRef.current.present;
    renderAnnotations(canvas, activeRef.current ? [...current, activeRef.current] : current, {
      width: image.naturalWidth,
      height: image.naturalHeight,
    });
  }, []);
  const fit = React.useCallback(() => {
    const root = stageRef.current,
      image = imageRef.current;
    if (!root || !image) return;
    const width = root.clientWidth || window.innerWidth,
      height = root.clientHeight || window.innerHeight;
    const ratio = Math.max(
      0.001,
      Math.min(
        Math.max(1, width - 32) / image.naturalWidth,
        Math.max(1, height - 32) / image.naturalHeight,
      ),
    );
    const next = {
      width: image.naturalWidth * ratio,
      height: image.naturalHeight * ratio,
    };
    setDisplay(next);
    setViewport({
      x: (width - next.width) / 2,
      y: (height - next.height) / 2,
      scale: 1,
    });
  }, []);
  React.useEffect(() => {
    const session = ++sessionRef.current;
    savingRef.current = false;
    imageRef.current = null;
    activeRef.current = null;
    pointerRef.current = null;
    historyRef.current = { past: [], present: [], future: [] };
    setHistory(historyRef.current);
    setSaving(false);
    setLoaded(false);
    setError('');
    setDrawing(false);
    setPanning(false);
    setCursorVisible(false);
    setTool('brush');
    setColor('#ef4444');
    setBrushSize(12);
    setOpacity(0.6);
    setMask(initialMask);
    setDisplay({ width: 0, height: 0 });
    if (!id || !rootRef.current) return;
    const release = activateModal(rootRef.current, () => closeRef.current());
    const image = new Image();
    image.crossOrigin = 'anonymous';
    const fail = () => {
      if (sessionRef.current === session) setError('图片加载失败，请关闭后重新打开。');
    };
    const timeout = window.setTimeout(fail, 15000);
    image.onload = () => {
      clearTimeout(timeout);
      if (sessionRef.current !== session) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        fail();
        return;
      }
      const invalid = resizeLimit({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
      if (invalid) {
        setError(invalid);
        return;
      }
      imageRef.current = image;
      setLoaded(true);
      setError('');
      fit();
    };
    image.onerror = () => {
      clearTimeout(timeout);
      fail();
    };
    if (url) image.src = url;
    else {
      clearTimeout(timeout);
      fail();
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (stageRef.current) observer?.observe(stageRef.current);
    window.addEventListener('resize', fit);
    return () => {
      sessionRef.current = session + 1;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      window.removeEventListener('resize', fit);
      observer?.disconnect();
      release();
    };
  }, [id, url, projectId, fit, initialMask]);
  React.useLayoutEffect(() => {
    if (canvasRef.current && display.width && display.height) {
      canvasRef.current.width = Math.max(1, Math.round(display.width));
      canvasRef.current.height = Math.max(1, Math.round(display.height));
      redraw();
    }
  }, [display, history, redraw]);
  return { stageRef, rootRef, canvasRef, imageRef, sessionRef, savingRef, activeRef, pointerRef,
    historyRef, closeRef, tool, setTool, color, setColor, brushSize, setBrushSize, opacity, setOpacity,
    mask, setMask, saving, setSaving, loaded, error, setError, history, setHistory, strokes,
    redoStrokes, display, viewport, setViewport, panning, setPanning, drawing, setDrawing,
    cursor, setCursor, cursorVisible, setCursorVisible, id, redraw, fit };
}

type AnnotationState = ReturnType<typeof useAnnotationState>;

function annotationActions({ onSave }: Props, state: AnnotationState) {
  const { historyRef, setHistory, savingRef, pointerRef, setViewport, loaded, stageRef, fit,
    imageRef, display, viewport, tool, color, brushSize, opacity, activeRef, setDrawing, redraw,
    setPanning, setCursorVisible, setCursor } = state;
  const commit = (next: AnnotationStroke[]) => {
    const old = historyRef.current;
    historyRef.current = {
      past: [...old.past, old.present].slice(-50),
      present: next,
      future: [],
    };
    setHistory(historyRef.current);
  };
  const undo = () => {
    if (savingRef.current || pointerRef.current) return;
    const old = historyRef.current,
      previous = old.past.at(-1);
    if (!previous) return;
    historyRef.current = {
      past: old.past.slice(0, -1),
      present: previous,
      future: [old.present, ...old.future],
    };
    setHistory(historyRef.current);
  };
  const redo = () => {
    if (savingRef.current || pointerRef.current) return;
    const old = historyRef.current,
      next = old.future[0];
    if (!next) return;
    historyRef.current = {
      past: [...old.past, old.present],
      present: next,
      future: old.future.slice(1),
    };
    setHistory(historyRef.current);
  };
  const clear = () => {
    if (!savingRef.current && !pointerRef.current && historyRef.current.present.length) commit([]);
  };
  const zoomAt = (factor: number, x: number, y: number) =>
    setViewport((old) => {
      const scale = Math.max(0.05, Math.min(20, old.scale * factor));
      return {
        scale,
        x: x - ((x - old.x) * scale) / old.scale,
        y: y - ((y - old.y) * scale) / old.scale,
      };
    });
  const wheel = (event: ReactTypes.WheelEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (!loaded || pointerRef.current || savingRef.current) return;
    const bounds = stageRef.current?.getBoundingClientRect();
    if (bounds)
      zoomAt(
        event.deltaY < 0 ? 1.15 : 1 / 1.15,
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
  };
  const zoomCenter = (factor: number) => {
    const root = stageRef.current;
    if (root && !pointerRef.current)
      zoomAt(
        factor,
        (root.clientWidth || window.innerWidth) / 2,
        (root.clientHeight || window.innerHeight) / 2,
      );
  };
  const zoomIn = () => zoomCenter(1.15),
    zoomOut = () => zoomCenter(1 / 1.15),
    resetView = () => {
      if (!pointerRef.current) fit();
    };
  const point = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect(),
      image = imageRef.current!;
    return {
      x:
        ((event.clientX - bounds.left) / (bounds.width || display.width * viewport.scale)) *
        image.naturalWidth,
      y:
        ((event.clientY - bounds.top) / (bounds.height || display.height * viewport.scale)) *
        image.naturalHeight,
    };
  };
  const pointerDown = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || savingRef.current || pointerRef.current || ![0, 1].includes(event.button))
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pan: event.button === 1,
    };
    if (event.button === 1) {
      setPanning(true);
      return;
    }
    const start = point(event);
    activeRef.current = {
      tool,
      color,
      size: (brushSize * imageRef.current!.naturalWidth) / display.width,
      arrowHead: (20 * imageRef.current!.naturalWidth) / display.width,
      opacity,
      points: [start, start],
    };
    setDrawing(true);
    redraw();
  };
  const pointerMove = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    setCursorVisible(true);
    const bounds = stageRef.current?.getBoundingClientRect();
    setCursor({ x: event.clientX - (bounds?.left || 0), y: event.clientY - (bounds?.top || 0) });
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (pointer.pan) {
      const dx = event.clientX - pointer.x,
        dy = event.clientY - pointer.y;
      setViewport((old) => ({ ...old, x: old.x + dx, y: old.y + dy }));
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      return;
    }
    const stroke = activeRef.current;
    if (!stroke) return;
    if (['rectangle', 'circle', 'arrow', 'line'].includes(stroke.tool))
      stroke.points[1] = point(event);
    else stroke.points.push(point(event));
    redraw();
  };
  const pointerUp = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    if (event.type === 'pointerup') pointerMove(event);
    const stroke = activeRef.current;
    activeRef.current = null;
    pointerRef.current = null;
    setDrawing(false);
    setPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (stroke) commit([...historyRef.current.present, stroke]);
    else redraw();
  };
  const save = () => saveAnnotationImage(onSave, state);
  const keyDown = (event: ReactTypes.KeyboardEvent) => {
    event.stopPropagation();
    if (!(event.ctrlKey || event.metaKey) || event.nativeEvent.isComposing) return;
    const key = event.key.toLowerCase(),
      editing =
        event.target instanceof Element && event.target.closest('input,textarea,[contenteditable]');
    if (key === 's') {
      event.preventDefault();
      void save();
    } else if (!editing && (key === 'z' || key === 'y')) {
      event.preventDefault();
      if (key === 'y' || event.shiftKey) redo();
      else undo();
    }
  };
  return { undo, redo, clear, wheel, zoomIn, zoomOut, resetView, pointerDown, pointerMove, pointerUp, save, keyDown };
}

type AnnotationActions = ReturnType<typeof annotationActions>;

function renderAnnotation(React: Runtime, props: Props, icons: Icons, state: AnnotationState, actions: AnnotationActions) {
  const { Close } = icons;
  const { node, onClose } = props;
  const { rootRef, error } = state;
  const { keyDown } = actions;
  return node
    ? createPortal(
        <div
          ref={rootRef}
          role="dialog"
          aria-label="标注图片"
          aria-modal="true"
          onKeyDown={keyDown}
          onWheel={(event) => event.stopPropagation()}
          className={
            'fixed inset-0 z-[1000] bg-[var(--nk-input)] backdrop-blur-xl flex flex-col items-center gap-4 p-4 animate-in fade-in duration-300'
          }
          onPointerDown={(event) => event.stopPropagation()}
        >
          {error && (
            <div
              role="alert"
              className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] text-sm text-[var(--nk-danger)] bg-[var(--nk-input)] rounded-lg px-4 py-2"
            >
              {error}
            </div>
          )}
          {renderAnnotationToolbar(React, props, icons, state, actions)}
          <button onClick={onClose} title={'取消'} aria-label={'取消'}
            className={'absolute top-4 right-6 flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--nk-hover)] hover:bg-[var(--nk-hover)] rounded-full text-[var(--nk-text)] transition-colors z-[60]'}>
            <Close size={22} />
          </button>
          {renderAnnotationStage(React, props, icons, state, actions)}
          {renderAnnotationZoom(React, state, actions)}
        </div>,
        document.body,
      )
    : null;
}

function renderAnnotationToolbar(React: Runtime, { saveLabel = '保存' }: Props, { Save, Spinner }: Icons, state: AnnotationState, actions: AnnotationActions) {
  const { saving, mask, setMask, tool, setTool, brushSize, setBrushSize, color, setColor, opacity, setOpacity,
    history, redoStrokes, strokes, loaded, drawing } = state;
  const { undo, redo, clear, save } = actions;
  return <div
            className={'relative z-50 flex shrink-0 items-center justify-center gap-2 w-full pr-14'}
          >
            <fieldset
              disabled={saving}
              style={{ flexWrap: 'wrap', justifyContent: 'center' }}
              className={
                'flex min-h-11 items-center gap-1 px-2 py-1.5 rounded-full bg-[var(--nk-surface-raised)] backdrop-blur shadow-lg border border-[var(--nk-border)]'
              }
            >
              <div
                className={
                  'flex items-center p-1 gap-1 bg-[var(--nk-input)] rounded-full border border-[var(--nk-border)] mr-1'
                }
              >
                <button
                  onClick={() => setMask(!1)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${mask ? 'text-[var(--nk-text-muted)] hover:text-[var(--nk-text-secondary)]' : 'bg-[var(--nk-info-bg)] text-[var(--nk-text)] shadow-lg'}`}
                >
                  {'标准'}
                </button>
                <button
                  onClick={() => setMask(!0)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all duration-200 ${mask ? 'bg-[var(--nk-info-bg)] text-[var(--nk-text)] shadow-lg' : 'text-[var(--nk-text-muted)] hover:text-[var(--nk-text-secondary)]'}`}
                >
                  {'遮罩'}
                </button>
              </div>
              <div className={'shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6 mx-1'} />
              {renderAnnotationTools(React, tool, setTool)}
              <div className={'shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6 mx-1'} />
              {renderAnnotationBrushSettings(React, { brushSize, setBrushSize, color, setColor, opacity, setOpacity })}
              <div className={'shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6 mx-1'} />
              <div className={'flex items-center gap-1'}>
                <button
                  onClick={undo}
                  disabled={history.past.length === 0}
                  title={'撤销 (Ctrl+Z)'}
                  className={
                    'h-8 w-8 rounded-full text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] disabled:opacity-30'
                  }
                >
                  <svg
                    xmlns={'http://www.w3.org/2000/svg'}
                    width={'18'}
                    height={'18'}
                    viewBox={'0 0 24 24'}
                    fill={'none'}
                    stroke={'currentColor'}
                    strokeWidth={'2'}
                    strokeLinecap={'round'}
                    strokeLinejoin={'round'}
                  >
                    <path d={'M9 14l-4 -4l4 -4'} />
                    <path d={'M5 10h11a4 4 0 1 1 0 8h-1'} />
                  </svg>
                </button>
                <button
                  onClick={redo}
                  disabled={redoStrokes.length === 0}
                  title={'重做 (Ctrl+Y)'}
                  className={
                    'h-8 w-8 rounded-full text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] disabled:opacity-30'
                  }
                >
                  <svg
                    xmlns={'http://www.w3.org/2000/svg'}
                    width={'18'}
                    height={'18'}
                    viewBox={'0 0 24 24'}
                    fill={'none'}
                    stroke={'currentColor'}
                    strokeWidth={'2'}
                    strokeLinecap={'round'}
                    strokeLinejoin={'round'}
                  >
                    <path d={'M15 14l4 -4l-4 -4'} />
                    <path d={'M19 10h-11a4 4 0 1 0 0 8h1'} />
                  </svg>
                </button>
                <button
                  onClick={clear}
                  disabled={strokes.length === 0}
                  title={'清除所有'}
                  className={
                    'h-8 w-8 rounded-full text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-danger)] disabled:opacity-30 transition-colors'
                  }
                >
                  <svg
                    xmlns={'http://www.w3.org/2000/svg'}
                    width={'18'}
                    height={'18'}
                    viewBox={'0 0 24 24'}
                    fill={'none'}
                    stroke={'currentColor'}
                    strokeWidth={'2'}
                    strokeLinecap={'round'}
                    strokeLinejoin={'round'}
                  >
                    <path d={'M4 7l16 0'} />
                    <path d={'M10 11l0 6'} />
                    <path d={'M14 11l0 6'} />
                    <path d={'M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12'} />
                    <path d={'M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3'} />
                  </svg>
                </button>
              </div>
              <div className={'shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6 mx-1'} />
              <button
                onClick={save}
                aria-label="保存标注图片"
                disabled={saving || !loaded || drawing}
                className={
                  'flex items-center justify-center bg-[var(--nk-info-bg)] text-[var(--nk-text)] h-8 rounded-full px-4 gap-2 text-xs font-bold hover:bg-[var(--nk-info-bg)] disabled:opacity-50 transition-colors ml-2'
                }
              >
                {saving ? <Spinner size={16} className={'animate-spin'} /> : <Save size={16} />}
                {saveLabel}
              </button>
            </fieldset>
          </div>
  ;
}

function renderAnnotationStage(_React: Runtime, { node }: Props, { Spinner }: Icons, state: AnnotationState, actions: AnnotationActions) {
  const { stageRef, loaded, error, viewport, display, canvasRef, panning, drawing, setCursorVisible,
    cursorVisible, cursor, brushSize, tool, color, opacity } = state;
  const { wheel, pointerDown, pointerMove, pointerUp } = actions;
  return <div
            ref={stageRef}
            className={'relative w-full flex-1 min-h-0 overflow-hidden'}
            onWheel={wheel}
          >
            {!loaded && !error && (
              <div className={'absolute inset-0 flex items-center justify-center'}>
                <Spinner size={40} className={'animate-spin text-[var(--nk-text-muted)]'} />
              </div>
            )}
            <div
              className={'absolute shadow-2xl rounded-lg overflow-hidden bg-[var(--nk-input)]'}
              style={{
                visibility: loaded ? 'visible' : 'hidden',
                left: 0,
                top: 0,
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                transformOrigin: '0 0',
                transition: 'none',
              }}
            >
              {node?.resultUrl && (
                <img
                  src={node.resultUrl}
                  alt={'Annotate'}
                  className={'block pointer-events-none'}
                  style={{
                    width: display.width,
                    height: display.height,
                    visibility: loaded && display.width > 0 ? 'visible' : 'hidden',
                  }}
                />
              )}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 touch-none ${panning ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'}`}
                style={{ width: display.width, height: display.height }}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
                onLostPointerCapture={pointerUp}
                aria-label="标注绘制区域"
                onPointerEnter={() => setCursorVisible(!0)}
                onPointerLeave={(event) => {
                  setCursorVisible(false);
                  if (
                    (drawing || panning) &&
                    !event.currentTarget.hasPointerCapture(event.pointerId)
                  )
                    pointerUp(event);
                }}
              />
            </div>
            {cursorVisible && !panning && (
              <div
                className={
                  'absolute pointer-events-none z-[2000] rounded-full border border-[var(--nk-border)] shadow-[0_0_0_1px_rgba(0,0,0,0.3)] -translate-x-1/2 -translate-y-1/2'
                }
                style={{
                  left: cursor.x,
                  top: cursor.y,
                  width: `${brushSize * viewport.scale}px`,
                  height: `${brushSize * viewport.scale}px`,
                  backgroundColor: tool === 'eraser' ? 'transparent' : color,
                  opacity: tool === 'eraser' ? 0.5 : opacity,
                  borderStyle: tool === 'eraser' ? 'dashed' : 'solid',
                }}
              >
                {tool === 'eraser' && (
                  <div className={'absolute inset-0 flex items-center justify-center'}>
                    <div className={'w-1 h-1 bg-[var(--nk-primary)] rounded-full'} />
                  </div>
                )}
              </div>
            )}
          </div>
  ;
}

function renderAnnotationZoom(_React: Runtime, { viewport }: AnnotationState, { zoomIn, zoomOut, resetView }: AnnotationActions) {
  return (
          <div
            className={
              'relative shrink-0 flex items-center gap-3 bg-[var(--nk-surface)] backdrop-blur-md rounded-full px-4 py-2.5 z-50 border border-[var(--nk-border)] shadow-2xl animate-in slide-in-from-bottom duration-500'
            }
          >
            <button
              className={'p-1 text-[var(--nk-text)] hover:text-[var(--nk-text)] transition-colors'}
              onClick={zoomOut}
              title={'缩小'}
            >
              <svg
                className={'w-5 h-5'}
                viewBox={'0 0 24 24'}
                fill={'none'}
                stroke={'currentColor'}
                strokeWidth={'2.5'}
                strokeLinecap={'round'}
                strokeLinejoin={'round'}
              >
                <line x1={'5'} y1={'12'} x2={'19'} y2={'12'} />
              </svg>
            </button>
            <span
              className={
                'text-[var(--nk-text)] text-[13px] font-bold min-w-[54px] text-center font-mono'
              }
            >
              {Math.round(viewport.scale * 100)}
              {'%'}
            </span>
            <button
              className={'p-1 text-[var(--nk-text)] hover:text-[var(--nk-text)] transition-colors'}
              onClick={zoomIn}
              title={'放大'}
            >
              <svg
                className={'w-5 h-5'}
                viewBox={'0 0 24 24'}
                fill={'none'}
                stroke={'currentColor'}
                strokeWidth={'2.5'}
                strokeLinecap={'round'}
                strokeLinejoin={'round'}
              >
                <line x1={'12'} y1={'5'} x2={'12'} y2={'19'} />
                <line x1={'5'} y1={'12'} x2={'19'} y2={'12'} />
              </svg>
            </button>
            <div className={'flex items-center ml-1 pl-3 border-l border-[var(--nk-border)]'}>
              <button
                className={
                  'px-2.5 py-1 text-[11px] font-bold text-[var(--nk-text)] hover:text-[var(--nk-text)] bg-[var(--nk-hover)] hover:bg-[var(--nk-hover)] rounded-md transition-all active:scale-95'
                }
                onClick={resetView}
              >
                {'重置'}
              </button>
            </div>
          </div>
  );
}

async function saveAnnotationImage(onSave: Props['onSave'], state: AnnotationState) {
  const { imageRef, id, savingRef, pointerRef, sessionRef, setSaving, setError, historyRef, mask, closeRef } = state;
  const image = imageRef.current;
  if (!image || !id || savingRef.current || pointerRef.current) return;
  const session = sessionRef.current;
  savingRef.current = true;
  setSaving(true);
  setError('');
  try {
    const dimensions = { width: image.naturalWidth, height: image.naturalHeight };
    const canvas = document.createElement('canvas'), overlay = document.createElement('canvas');
    canvas.width = overlay.width = dimensions.width;
    canvas.height = overlay.height = dimensions.height;
    renderAnnotations(overlay, historyRef.current.present, dimensions);
    const context = canvas.getContext('2d');
    if (!context) throw canvasError('无法创建标注图片', 'image-annotation.save-canvas');
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = mask ? 'destination-out' : 'source-over';
    context.drawImage(overlay, 0, 0);
    const data = canvas.toDataURL('image/png');
    if (!data.startsWith('data:image/png')) throw canvasError('图片超出当前设备的处理范围。', 'image-annotation.export');
    await onSave(id, data, dimensions);
    if (sessionRef.current === session) closeRef.current();
  } catch (cause) {
    if (sessionRef.current === session)
      setError(cause instanceof Error ? cause.message : '标注保存失败，请重试。');
  } finally {
    if (sessionRef.current === session) {
      savingRef.current = false;
      setSaving(false);
    }
  }
}
