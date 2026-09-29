import { browserHost } from '../../../kernel/browser';
import { declaredModel, type DefaultModelsClient } from '../../../contracts/defaultModels.js';
import { useGenerationAvailability } from './useGenerationAvailability';
import {
  CreativeLibraryTools,
  CreativePromptTokens,
} from '../../../agent/api/ui/prompt/CreativeLibrary';
import { rememberNodeDimensions } from './nodeCreationDimensions';
import {
  useComposerBusy,
  changeComposerModel,
  type ComposerRuntime,
  type MediaComposerProps,
  type MediaComposerComponents,
} from './mediaComposer';
import { installVideoModeAdapter } from '../../../generation-core/api/ui/generation/videoMode';
import { declaredNodeOutput } from '../../../contracts/nodeValues.js';
import { externalReferenceMedia } from '../../../generation-core/api/ui/generation/canvasGenerationRequests';
export function CanvasVideoComposer(
  React: ComposerRuntime,
  {
    data: node,
    isLoading = false,
    connectedImageNodes: assets = [],
    onUpdate,
    onGenerate,
    onSelect,
  }: MediaComposerProps,
  {
    models,
    ratios,
    resolutions,
    PromptEditor,
    ConnectedAssets,
    ModelSelector,
    Dimensions,
    AdvancedSettings,
    Tooltip,
    CollapseIcon,
    SettingsIcon,
    GenerateIcon,
  }: MediaComposerComponents,
) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false),
    [editing, setEditing] = React.useState(false);
  const model = models.find(
    (candidate) =>
      candidate.name ===
      (declaredModel('video', node) ||
        browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.get('video')),
  ) || {
    name:
      declaredModel('video', node) ||
      browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.get('video') ||
      '',
  };
  const external = externalReferenceMedia(node, model);
  const inputs = {
    images:
      assets.filter((asset) => ['Image', 'Upload Image'].includes(asset.type)).length +
      external.filter((input) => input.kind === 'image').length,
    videos:
      assets.filter((asset) => ['Video', 'Upload Video'].includes(asset.type)).length +
      external.filter((input) => input.kind === 'video').length,
    audios:
      assets.filter((asset) => ['Audio', 'Upload Audio'].includes(asset.type)).length +
      external.filter((input) => input.kind === 'audio').length,
  };
  const videoModes = installVideoModeAdapter(),
    selectableModes = model.videoModes || [];
  const effectiveMode = videoModes.resolve(node.videoMode, inputs, selectableModes),
    modeKnown = videoModes.supports(selectableModes, effectiveMode),
    modeAllowed = videoModes.allowed(effectiveMode, inputs, selectableModes),
    modeSupported = modeKnown && modeAllowed;
  const modeWarning = !modeKnown
    ? inputs.images === 0
      ? '当前模型不支持文生视频'
      : '当前模型不支持选定的生成模式'
    : !modeAllowed
      ? '当前模式需要先连接相应素材'
      : '';
  const modeDefinition = selectableModes.find((mode) => mode.value === effectiveMode);
  const fixedDuration =
    modeDefinition?.fixedDuration ??
    (model.fixedDuration != null &&
    Number.isFinite(Number(model.fixedDuration)) &&
    Number(model.fixedDuration) > 0
      ? Number(model.fixedDuration)
      : null);
  const declaredDuration = model.advancedParams?.find((parameter) => parameter.key === 'duration');
  const resolutionMinimum =
    model.durationMinByResolution?.[
      (node.resolution || model.resolutions?.[0] || '720p').toLowerCase()
    ];
  const durationParam =
    declaredDuration && resolutionMinimum != null
      ? { ...declaredDuration, min: Math.max(declaredDuration.min ?? 0, resolutionMinimum) }
      : declaredDuration;
  const remainingParams =
    model.advancedParams?.filter(
      (parameter) => !['duration', 'generate_audio'].includes(parameter.key),
    ) || [];
  const minimum = Number.isFinite(Number(durationParam?.min))
      ? Number(durationParam?.min)
      : -Infinity,
    maximum = Number.isFinite(Number(durationParam?.max)) ? Number(durationParam?.max) : Infinity;
  const requested = node.duration ?? durationParam?.default ?? 4;
  const duration =
    fixedDuration ??
    Math.min(
      maximum,
      Math.max(
        minimum,
        Number.isFinite(Number(requested))
          ? Number(requested)
          : Number(durationParam?.default ?? 4),
      ),
    );
  React.useEffect(() => {
    if (modeDefinition?.fixedDuration === undefined && node.duration !== duration)
      onUpdate(node.id, { duration });
  }, [node.id, node.duration, duration, modeDefinition?.fixedDuration, onUpdate]);
  const busy = useComposerBusy(React, node.id, isLoading);
  const hasInput = !!node.prompt?.trim() || assets.some((asset) => {
    const output = declaredNodeOutput(asset);
    if (asset.type.toLowerCase() !== 'text' && output?.kind !== 'text') return false;
    const value = output?.value ?? asset.textContent;
    return typeof value === 'string' && !!value.trim();
  });
  const { checking, blocked, warning } = useGenerationAvailability(
    React,
    model.name,
    effectiveMode,
  );
  const disabled = busy || !hasInput || checking || blocked || !modeSupported;
  const changeModel = (name: string) => {
    const next = models.find((candidate) => candidate.name === name);
    if (next && !busy)
      onUpdate(node.id, changeComposerModel('video', node, next, ratios, resolutions));
  };

  return (
    <div
      data-nako-generation-composer={'video'}
      data-nako-effective-video-mode={effectiveMode}
      data-nako-video-mode-supported={modeSupported ? 'true' : 'false'}
      className={
        'p-2.5 rounded-lg shadow-2xl cursor-default w-full transition-colors duration-300 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)]'
      }
      onPointerDown={(J) => {
        if (J.button !== 1) J.stopPropagation();
      }}
      onContextMenu={(J) => J.stopPropagation()}
      onDoubleClick={(J) => J.stopPropagation()}
      onClick={() => onSelect(node.id)}
    >
      {selectableModes.length > 0 && (
        <div
          data-nako-video-mode-tabs={'true'}
          role={'tablist'}
          aria-label={'生成模式'}
          style={{
            display: 'inline-flex',
            alignSelf: 'flex-start',
            alignItems: 'center',
            gap: '2px',
            marginBottom: '8px',
            padding: '2px',
            border: '1px solid var(--nk-border)',
            borderRadius: '8px',
            background: 'var(--nk-input)',
          }}
          onKeyDown={(J) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(J.key)) return;
            const ee = [
              ...J.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
            ];
            if (ee.length === 0) return;
            const te = ee.findIndex((button) => button === document.activeElement);
            let W = te < 0 ? 0 : te;
            W =
              J.key === 'Home'
                ? 0
                : J.key === 'End'
                  ? ee.length - 1
                  : J.key === 'ArrowRight'
                    ? (W + 1) % ee.length
                    : (W - 1 + ee.length) % ee.length;
            J.preventDefault();
            J.stopPropagation();
            ee[W]?.focus();
            ee[W]?.click();
          }}
        >
          {selectableModes.map((J) => {
            const ee = videoModes?.allowed(J.value, inputs, selectableModes) ?? !0,
              te = effectiveMode === J.value;
            return (
              <button
                type={'button'}
                role={'tab'}
                aria-selected={te}
                tabIndex={te ? 0 : -1}
                disabled={busy || !ee}
                title={ee ? J.label : '连接相应素材后可用'}
                onClick={() => {
                  if (!busy && ee) onUpdate(node.id, { videoMode: J.value });
                }}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  border: 0,
                  borderRadius: '6px',
                  background: te ? 'var(--nk-primary)' : 'transparent',
                  color: te ? 'var(--nk-on-primary)' : 'var(--nk-text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  opacity: busy || !ee ? 0.35 : 1,
                  cursor: busy || !ee ? 'not-allowed' : 'pointer',
                  transition: 'background-color 140ms ease,color 140ms ease,opacity 140ms ease',
                }}
                key={J.value}
              >
                {J.label || videoModes?.label(J.value) || J.value}
              </button>
            );
          })}
        </div>
      )}
      {modeDefinition?.referenceVideoDuration && (
        <p className="mb-2 text-xs text-[var(--nk-text-muted)]" role="status">
          编辑模式跟随原视频比例和时长；参考视频须为 {modeDefinition.referenceVideoDuration.min}～
          {modeDefinition.referenceVideoDuration.max} 秒。
        </p>
      )}
      <ConnectedAssets
        node={node}
        disabled={busy}
        connectedImageNodes={assets}
        onUpdate={onUpdate}
      />
      <div
        className={`mb-1 relative group/prompt overflow-hidden prompt-editor-container custom-scrollbar ${editing ? 'is-prompt-editing cursor-text' : 'cursor-pointer'}`}
        onClick={(J) => {
          J.stopPropagation();
          setEditing(true);
        }}
      >
        <CreativePromptTokens data={node} onUpdate={onUpdate} disabled={busy} />
        <PromptEditor
          type={'video'}
          value={node.prompt || ''}
          onChange={(J) => onUpdate(node.id, { prompt: J })}
          connectedAssets={assets || []}
          isDark={!0}
          disableDirectEdit={!editing}
          onBlur={() => setEditing(!1)}
          key={`mention-editor-${node.id}`}
        />
      </div>
      <CreativeLibraryTools data={node} onUpdate={onUpdate} disabled={busy} />
      {node.errorMessage && (
        <div
          className={
            'text-[var(--nk-danger)] text-xs mb-2 p-1 bg-red-900/20 rounded border border-red-900/50'
          }
        >
          {node.errorMessage}
        </div>
      )}
      {!node.errorMessage && !modeSupported && (
        <div
          role={'status'}
          className={
            'text-[var(--nk-warning)] text-xs mb-2 p-1 bg-amber-900/20 rounded border border-amber-900/40'
          }
        >
          {modeWarning}
        </div>
      )}
      {!node.errorMessage && modeSupported && warning && (
        <div
          className={
            'text-[var(--nk-warning)] text-xs mb-2 p-1 bg-amber-900/20 rounded border border-amber-900/40'
          }
        >
          {warning}
        </div>
      )}
      <div className={'flex items-center justify-between w-full p-0 h-9'}>
        <div className={'flex items-center gap-0.5 min-w-0 h-full'}>
          <ModelSelector
            isVideoNode={!0}
            currentModel={model}
            availableModels={models}
            disabled={busy}
            onModelChange={changeModel}
          />
          <div className={'w-px h-3.5 bg-[var(--nk-surface-raised)]'} />
        </div>
        <div className={'relative flex items-center gap-1 h-full'}>
          <Dimensions
            videoSettings={{
              duration,
              parameter: durationParam,
              fixed: fixedDuration !== null || !durationParam,
              // Preserve the existing composer audio toggle and its default.
              audio: node.generate_audio !== false,
            }}
            data={
              modeDefinition?.fixedAspectRatio
                ? { ...node, aspectRatio: modeDefinition.fixedAspectRatio }
                : node
            }
            onUpdate={(patch) => {
              if (busy) return;
              onUpdate(node.id, patch);
              rememberNodeDimensions('Video', node.projectId, { ...node, ...patch });
            }}
            disabled={busy}
            allRatios={
              modeDefinition?.fixedAspectRatio
                ? [modeDefinition.fixedAspectRatio]
                : model.aspectRatios || ratios
            }
            supportedRatios={
              modeDefinition?.fixedAspectRatio
                ? [modeDefinition.fixedAspectRatio]
                : model.aspectRatios || ratios
            }
            allResolutions={model.resolutions || resolutions}
            supportedResolutions={model.resolutions || resolutions}
            isDark={!0}
          />
          {remainingParams.length > 0 && (
            <Tooltip text={'高级设置'}>
              <button
                onClick={() => !busy && setAdvancedOpen(!advancedOpen)}
                disabled={busy}
                className={`flex items-center justify-center rounded-lg h-8 px-2 transition-all ${busy ? 'opacity-50 text-[var(--nk-text-muted)]' : 'hover:bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)]'} ${advancedOpen ? 'bg-blue-500/20 text-[var(--nk-info)] shadow-inner scale-95' : ''}`}
              >
                {advancedOpen ? <CollapseIcon size={15} /> : <SettingsIcon size={15} />}
              </button>
            </Tooltip>
          )}
          <div className={'w-px h-3.5 bg-[var(--nk-surface-raised)] shrink-0'} />
          <div className={'flex items-center gap-1 h-full'}>
            <button
              onClick={(J) => {
                J.stopPropagation();
                if (!disabled) onGenerate(node.id);
              }}
              disabled={disabled}
              className={`aspect-square w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${busy ? 'bg-[var(--nk-hover)] text-[var(--nk-text-muted)] cursor-wait' : !hasInput || checking || blocked ? 'bg-[var(--nk-selected)] text-[var(--nk-text-muted)] cursor-not-allowed' : 'bg-[var(--nk-primary)] text-[var(--nk-on-primary)] hover:opacity-90'}`}
            >
              {busy ? (
                <div
                  className={
                    'w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin'
                  }
                />
              ) : (
                <GenerateIcon size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
      {advancedOpen && remainingParams.length > 0 && (
        <AdvancedSettings
          data={node}
          isVideoNode={!0}
          currentModel={{ ...model, advancedParams: remainingParams }}
          connectedImageNodes={assets}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
