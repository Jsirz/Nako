import type * as ReactTypes from 'react';
import {
  useComposerBusy,
  type ComposerRuntime,
  type MediaComposerComponents,
} from './mediaComposer';
interface Parameter {
  key: string;
  label: string;
  type: string;
  default?: unknown;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number | boolean; label: string }[];
}
interface AdvancedProps {
  data: { id: string; status?: string; [key: string]: unknown };
  currentModel: { canonicalModel?: string; advancedParams?: Parameter[] };
  onUpdate(id: string, patch: Record<string, unknown>): void;
}
const controlValue = (value: unknown) =>
  typeof value === 'number' || typeof value === 'string' ? value : '';
export function CanvasAdvancedSettings(
  React: ComposerRuntime,
  { data, currentModel, onUpdate }: AdvancedProps,
) {
  const busy = useComposerBusy(React, data.id, data.status === 'loading');
  const [showMore, setShowMore] = React.useState(false);
  const isMidjourney = currentModel.canonicalModel === 'Midjourney Imagine';
  const coreKeys = new Set(['generateCount', 'version', 'speed', 'quality', 'seed']);
  const visibleParams = (currentModel.advancedParams || []).filter(
    (parameter) => !isMidjourney || showMore || coreKeys.has(parameter.key),
  );
  return (
    <div
      className="mt-2 pt-2 border-t border-[var(--nk-border)]"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        className="grid grid-cols-2 gap-x-3 gap-y-2 max-h-[420px] overflow-y-auto pr-1"
        data-nako-advanced-grid
      >
        {visibleParams.map((parameter) => {
          const value = data[parameter.key] ?? parameter.default;
          const max =
            parameter.key === 'duration' && currentModel.canonicalModel === 'Seedance 2.5'
              ? 30
              : parameter.max;
          const update = (next: unknown) => {
            if (!busy) onUpdate(data.id, { [parameter.key]: next });
          };
          const numeric = (event: ReactTypes.ChangeEvent<HTMLInputElement>) => {
            if (!event.target.value) {
              update(undefined);
              return;
            }
            const next = Number(event.target.value);
            if (Number.isFinite(next)) update(next);
          };
          return (
            <div
              className={`space-y-0.5 px-1 ${parameter.type === 'select' || parameter.type === 'text' ? 'col-span-2' : 'col-span-1'}`}
              key={parameter.key}
            >
              <div className="flex justify-between items-center">
                <label className="text-[10px] text-[var(--nk-text-muted)] font-medium uppercase tracking-wider">
                  {parameter.label}
                </label>
                {parameter.type === 'slider' && (
                  <span className="text-[10px] text-[var(--nk-text)] font-bold bg-[var(--nk-surface-raised)] px-1.5 py-0.5 rounded min-w-[24px] text-center">
                    {controlValue(value)}
                    {parameter.unit || ''}
                  </span>
                )}
              </div>
              {parameter.type === 'slider' ? (
                <input
                  type="range"
                  aria-label={parameter.label}
                  min={parameter.min}
                  max={max}
                  step={parameter.step || 1}
                  value={controlValue(value)}
                  disabled={busy}
                  onChange={numeric}
                  className="w-full h-1 bg-[var(--nk-surface-raised)] rounded-full appearance-none cursor-pointer accent-blue-500"
                />
              ) : parameter.type === 'toggle' ? (
                <button
                  type="button"
                  role="switch"
                  aria-label={parameter.label}
                  aria-checked={!!value}
                  disabled={busy}
                  onClick={() => update(!value)}
                  className={`relative w-8 h-4 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-[var(--nk-border-control)]'}`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 bg-[var(--nk-media-text)] rounded-full transition-transform shadow-md ${value ? 'left-4' : 'left-0.5'}`}
                  />
                </button>
              ) : parameter.type === 'select' ? (
                <div
                  role="group"
                  aria-label={parameter.label}
                  className="flex flex-wrap gap-1 p-0.5 bg-[var(--nk-input)] rounded-lg"
                >
                  {parameter.options?.map((option) => (
                    <button
                      type="button"
                      key={String(option.value)}
                      disabled={busy}
                      aria-pressed={value === option.value}
                      onClick={() => update(option.value)}
                      className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-md transition-all ${value === option.value ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)] shadow-sm' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)] hover:text-[var(--nk-text)]'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : parameter.type === 'number' || parameter.type === 'text' ? (
                <input
                  type={parameter.type}
                  aria-label={parameter.label}
                  min={parameter.min}
                  max={max}
                  step={parameter.step || 1}
                  value={controlValue(value)}
                  disabled={busy}
                  onChange={
                    parameter.type === 'number' ? numeric : (event) => update(event.target.value)
                  }
                  placeholder={parameter.placeholder || '请输入' + parameter.label}
                  className="w-full rounded-md border border-[var(--nk-border-control)] bg-[var(--nk-input)] px-2 py-1 text-[11px] text-[var(--nk-text)] outline-none focus:border-blue-500"
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {isMidjourney &&
        currentModel.advancedParams &&
        currentModel.advancedParams.length > coreKeys.size && (
          <button
            type="button"
            className="mt-2 w-full rounded-md border border-[var(--nk-border)] bg-[var(--nk-input)] py-1 text-[11px] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]"
            onClick={() => setShowMore((value) => !value)}
          >
            {showMore
              ? '收起更多参数'
              : `展开更多参数（${currentModel.advancedParams.length - coreKeys.size}）`}
          </button>
        )}
    </div>
  );
}
interface DimensionProps {
  data: { aspectRatio?: string; resolution?: string };
  videoSettings?: ReactTypes.ComponentProps<MediaComposerComponents['Dimensions']>['videoSettings'];
  onUpdate(patch: {
    aspectRatio?: string;
    resolution?: string;
    duration?: number;
    generate_audio?: boolean;
  }): void;
  allRatios: string[];
  supportedRatios: string[];
  allResolutions: string[];
  supportedResolutions: string[];
  isDark?: boolean;
  disabled?: boolean;
}
export function CanvasDimensions(
  React: ComposerRuntime,
  props: DimensionProps,
) {
  const state = useDimensionMenu(React, props.disabled);
  return renderDimensions(React, props, state);
}

function useDimensionMenu(React: ComposerRuntime, disabled: boolean | undefined) {
  const [open, setOpen] = React.useState(false),
    root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  React.useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);
  return { open, setOpen, root };
}

function renderDimensions(
  React: ComposerRuntime,
  { data, onUpdate, allRatios, supportedRatios, allResolutions, supportedResolutions,
    disabled, videoSettings }: DimensionProps,
  { open, setOpen, root }: ReturnType<typeof useDimensionMenu>,
) {
  const ratio =
    data.aspectRatio && data.aspectRatio !== 'Auto'
      ? data.aspectRatio
      : supportedRatios[0] || '1:1';
  const resolution =
    data.resolution && data.resolution !== 'Auto'
      ? data.resolution
      : supportedResolutions[0] || '1K';
  const preview = (ratio: string, active: boolean, unavailable?: boolean) => {
    const [width, height] = ratio.split(/[:x]/i).map(Number);
    const aspect = width > 0 && height > 0 && Number.isFinite(width / height) ? width / height : 1;
    return (
      <div
        className={`border-2 rounded-sm transition-colors ${active ? 'border-[var(--nk-text)]' : unavailable ? 'border-[var(--nk-border)]' : 'border-[var(--nk-border-control)]'}`}
        style={{ width: 18 * Math.min(1, aspect), height: 18 * Math.min(1, 1 / aspect) }}
      />
    );
  };
  return (
    <div
      className="relative"
      ref={root}
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          root.current?.querySelector('button')?.focus();
        }
      }}
    >
      <button
        aria-label={videoSettings ? '视频生成参数' : '比例与画质'}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        className={`inline-flex items-center justify-center h-8 gap-1.5 px-2 py-1 text-sm rounded-lg transition-colors ${disabled ? 'opacity-50 text-[var(--nk-text-muted)]' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] active:bg-[var(--nk-hover)]'} ${open ? 'bg-[var(--nk-hover)]' : ''}`}
      >
        {preview(ratio, true, disabled)}
        <span className="whitespace-nowrap">
          {ratio === 'adaptive' ? '原视频比例' : ratio} · {resolution}
          {videoSettings &&
            (videoSettings.duration === -1 ? ' · 原视频时长' : ` · ${videoSettings.duration}秒`)}
          {videoSettings?.audio !== undefined && ` · ${videoSettings.audio ? '有声' : '静音'}`}
        </span>
      </button>
      {open && (
        <div
          onKeyDown={(event) => {
            if (event.key !== 'Escape') event.stopPropagation();
          }}
          style={{ maxHeight: 'min(520px, 70vh)', overflowY: 'auto' }}
          data-nk-node-parameters
          onWheel={(event) => event.stopPropagation()}
          className="absolute bottom-full mb-2 right-0 w-[320px] p-3 rounded-lg shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 bg-[var(--nk-surface-raised)] text-[var(--nk-text)] border border-[var(--nk-border-control)]"
        >
          <div className="mb-3">
            <div className="text-[10px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest mb-1.5 px-1">
              分辨率
            </div>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg w-full bg-[var(--nk-input)]">
              {allResolutions.map((value) => {
                const supported = supportedResolutions.includes(value);
                return (
                  <button
                    key={value}
                    disabled={disabled || !supported}
                    aria-pressed={resolution === value}
                    onClick={() => {
                      if (!disabled && supported) onUpdate({ resolution: value });
                    }}
                    className={`flex-1 py-1.5 text-[12px] font-bold rounded-md transition-all duration-200 ${supported ? '' : 'opacity-40 cursor-not-allowed'} ${resolution === value ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)] shadow-sm' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)] hover:text-[var(--nk-text)]'}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
          {videoSettings && (
            <div className="mb-3 space-y-2 px-1">
              <div className="flex justify-between text-xs text-[var(--nk-text-secondary)]">
                <span>生成时长</span>
                <span>
                  {videoSettings.duration === -1
                    ? '跟随原视频'
                    : `${videoSettings.duration} 秒${videoSettings.fixed ? '（固定）' : ''}`}
                </span>
              </div>
              {!videoSettings.fixed &&
                videoSettings.parameter &&
                (videoSettings.parameter.type === 'select' ? (
                  <select
                    aria-label="生成时长"
                    disabled={disabled}
                    value={videoSettings.duration}
                    className="w-full rounded-md bg-[var(--nk-surface-raised)] p-2 text-xs text-[var(--nk-text)]"
                    onChange={(event) => {
                      if (!disabled) onUpdate({ duration: Number(event.target.value) });
                    }}
                  >
                    {videoSettings.parameter.options?.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label="生成时长"
                    type={videoSettings.parameter.type === 'slider' ? 'range' : 'number'}
                    min={videoSettings.parameter.min}
                    max={videoSettings.parameter.max}
                    step={videoSettings.parameter.step || 1}
                    value={videoSettings.duration}
                    disabled={disabled}
                    className="w-full accent-[var(--nk-focus)] bg-[var(--nk-input)] text-[var(--nk-text)] rounded-md"
                    onChange={(event) => {
                      if (disabled || !event.target.value) return;
                      const value = Number(event.target.value);
                      if (Number.isFinite(value))
                        onUpdate({
                          duration: Math.min(
                            videoSettings.parameter?.max ?? Infinity,
                            Math.max(videoSettings.parameter?.min ?? -Infinity, value),
                          ),
                        });
                    }}
                  />
                ))}
            </div>
          )}
          {videoSettings?.audio !== undefined && (
            <div role="group" aria-label="生成视频音频" className="mb-3 px-1">
              <div className="text-xs text-[var(--nk-text-secondary)] mb-2">生成视频音频</div>
              <div className="flex rounded-lg bg-[var(--nk-input)] p-1">
                {[true, false].map((value) => (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={disabled}
                    aria-pressed={videoSettings.audio === value}
                    className={`flex-1 py-1.5 rounded-md text-xs ${videoSettings.audio === value ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)]' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)]'}`}
                    onClick={() => {
                      if (!disabled) onUpdate({ generate_audio: value });
                    }}
                  >
                    {value ? '是' : '否'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest mb-1.5 px-1">
              比例
            </div>
            <div className="grid grid-cols-5 gap-1.5 p-1 rounded-lg bg-[var(--nk-input)]">
              {allRatios.map((value) => {
                const supported = supportedRatios.includes(value);
                return (
                  <button
                    key={value}
                    disabled={disabled || !supported}
                    aria-pressed={ratio === value}
                    onClick={() => {
                      if (!disabled && supported) onUpdate({ aspectRatio: value });
                    }}
                    className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg transition-all duration-200 ${supported ? '' : 'opacity-40 cursor-not-allowed'} ${ratio === value ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)] shadow-sm' : 'hover:bg-[var(--nk-hover)] text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'}`}
                  >
                    {preview(value, ratio === value, !supported)}
                    <span className="text-[10px] font-bold leading-none">
                      {value === 'adaptive' ? '原视频比例' : value}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
