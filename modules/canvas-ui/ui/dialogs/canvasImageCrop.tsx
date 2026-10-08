import type { Dependencies, Props, Runtime } from './canvasImageCropTypes';
import { useCanvasImageCropState } from './useCanvasImageCropState';
import { imageCropGestures } from './imageCropGestures';
import { useImageCropOverlay } from './imageCropOverlay';
import { imageCropSave } from './imageCropSave';
import { renderImageCropToolbar } from './renderImageCropToolbar';
import { renderImageCropStage } from './renderImageCropStage';

export function CanvasImageCrop(React: Runtime, props: Props, dependencies: Dependencies) {
  const state = useCanvasImageCropState(React, props);
  const gestures = imageCropGestures(state);
  useImageCropOverlay(React, state);
  const save = imageCropSave(state, dependencies);
  const { Close } = dependencies;
  const { rootRef, setRatioOpen, error, invalidSelection, panorama, grid } = state;
  if (!props.node) return null;
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="裁切图片"
      className="fixed inset-0 z-[1000] bg-[var(--nk-input)] backdrop-blur-xl flex flex-col items-center gap-4 p-4 animate-in fade-in duration-300"
      onPointerDown={(event) => {
        event.stopPropagation();
        setRatioOpen(false);
      }}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.ctrlKey || event.metaKey) {
          const key = event.key.toLowerCase();
          if (key === 's') {
            event.preventDefault();
            void save();
          } else if (
            ['z', 'y'].includes(key) &&
            !(event.target instanceof Element && event.target.closest('input,textarea,[contenteditable]'))
          )
            event.preventDefault();
        }
      }}
    >
      {(error || invalidSelection) && (
        <div
          role="alert"
          className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] text-sm text-[var(--nk-danger)] bg-[var(--nk-input)] rounded-lg px-4 py-2"
        >
          {error || invalidSelection}
        </div>
      )}
      {renderImageCropToolbar(React, state, save, dependencies)}
      <button
        onClick={props.onClose}
        title="取消"
        aria-label="取消"
        className="absolute top-4 right-6 flex h-11 w-11 shrink-0 items-center justify-center bg-[var(--nk-hover)] hover:bg-[var(--nk-hover)] rounded-full text-[var(--nk-text)] transition-colors z-[60]"
      >
        <Close size={22} />
      </button>
      {renderImageCropStage(React, state, gestures, dependencies)}
      <div className="shrink-0 text-center text-[var(--nk-text-muted)] text-xs font-medium">
        {panorama
          ? '鼠标拖拽旋转视角 • 滚轮缩放焦距 (FOV)'
          : grid
            ? '拖拽蓝色分割线可单独微调每一行或每一列，点击“恢复等分”可回到默认宫格'
            : '拖拽边缘调整区域，拖拽中心移动，或在空白处重新框选'}
      </div>
    </div>
  );
}
