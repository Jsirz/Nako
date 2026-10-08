import { RotateCcw, FlipHorizontal, Grid2X2, Maximize, Camera, LogOut } from 'lucide-react';
import { cropRatios } from './imageCropGeometry';
import type { GridOrder } from './gridExport';
import type { Dependencies, Runtime } from './canvasImageCropTypes';
import type { ImageCropState } from './useCanvasImageCropState';
import type { ImageCropSave } from './imageCropSave';

const sliderClass = 'w-20 h-1 bg-[var(--nk-surface-raised)] rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed';
function renderDivider(_React: Runtime) {
  return <div className="shrink-0 bg-[var(--nk-surface-raised)] w-[1px] h-6 mx-1" />;
}
function renderCropSliders(
  _React: Runtime,
  controls: Array<{ label: string; value: number; onChange(value: number): void }>,
  panorama: boolean,
  min: number,
  max: number,
) {
  return (
    <div className="flex items-center gap-3 px-3">
      {controls.map((control) => (
        <label key={control.label} className={`flex items-center gap-2 ${panorama ? 'opacity-40' : ''}`}>
          <span className="text-[10px] text-[var(--nk-text-muted)] font-bold whitespace-nowrap">{control.label}</span>
          <input
            aria-label={control.label}
            type="range"
            min={min}
            max={max}
            value={control.value}
            disabled={panorama}
            onChange={(event) => control.onChange(Number(event.target.value))}
            className={sliderClass}
          />
          <span className="text-[10px] text-[var(--nk-info)] font-mono w-6">{control.value}</span>
        </label>
      ))}
    </div>
  );
}
function renderGridControls(React: Runtime, state: ImageCropState) {
  const { order, setOrder, exportSelection, setExportSelection, rows, columns, changeRows,
    changeColumns, rowGap, columnGap, setRowGap, setColumnGap, restoreGrid, panorama, grid,
  } = state;
  return (
    <>
      <select
        aria-label="宫格预设"
        defaultValue=""
        onChange={(event) => {
          if (!event.target.value) return;
          const [cols, lines] = event.target.value.split('x').map(Number);
          state.setRows(lines);
          state.setColumns(cols);
          restoreGrid(lines, cols);
          setExportSelection('');
        }}
        className="bg-[var(--nk-surface-raised)] text-xs p-2 rounded"
      >
        <option value="" disabled>选择宫格</option>
        {['2x2', '3x3', '3x4', '4x3', '1x4', '4x1'].map((value) => (
          <option key={value} value={value}>{value.replace('x', ' × ')}</option>
        ))}
      </select>
      <select
        aria-label="输出顺序"
        value={order}
        onChange={(event) => setOrder(event.target.value as GridOrder)}
        className="bg-[var(--nk-surface-raised)] text-xs p-2 rounded"
      >
        <option value="row">逐行</option>
        <option value="column">逐列</option>
        <option value="snake">蛇形</option>
        <option value="reverse">倒序</option>
      </select>
      <input
        aria-label="导出格子序号"
        value={exportSelection}
        onChange={(event) => setExportSelection(event.target.value)}
        placeholder="全部 / 1,3,5-8"
        className="bg-[var(--nk-surface-raised)] text-xs p-2 rounded w-28"
      />
      {renderCropSliders(React, [
        { label: '横向分割', value: columns, onChange: changeColumns },
        { label: '竖向分割', value: rows, onChange: changeRows },
      ], panorama, 1, 5)}
      {renderDivider(React)}
      {renderCropSliders(React, [
        { label: '横向间隙', value: rowGap, onChange: setRowGap },
        { label: '竖向间隙', value: columnGap, onChange: setColumnGap },
      ], panorama, 0, 100)}
      {renderDivider(React)}
      <button
        onClick={() => restoreGrid()}
        disabled={panorama || !grid}
        title="恢复默认等分，并让裁切范围重新铺满原图"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)] border-transparent hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-text)] disabled:opacity-40"
      >
        恢复等分
      </button>
      {renderDivider(React)}
    </>
  );
}
function renderPanoramaControls(_React: Runtime, state: ImageCropState, save: ImageCropSave) {
  const { props, panoramaReady, fov, setFov, mirror, setMirror, guides, setGuides, setSceneVersion, rootRef, setError } = state;
  return (
    <>
      <button className="px-2 py-1 text-xs flex items-center gap-1" onClick={props.onClose}>
        <LogOut size={14} />退出
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        disabled={!panoramaReady}
        onClick={() => void save(4, true)}
      >
        <Grid2X2 size={14} />
        4视角预览
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        disabled={!panoramaReady}
        onClick={() => void save(12, true)}
      >
        <Camera size={14} />
        12视角预览
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        onClick={() => {
          setFov(75);
          setMirror(false);
          setSceneVersion((value) => value + 1);
        }}
      >
        <RotateCcw size={14} />重置
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        aria-pressed={mirror}
        onClick={() => setMirror(!mirror)}
      >
        <FlipHorizontal size={14} />
        镜像
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        aria-pressed={guides}
        onClick={() => setGuides(!guides)}
      >
        <Grid2X2 size={14} />
        参考线
      </button>
      <button
        className="px-2 py-1 text-xs flex items-center gap-1"
        onClick={() => {
          const request = document.fullscreenElement
            ? document.exitFullscreen()
            : rootRef.current?.requestFullscreen();
          void request?.catch(() => setError('当前窗口不支持全屏。'));
        }}
      >
        <Maximize size={14} />全屏
      </button>
      <label className="flex items-center gap-2 text-xs text-[var(--nk-text-secondary)]">
        视野
        <input
          aria-label="全景视野"
          type="range"
          min="30"
          max="120"
          value={fov}
          onChange={(event) => setFov(Number(event.target.value))}
        />
        {fov}°
      </label>
    </>
  );
}
function renderRatioControl(_React: Runtime, state: ImageCropState, { Chevron }: Dependencies) {
  const { ratioOpen, setRatioOpen, ratioLabel, selectRatio } = state;
  return (
    <div className="relative">
      <button
        onClick={() => setRatioOpen(!ratioOpen)}
        aria-expanded={ratioOpen}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${ratioLabel !== 'Free' ? 'bg-[var(--nk-info-bg)] text-[var(--nk-info)] border-[var(--nk-info)]' : 'bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)] border-transparent hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-text)]'}`}
      >
        <span>{ratioLabel === 'Free' ? '自由比例' : ratioLabel === 'Original' ? '原图比例' : ratioLabel}</span>
        <Chevron size={14} className={ratioOpen ? 'rotate-180' : ''} />
      </button>
      {ratioOpen && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-32 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg shadow-2xl py-1.5 z-50 max-h-64 overflow-y-auto custom-scrollbar">
          {['Original', 'Free', ...cropRatios].map((label) => (
            <button
              key={label}
              onClick={() => selectRatio(label)}
              className={`w-full text-left px-4 py-2 text-xs transition-colors ${ratioLabel === label ? 'bg-[var(--nk-info-bg)] text-[var(--nk-info)] font-bold' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-text)]'}`}
            >
              {label === 'Original' ? '原图比例' : label === 'Free' ? '自由比例' : label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function renderImageCropToolbar(
  React: Runtime,
  state: ImageCropState,
  save: ImageCropSave,
  dependencies: Dependencies,
) {
  const { saving, loaded, panorama, props, invalidSelection, crop, panoramaReady, viewPreview,
    selectedViews, grid, progress, rows, columns,
  } = state;
  const { Spinner, Save } = dependencies;
  return (
    <div
      className="relative z-50 flex shrink-0 items-center justify-center gap-2 w-full pr-14"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <fieldset
        disabled={saving || !loaded}
        className="flex min-h-11 items-center gap-1 px-2 py-1.5 rounded-full bg-[var(--nk-surface-raised)] backdrop-blur shadow-lg border border-[var(--nk-border)]"
        style={{ flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <strong className="px-3 text-xs text-[var(--nk-text)]">
          {panorama ? '3D 全景' : props.variant === 'grid' ? '宫格裁剪' : '裁剪'}
        </strong>
        {panorama && renderPanoramaControls(React, state, save)}
        {props.variant === 'grid' && renderGridControls(React, state)}
        {renderRatioControl(React, state, dependencies)}
        {renderDivider(React)}
        <button
          onClick={() => void save()}
          disabled={
            saving ||
            !!invalidSelection ||
            !loaded ||
            (!panorama && (!crop || crop.width <= 0 || crop.height <= 0)) ||
            (panorama &&
              (!panoramaReady || (viewPreview.length > 0 && selectedViews.length === 0)))
          }
          aria-label={panorama ? (viewPreview.length ? '导出所选视角' : '截图') : '保存裁切图片'}
          className="flex items-center justify-center bg-[var(--nk-info-bg)] text-[var(--nk-text)] h-8 rounded-full px-4 gap-2 text-xs font-bold hover:bg-[var(--nk-info-bg)] disabled:opacity-50 transition-colors"
        >
          {saving ? <Spinner size={16} className="animate-spin" /> : <Save size={16} />}
          {panorama
            ? viewPreview.length
              ? `导出 ${selectedViews.length} 个视角`
              : '截图'
            : props.saveLabel}
          {saving && grid && !panorama ? ` ${progress}/${rows * columns}` : ''}
        </button>
      </fieldset>
    </div>
  );
}
