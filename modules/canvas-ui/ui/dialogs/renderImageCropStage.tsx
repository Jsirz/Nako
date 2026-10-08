import { cropMargin } from './imageCropGeometry';
import type { Dependencies, Runtime } from './canvasImageCropTypes';
import type { ImageCropState } from './useCanvasImageCropState';
import type { ImageCropGestures } from './imageCropGestures';

function renderPanoramaViews(_React: Runtime, state: ImageCropState) {
  const { viewPreview, selectedViews, setViewPreview, setSelectedViews } = state;
  return (
    <div className="absolute inset-0 z-10 bg-[var(--nk-input)] flex flex-col" aria-label="全景视角预览">
      <div className="flex items-center justify-between px-3 py-2 text-xs text-[var(--nk-text)]">
        <span>检查分框构图，点击选择要导出的视角</span>
        <button
          onClick={() => {
            setViewPreview([]);
            setSelectedViews([]);
          }}
        >
          返回全景调整
        </button>
      </div>
      <div
        className="grid flex-1 min-h-0 gap-px bg-[var(--nk-info-bg)] border border-[var(--nk-info)]"
        style={{
          gridTemplateColumns: `repeat(${viewPreview.length === 4 ? 2 : 4}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${viewPreview.length === 4 ? 2 : 3}, minmax(0, 1fr))`,
        }}
      >
        {viewPreview.map((view, index) => (
          <button
            key={index}
            aria-label={`视角 ${index + 1}`}
            aria-pressed={selectedViews.includes(index)}
            className="relative min-h-0 overflow-hidden bg-[var(--nk-input)]"
            onClick={() =>
              setSelectedViews((values) =>
                values.includes(index)
                  ? values.filter((value) => value !== index)
                  : [...values, index].sort((a, b) => a - b),
              )
            }
          >
            <img
              src={view.data}
              alt={`视角 ${index + 1} 预览`}
              className="w-full h-full object-contain"
              style={{ opacity: selectedViews.includes(index) ? 1 : 0.35 }}
            />
            <span className="absolute top-2 left-2 rounded bg-[var(--nk-surface)] px-2 py-1 text-xs text-[var(--nk-text)]">
              {selectedViews.includes(index) ? '✓ ' : ''}
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
function renderPanoramaStage(React: Runtime, state: ImageCropState, dependencies: Dependencies) {
  const { url, panoramaSize, saving, setFov, Boundary, sceneVersion, panoramaRatio,
    onSceneReady, fov, mirror, viewPreview, guides, ratioLabel,
  } = state;
  const { Canvas, Scene, toneMapping, colorSpace } = dependencies;
  return (
    <div
      className="relative flex items-center justify-center border-2 border-[var(--nk-info)] shadow-[0_0_0_9999px_rgba(0,0,0,0.6),0_0_20px_rgba(0,0,0,0.8)] rounded-sm"
      onWheel={(event) => {
        event.stopPropagation();
        if (!saving) setFov((value) => Math.max(30, Math.min(120, value + Math.sign(event.deltaY) * 3)));
      }}
      style={panoramaSize}
    >
      <Boundary key={url}>
        <Canvas
          key={sceneVersion}
          flat
          gl={{ preserveDrawingBuffer: true, toneMapping, outputColorSpace: colorSpace }}
          camera={{ fov: 75, near: 0.1, far: 1000 }}
        >
          <React.Suspense fallback={null}>
            <Scene
              url={url}
              targetRatio={panoramaRatio}
              onReady={onSceneReady}
              fov={fov}
              mirror={mirror}
            />
          </React.Suspense>
        </Canvas>
      </Boundary>
      {viewPreview.length > 0 && renderPanoramaViews(React, state)}
      {guides && (
        <div
          aria-label="全景参考线"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, transparent calc(33.333% - 0.5px), #ffffff70 33.333%, transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), #ffffff70 66.666%, transparent calc(66.666% + 0.5px)), linear-gradient(to bottom, transparent calc(33.333% - 0.5px), #ffffff70 33.333%, transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), #ffffff70 66.666%, transparent calc(66.666% + 0.5px))',
          }}
        />
      )}
      <div className="absolute top-2 left-2 text-[10px] text-[var(--nk-info)] font-mono bg-[var(--nk-surface)] px-1 rounded pointer-events-none">
        当前视角: {ratioLabel === 'Free' ? '16:9' : ratioLabel}
      </div>
    </div>
  );
}
function renderCropStage(_React: Runtime, state: ImageCropState, gestures: ImageCropGestures) {
  const { display, loaded, url, canvasRef, hover } = state;
  const size = { width: display.width + cropMargin * 2, height: display.height + cropMargin * 2 };
  return (
    <div className="relative shrink-0 select-none overflow-visible" style={size}>
      <div
        className="absolute rounded-lg overflow-hidden shadow-2xl bg-[var(--nk-input)]"
        style={{
          left: cropMargin,
          top: cropMargin,
          width: display.width,
          height: display.height,
          visibility: loaded ? 'visible' : 'hidden',
        }}
      >
        {url && (
          <img
            src={url}
            alt="Crop"
            className="block pointer-events-none"
            style={{ width: display.width, height: display.height }}
          />
        )}
      </div>
      <canvas
        ref={canvasRef}
        aria-label="裁切选择区域"
        className="absolute inset-0 cursor-crosshair touch-none z-10"
        style={{
          ...size,
          cursor:
            hover === 'column'
              ? 'col-resize'
              : hover === 'row'
                ? 'row-resize'
                : hover === 'move'
                  ? 'move'
                  : hover
                    ? 'pointer'
                    : 'crosshair',
        }}
        onPointerDown={gestures.pointerDown}
        onPointerMove={gestures.pointerMove}
        onPointerUp={gestures.pointerUp}
        onPointerCancel={gestures.pointerUp}
        onLostPointerCapture={gestures.pointerUp}
      />
    </div>
  );
}
export function renderImageCropStage(
  React: Runtime,
  state: ImageCropState,
  gestures: ImageCropGestures,
  dependencies: Dependencies,
) {
  const { Spinner } = dependencies;
  return (
    <div ref={state.stageRef} className="relative flex flex-1 min-h-0 items-center justify-center w-full overflow-hidden">
      {!state.loaded && !state.error && (
        <Spinner size={40} className="animate-spin text-[var(--nk-text-muted)]" />
      )}
      {state.loaded && state.panorama
        ? renderPanoramaStage(React, state, dependencies)
        : renderCropStage(React, state, gestures)}
    </div>
  );
}
