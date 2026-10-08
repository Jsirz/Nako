import { browserHost } from '../../../kernel/browser';
import { declaredModel, type DefaultModelsClient } from '../../../contracts/defaultModels.js';
import { useGenerationAvailability } from './useGenerationAvailability';
import {
  CreativeLibraryTools,
  CreativePromptTokens,
  MjStyleStatus,
} from '../../../agent/api/ui/prompt/CreativeLibrary';
import { ImageAngleControl } from '../../../agent/api/ui/prompt/ImageAngleControl';
import { rememberNodeDimensions } from './nodeCreationDimensions';
import {
  useComposerBusy,
  changeComposerModel,
  type ComposerRuntime,
  type MediaComposerProps,
  type MediaComposerComponents,
} from './mediaComposer';
import {
  isAutomaticImageMode,
  resolveImageGenerationMode,
  supportsImageGenerationMode,
} from '../../../generation-core/api/ui/generation/imageMode';
import { installMidjourneyReferenceAdapter } from '../../../generation-core/api/ui/generation/midjourneyReferences';
const imageModes = { isAutomatic: isAutomaticImageMode };
export function CanvasImageComposer(
  React: ComposerRuntime,
  props: MediaComposerProps,
  components: MediaComposerComponents,
) {
  const state = useImageComposerState(React, props, components);
  return renderImageComposer(React, props, components, state);
}

