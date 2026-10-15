import { browserHost } from '../../../kernel/browser';
import { declaredModel, type DefaultModelsClient } from '../../../contracts/defaultModels.js';
import { browserServices } from '../../../kernel/browser';
import type { ConnectedAssetsProps } from './canvasConnectedAssets';
import type * as ReactTypes from 'react';
import type { PromptEditorProps } from '../../../contracts/promptEditing';
import { useGenerationAvailability } from './useGenerationAvailability';
type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'useState' | 'useEffect' | 'useSyncExternalStore'
>;
interface ComposerNode {
  id: string;
  projectId?: string;
  prompt?: string;
  textContent?: string;
  textModel?: string;
  languageMode?: string;
  status?: string;
  generateCount?: number;
  generationDurationMs?: number;
  errorMessage?: string;
  parentIds?: string[];
  [key: string]: unknown;
}
interface Asset {
  id: string;
  type?: string;
  url?: string;
  prompt?: string;
  textContent?: string;
  [key: string]: unknown;
}
interface TextModel {
  name: string;
  cost?: number | Partial<Record<string, number>>;
  endpoint?: Record<string, { model?: string }>;
  languageModes?: Array<{ value: string }>;
  priceTextByMode?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}
interface Props {
  data: ComposerNode;
  readOnly?: boolean;
  connectedAssets?: Asset[];
  onUpdate(id: string, patch: Partial<ComposerNode>): void;
  onGenerate(id: string): void;
  onSelect(id: string): void;
}
type Icon = ReactTypes.ComponentType<{ size: number }>;
interface Components {
  models: TextModel[];
  PromptEditor: ReactTypes.ComponentType<PromptEditorProps>;
  ConnectedAssets: ReactTypes.ComponentType<ConnectedAssetsProps>;
  ModelSelector: ReactTypes.ComponentType<{
    isVideoNode: boolean;
    currentModel: TextModel;
    availableModels: TextModel[];
    disabled: boolean;
    onModelChange(name: string): void;
  }>;
  AdvancedSettings: ReactTypes.ComponentType<Record<string, unknown>>;
  Tooltip: ReactTypes.ComponentType<{ text: string; children: ReactTypes.ReactNode }>;
  CollapseIcon: Icon;
  SettingsIcon: Icon;
  GenerateIcon: Icon;
}
const noSubscription = () => () => {};
const zero = () => 0;
export function CanvasTextComposer(
  React: Runtime,
  { data: node, readOnly = false, connectedAssets = [], onUpdate, onGenerate, onSelect }: Props,
  {
    models,
    PromptEditor,
    ConnectedAssets,
    ModelSelector,
    AdvancedSettings,
    Tooltip,
    CollapseIcon,
    SettingsIcon,
    GenerateIcon,
  }: Components,
) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false),
    [editing, setEditing] = React.useState(false);
  const selected =
    declaredModel('text', node) ||
    browserHost.services.optional<DefaultModelsClient>('generation.defaults')?.get('text') ||
    '';
  const model = models.find((item) => item.name === selected) ||
    models.find((item) =>
      Object.values(item.endpoint || {}).some((endpoint) => endpoint.model === selected),
    ) || { name: selected };
  const { checking, blocked, warning } = useGenerationAvailability(
    React,
    model.name,
    node.languageMode || '',
  );
  const scheduler = browserServices.__NAKO_GENERATION_SCHEDULER__;
  React.useSyncExternalStore(
    scheduler?.subscribe || noSubscription,
    scheduler?.version || zero,
    zero,
  );
  const busy = node.status === 'loading' || !!scheduler?.isInFlight(node.id);
  const hasInput =
    !!(node.prompt || '').trim() ||
    !!(node.textContent || '').trim() ||
    connectedAssets.some(
      (asset) => asset.type === 'Text' && !!(asset.textContent || asset.prompt || '').trim(),
    );
  const disabled = busy || !hasInput || checking || blocked;

  return (
    <div
      data-nako-generation-composer="text"
      className={
        'p-2.5 rounded-lg shadow-2xl cursor-default w-full transition-colors duration-300 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)]'
      }
      onPointerDown={(O) => O.stopPropagation()}
      onContextMenu={(O) => O.stopPropagation()}
      onDoubleClick={(O) => O.stopPropagation()}
      onClick={() => onSelect(node.id)}
    >
      <ConnectedAssets
        node={{ ...node, type: 'Text' }}
        disabled={busy}
        connectedImageNodes={connectedAssets}
        onUpdate={onUpdate}
      />
      <div
        className={`mb-1 relative group/prompt overflow-hidden prompt-editor-container custom-scrollbar ${editing ? 'is-prompt-editing cursor-text' : 'cursor-pointer'}`}
        onClick={(O) => {
          O.stopPropagation();
          if (!readOnly) setEditing(true);
        }}
      >
        <PromptEditor
          type={'text'}
          value={node.prompt || ''}
          onChange={(O) => onUpdate(node.id, { prompt: O })}
          connectedAssets={connectedAssets}
          isDark={!0}
          disableDirectEdit={readOnly || !editing}
          onBlur={() => setEditing(!1)}
          key={`mention-editor-${node.id}`}
        />
      </div>
      {node.errorMessage && (
        <div
          className={
            'text-[var(--nk-danger)] text-xs mb-2 p-1 bg-red-900/20 rounded border border-red-900/50'
          }
        >
          {node.errorMessage}
        </div>
      )}
      {!node.errorMessage && warning && (
        <div
          className={
            'text-[var(--nk-warning)] text-xs mb-2 p-1 bg-amber-900/20 rounded border border-amber-900/40'
          }
        >
          {warning}
        </div>
      )}
      <div className={'flex items-center justify-between w-full p-0 h-9'}>
        <div className={'flex items-center gap-0.5 min-w-0'}>
          <ModelSelector
            isVideoNode={!1}
            currentModel={model}
            availableModels={models}
            disabled={busy}
            onModelChange={(O) => onUpdate(node.id, { textModel: O })}
          />
          <div className={'w-px h-3.5 bg-[var(--nk-surface-raised)]'} />
        </div>
        <div className={'relative flex items-center gap-1 h-full'}>
          <Tooltip text={advancedOpen ? '关闭高级设置' : '展开高级设置'}>
            <button
              aria-label={advancedOpen ? '关闭高级设置' : '展开高级设置'}
              onClick={() => !busy && setAdvancedOpen(!advancedOpen)}
              disabled={busy}
              className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${busy ? 'opacity-50 text-[var(--nk-text-muted)]' : advancedOpen ? 'bg-blue-500/10 text-[var(--nk-info)]' : 'text-[var(--nk-text-muted)] hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-text-secondary)]'}`}
            >
              {advancedOpen ? <CollapseIcon size={16} /> : <SettingsIcon size={16} />}
            </button>
          </Tooltip>
          <div className={'flex items-center gap-1'}>
            <button
              aria-label="生成文本"
              onClick={(O) => {
                O.stopPropagation();
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
      {advancedOpen && (
        <AdvancedSettings
          data={node}
          isVideoNode={!1}
          currentModel={model}
          videoGenerationMode={''}
          connectedImageNodes={connectedAssets.map((O) => ({ id: O.id, url: O.url }))}
          onUpdate={onUpdate}
          handleFrameReorder={() => {}}
          draggedIndex={null}
          setDraggedIndex={() => {}}
        />
      )}
    </div>
  );
}