function useImageComposerState(React: ComposerRuntime, props: MediaComposerProps, components: MediaComposerComponents) {
  const { data: node, isLoading = false, connectedImageNodes: assets = [], onUpdate } = props;
  const { models, ratios, resolutions } = components;
  const [advancedOpen, setAdvancedOpen] = React.useState(false),
    [modeOpen, setModeOpen] = React.useState(false),
    [editing, setEditing] = React.useState(false);
  const modeRoot = React.useRef<HTMLDivElement>(null);
  const model = models.find(
    (candidate) =>
      candidate.name ===
      (declaredModel('image', node) ||
        browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.get('image')),
  ) || {
    name:
      declaredModel('image', node) ||
      browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.get('image') ||
      '',
  };
  const hasImageInput = assets.some(
    (asset) => asset.type === 'Image' || asset.type === 'Upload Image',
  );
  const effectiveMode = resolveImageGenerationMode(node.imageMode, hasImageInput);
  const specialModes = (model.imageModes || []).filter((mode) => !isAutomaticImageMode(mode.value));
  const modeSupported = supportsImageGenerationMode(model.imageModes, effectiveMode);
  const modeWarning = modeSupported
    ? ''
    : hasImageInput
      ? '当前模型不支持图片输入'
      : '当前模型不支持文生图';
  const busy = useComposerBusy(React, node.id, isLoading);
  const { checking, blocked, warning } = useGenerationAvailability(
    React,
    model.name,
    effectiveMode,
  );
  const count = node.generateCount || 1;
  const hasInput =
    !!node.imageAngle ||
    !!(node.prompt || '').trim() ||
    assets.some(
      (asset) => asset.type === 'Text' && !!(asset.textContent || asset.prompt || '').trim(),
    );
  const disabled = busy || !hasInput || checking || blocked || !modeSupported;
  const references = installMidjourneyReferenceAdapter();
  const referenceOptions = assets.filter(
    (asset) => asset.type === 'Image' || asset.type === 'Upload Image',
  );
  const assignments = references.assignments(node, referenceOptions);
  const modeLabel =
    model.imageModes?.find((mode) => mode.value === effectiveMode)?.label ||
    model.imageModes?.[0]?.label ||
    null;
  React.useEffect(() => {
    if (!modeOpen) return;
    const close = (event: MouseEvent) => {
      if (event.target instanceof Node && !modeRoot.current?.contains(event.target))
        setModeOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [modeOpen]);
  const changeModel = (name: string) => {
    const next = models.find((candidate) => candidate.name === name);
    if (next && !busy)
      onUpdate(node.id, changeComposerModel('image', node, next, ratios, resolutions));
  };

  return { advancedOpen, setAdvancedOpen, modeOpen, setModeOpen, editing, setEditing, modeRoot,
    model, hasImageInput, effectiveMode, specialModes, modeSupported, modeWarning, busy,
    checking, blocked, warning, count, hasInput, disabled, references, referenceOptions,
    assignments, modeLabel, changeModel };
}

function renderImageComposer(
  React: ComposerRuntime, props: MediaComposerProps, components: MediaComposerComponents,
  state: ReturnType<typeof useImageComposerState>,
) {
  const { data: node, readOnly = false, connectedImageNodes: assets = [], onUpdate, onGenerate, onSelect } = props;
  const { models, ratios, resolutions, PromptEditor, ConnectedAssets, ModelSelector, Dimensions,
    AdvancedSettings, Tooltip, CollapseIcon, SettingsIcon, GenerateIcon } = components;
  const { advancedOpen, setAdvancedOpen, editing, setEditing, model, effectiveMode, modeWarning,
    warning, busy, count, disabled, hasInput, checking, blocked, modeSupported, changeModel } = state;
  return (
    <div
      data-nako-generation-composer={'image'}
      data-nako-effective-image-mode={effectiveMode}
      className={
        'p-2.5 rounded-lg shadow-2xl cursor-default w-full transition-colors duration-300 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)]'
      }
      onPointerDown={(j) => {
        if (j.button !== 1) j.stopPropagation();
      }}
      onContextMenu={(j) => j.stopPropagation()}
      onDoubleClick={(j) => j.stopPropagation()}
      onClick={() => onSelect(node.id)}
    >
      <ConnectedAssets
        node={node}
        disabled={busy}
        connectedImageNodes={assets}
        onUpdate={onUpdate}
      />
      {renderImageReferences(React, props, state)}
      <div
        className={`mb-1 relative group/prompt overflow-hidden prompt-editor-container custom-scrollbar ${editing ? 'is-prompt-editing cursor-text' : 'cursor-pointer'}`}
        onClick={(j) => {
          j.stopPropagation();
          if (!readOnly) setEditing(true);
        }}
      >
        <CreativePromptTokens data={node} onUpdate={onUpdate} disabled={busy} />
        <PromptEditor
          type={'image'}
          value={node.prompt || ''}
          onChange={(j) => onUpdate(node.id, { prompt: j })}
          connectedAssets={assets || []}
          isDark={!0}
          disableDirectEdit={readOnly || !editing}
          onBlur={() => setEditing(!1)}
          key={`mention-editor-${node.id}`}
        />
        {model.name === 'Midjourney Imagine · API' && <MjStyleStatus prompt={node.prompt || ''} />}
      </div>
      <CreativeLibraryTools data={node} onUpdate={onUpdate} disabled={busy} />
      <ImageAngleControl
        node={node}
        referenceUrl={
          assets.find((asset) => asset.type === 'Image' || asset.type === 'Upload Image')?.url
        }
        onUpdate={onUpdate}
        disabled={busy}
      />
      {node.errorMessage && (
        <div
          className={
            'text-[var(--nk-danger)] text-xs mb-2 p-1 bg-red-900/20 rounded border border-red-900/50'
          }
        >
          {node.errorMessage}
        </div>
      )}
      {!node.errorMessage && (modeWarning || warning) && (
        <div
          className={
            'text-[var(--nk-warning)] text-xs mb-2 p-1 bg-amber-900/20 rounded border border-amber-900/40'
          }
        >
          {modeWarning || warning}
        </div>
      )}
      <div className={'flex items-center justify-between w-full p-0 h-9'}>
        <div className={'flex items-center gap-0.5 min-w-0 h-full'}>
          <ModelSelector
            isVideoNode={!1}
            currentModel={model}
            availableModels={models}
            disabled={busy}
            onModelChange={changeModel}
          />
          <div className={'w-px h-3.5 bg-[var(--nk-surface-raised)]'} />
        </div>
        <div className={'relative flex items-center gap-1 h-full'}>
          {renderImageModeMenu(React, props, components, state)}
          <Dimensions
            data={node}
            onUpdate={(patch) => {
              if (busy) return;
              onUpdate(node.id, patch);
              rememberNodeDimensions('Image', node.projectId, { ...node, ...patch });
            }}
            disabled={busy}
            allRatios={ratios}
            supportedRatios={model.aspectRatios || ratios}
            allResolutions={resolutions}
            supportedResolutions={model.resolutions || resolutions}
            isDark={!0}
          />
          <Tooltip text={'高级设置'}>
            <button
              onClick={() => !busy && setAdvancedOpen(!advancedOpen)}
              disabled={busy}
              className={`flex items-center justify-center rounded-lg h-8 px-2 transition-all ${busy ? 'opacity-50 text-[var(--nk-text-muted)]' : 'hover:bg-[var(--nk-surface-raised)] text-[var(--nk-text-secondary)]'} ${advancedOpen ? 'bg-blue-500/20 text-[var(--nk-info)] shadow-inner scale-95' : ''}`}
            >
              {advancedOpen ? <CollapseIcon size={15} /> : <SettingsIcon size={15} />}
            </button>
          </Tooltip>
          <div className={'w-px h-3.5 bg-[var(--nk-surface-raised)] shrink-0'} />
          <div className={'flex items-center gap-1 h-full'}>
            <span className={'text-[11px] text-[var(--nk-text-muted)] opacity-50 px-1'}>
              {'x'}
              {count}
            </span>
            <button
              aria-label={busy ? '正在生成图片' : '生成图片'}
              aria-busy={busy ? 'true' : 'false'}
              data-nako-image-generate-state={busy ? 'loading' : 'idle'}
              onClick={(j) => {
                j.stopPropagation();
                if (!disabled) onGenerate(node.id);
              }}
              disabled={disabled}
              className={`aspect-square w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${busy ? 'bg-[var(--nk-hover)] text-[var(--nk-text-muted)] cursor-wait' : !hasInput || checking || blocked || !modeSupported ? 'bg-[var(--nk-selected)] text-[var(--nk-text-muted)] cursor-not-allowed' : 'bg-[var(--nk-primary)] text-[var(--nk-on-primary)] hover:opacity-90'}`}
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
      {advancedOpen && (
        <React.Fragment>
          <AdvancedSettings
            data={node}
            isVideoNode={!1}
            currentModel={model}
            connectedImageNodes={assets}
            onUpdate={onUpdate}
          />
        </React.Fragment>
      )}
    </div>
  );
}

function renderImageReferences(
  React: ComposerRuntime,
  { data: node, onUpdate }: MediaComposerProps,
  { model, references, assignments, busy, referenceOptions }: ReturnType<typeof useImageComposerState>,
) {
  return model.name === 'Midjourney Imagine · API' && (
    <div
      data-nako-midjourney-references={'true'}
      style={{
        marginBottom: '8px',
        padding: '8px',
        border: '1px solid var(--nk-border)',
        borderRadius: '8px',
        background: 'var(--nk-surface)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '6px',
        }}
      >
        <strong style={{ fontSize: '12px', fontWeight: 600, color: 'var(--nk-text)' }}>
          {'专用垫图'}
        </strong>
        <span style={{ fontSize: '10px', color: 'var(--nk-text-muted)' }}>
          {'未指定的图片仍作为普通参考'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '6px' }}>
        {(references?.roles || []).map((j) => (
          <label style={{ display: 'grid', gap: '4px', minWidth: 0 }} title={j.description} key={j.key}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--nk-text-secondary)' }}>
              {j.label}
            </span>
            <select
              aria-label={j.label}
              value={assignments[j.key] || ''}
              disabled={busy || referenceOptions.length === 0}
              onChange={(V) => onUpdate(node.id, {
                midjourneyReferenceNodeIds:
                  references?.assign(node, referenceOptions, j.key, V.currentTarget.value) || {},
              })}
              style={{
                width: '100%',
                height: '30px',
                padding: '0 6px',
                border: '1px solid var(--nk-border)',
                borderRadius: '6px',
                background: 'var(--nk-input)',
                color: 'var(--nk-text)',
                fontSize: '11px',
                outline: 'none',
                opacity: referenceOptions.length === 0 ? 0.45 : 1,
              }}
            >
              <option value={''}>{referenceOptions.length ? '未设置' : '先连接图片'}</option>
              {referenceOptions.map((V, z) => (
                <option value={V.id} key={V.id}>
                  {String(V.title || V.prompt || `图片 ${z + 1}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

function renderImageModeMenu(
  React: ComposerRuntime,
  { data: node, onUpdate }: MediaComposerProps,
  { Tooltip }: MediaComposerComponents,
  { specialModes, modeRoot, modeOpen, setModeOpen, busy, modeLabel, hasImageInput }:
    ReturnType<typeof useImageComposerState>,
) {
  return specialModes.length > 0 && (
    <div
      className={'relative flex items-center h-full'}
      ref={modeRoot}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' && modeOpen) {
          event.preventDefault();
          setModeOpen(false);
          modeRoot.current?.querySelector('button')?.focus();
        }
      }}
    >
      <Tooltip text={'特殊功能'}>
        <button
          aria-label="特殊功能"
          aria-expanded={modeOpen}
          onClick={() => !busy && setModeOpen(!modeOpen)}
          disabled={busy}
          className={`flex items-center justify-center h-8 px-2 py-1 text-sm select-none rounded-lg transition-colors ${busy ? 'opacity-50 text-[var(--nk-text-muted)]' : 'hover:bg-[var(--nk-surface-raised)] active:bg-[var(--nk-hover)] text-[var(--nk-info)]'} ${modeOpen ? 'bg-[var(--nk-hover)] text-[var(--nk-text)]' : ''}`}
        >
          {(imageModes?.isAutomatic(node.imageMode) ??
            (!node.imageMode || node.imageMode === 'text-to-image' || node.imageMode === 'image-to-image'))
            ? '特殊功能' : modeLabel}
        </button>
      </Tooltip>
      {modeOpen && (
        <div
          className={'absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[140px] bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 py-1.5'}
          onWheel={(j) => j.stopPropagation()}
        >
          <button
            onClick={() => {
              if (busy) return;
              onUpdate(node.id, { imageMode: hasImageInput ? 'image-to-image' : 'text-to-image' });
              setModeOpen(false);
            }}
            className={`w-full flex items-center px-5 py-2.5 text-[16px] font-bold whitespace-nowrap transition-all duration-200 ${(imageModes?.isAutomatic(node.imageMode) ?? (!node.imageMode || node.imageMode === 'text-to-image' || node.imageMode === 'image-to-image')) ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)]' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)] hover:text-[var(--nk-text)]'}`}
            key={'automatic'}
          >
            <span>{'普通生成（自动）'}</span>
          </button>
          {specialModes.map((j) => {
            const V = node.imageMode === j.value;
            return (
              <button
                onClick={() => {
                  if (busy) return;
                  onUpdate(node.id, { imageMode: j.value });
                  setModeOpen(false);
                }}
                className={`w-full flex items-center px-5 py-2.5 text-[16px] font-bold whitespace-nowrap transition-all duration-200 ${V ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)]' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)] hover:text-[var(--nk-text)]'}`}
                key={j.value}
              >
                <span>{j.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
