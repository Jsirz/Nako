import { canvasError } from '../../../contracts/canvasErrors.js';
import type { CanvasComponent } from '../app/canvasComponentType';
import type * as ReactTypes from 'react';
import { CanvasTransferMenu } from './CanvasTransferMenu';
import { CanvasProjectSwitcher } from './CanvasProjectSwitcher';
type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'Fragment' | 'useState' | 'useRef' | 'useEffect' | 'useLayoutEffect' | 'useMemo'
>;
interface Props {
  canvasTitle: string;
  isEditingTitle: boolean;
  editingTitleValue: string;
  canvasTitleInputRef: ReactTypes.RefObject<HTMLInputElement | null>;
  setCanvasTitle(value: string): void;
  setIsEditingTitle(value: boolean): void;
  setEditingTitleValue(value: string): void;
  onSave(): Promise<{ unchanged?: boolean } | null | undefined>;
  onBack?(): unknown;
  currentProjectId: string | null;
  onSwitchProject(id: string): Promise<void>;
  onImportWorkflow(): void;
  onExportWorkflow(): Promise<void>;
  transferring?: boolean;
  documentEpoch?: number;
  hasUnsavedChanges: boolean;
  lastAutoSaveTime?: number | null;
  lastSavedBy?: string;
  lastSavedRevision?: number | null;
  isChatOpen?: boolean;
  chatPanelWidth?: number;
  readOnly?: boolean;
}
interface Components {
  Tooltip: ReactTypes.ComponentType<{
    text: string;
    position?: string;
    children: ReactTypes.ReactNode;
  }>;
  SaveIcon: CanvasComponent;
  BackIcon: CanvasComponent;
}
export function CanvasHeader(React: Runtime, props: Props, components: Components) {
  const state = useCanvasHeaderActions(React, props);
  return renderCanvasHeaderContent(React, props, components, state);
}

function useCanvasHeaderActions(React: Runtime, props: Props) {
  const {
    canvasTitle,
    editingTitleValue,
    setCanvasTitle,
    setIsEditingTitle,
    setEditingTitleValue,
    documentEpoch,
  } = props;
  const [menuOpen, setMenuOpen] = React.useState(false),
    menuRoot = React.useRef<HTMLDivElement>(null),
    [saving, setSaving] = React.useState(false),
    [error, setError] = React.useState('');
  const live = React.useRef(props);
  live.current = props;
  const savingNow = React.useRef(false),
    lifetime = React.useRef(0),
    previousProjectId = React.useRef(props.currentProjectId),
    titleFinished = React.useRef(false);
  const commitTitle = () => {
    if (titleFinished.current) return;
    titleFinished.current = true;
    const value = editingTitleValue.trim();
    if (value) setCanvasTitle(value);
    else setEditingTitleValue(canvasTitle);
    setIsEditingTitle(false);
  };
  const titleKeyDown = (event: ReactTypes.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      commitTitle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      titleFinished.current = true;
      setEditingTitleValue(canvasTitle);
      setIsEditingTitle(false);
    }
  };
  const startRename = () => {
    titleFinished.current = false;
    setEditingTitleValue(canvasTitle);
    setIsEditingTitle(true);
  };
  const save = async (exit = false) => {
    if (savingNow.current) return;
    savingNow.current = true;
    setSaving(true);
    setError('');
    setMenuOpen(false);
    const owner = lifetime.current;
    try {
      const result = await live.current.onSave();
      if (owner !== lifetime.current) return;
      if (exit) {
        const titleDraft =
          live.current.isEditingTitle &&
          live.current.editingTitleValue.trim() !== live.current.canvasTitle;
        if (!result || result.unchanged === false || titleDraft) {
          setError('还有编辑尚未保存，请保存后再退出');
          return;
        }
        live.current.onBack?.();
      }
    } catch (cause) {
      if (owner === lifetime.current)
        setError(cause instanceof Error ? cause.message : '保存失败，请重试');
    } finally {
      if (owner === lifetime.current) {
        savingNow.current = false;
        setSaving(false);
      }
    }
  };
  const leave = () => {
    setMenuOpen(false);
    if (live.current.readOnly) live.current.onBack?.();
    else void save(true);
  };
  const switchProject = async (id: string) => {
    if (savingNow.current) return;
    savingNow.current = true;
    setSaving(true);
    setError('');
    const owner = lifetime.current;
    try {
      if (!live.current.readOnly) {
        const receipt = await live.current.onSave();
        if (owner !== lifetime.current) return;
        const titleDraft = live.current.isEditingTitle &&
          live.current.editingTitleValue.trim() !== live.current.canvasTitle;
        if (!receipt || receipt.unchanged === false || titleDraft)
          throw canvasError('当前项目尚未保存完成，请保存后再切换', 'project.switch');
      }
      await live.current.onSwitchProject(id);
      if (owner === lifetime.current) setMenuOpen(false);
    } catch (cause) {
      if (owner === lifetime.current)
        setError(cause instanceof Error ? cause.message : '切换项目失败');
    } finally {
      if (owner === lifetime.current) {
        savingNow.current = false;
        setSaving(false);
      }
    }
  };
  React.useLayoutEffect(() => {
    const owner = ++lifetime.current;
    savingNow.current = false;
    setSaving(false);
    titleFinished.current = false;
    setMenuOpen(false);
    if (previousProjectId.current !== props.currentProjectId) setError('');
    previousProjectId.current = props.currentProjectId;
    return () => {
      lifetime.current = owner + 1;
    };
  }, [documentEpoch]);
  React.useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRoot.current?.contains(event.target))
        setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);

  return { menuOpen, setMenuOpen, menuRoot, saving, error, setError, commitTitle,
    titleKeyDown, startRename, save, leave, switchProject };
}

function renderCanvasHeaderContent(
  React: Runtime, props: Props, { Tooltip, SaveIcon, BackIcon }: Components,
  { menuOpen, setMenuOpen, menuRoot, saving, error, setError, commitTitle,
    titleKeyDown, startRename, save, leave, switchProject }: ReturnType<typeof useCanvasHeaderActions>,
) {
  const { canvasTitle, isEditingTitle, editingTitleValue, canvasTitleInputRef, setEditingTitleValue,
    hasUnsavedChanges, lastAutoSaveTime, lastSavedBy = '用户-', lastSavedRevision = null,
    isChatOpen = false, chatPanelWidth = 400, readOnly = false } = props;
  return (
    <React.Fragment>
      <div className="nako-window-drag-region" aria-hidden="true" />
      <div
        className={
          'af-canvas-header nako-project-header'
        }
        style={{
          maxWidth: isChatOpen ? `calc(100% - ${chatPanelWidth}px - 32px)` : 'calc(100% - 32px)',
          zIndex: menuOpen ? 60 : undefined,
        }}
      >
        <div className={'nako-project-identity flex items-center gap-3 pointer-events-auto'}>
          <div
            className={'relative'}
            ref={menuRoot}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === 'Escape') {
                event.preventDefault();
                setMenuOpen(false);
                menuRoot.current?.querySelector('button')?.focus();
              }
            }}
            onBlur={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              )
                setMenuOpen(false);
            }}
          >
            <Tooltip text="项目菜单" position="bottom">
              <button
                type="button"
                aria-label="项目菜单"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((value) => !value)}
                className="flex items-center gap-2 p-0 bg-transparent border-none cursor-pointer"
              >
                <img
                  src="/nako-logo.png"
                  alt="Nako 画布 Logo"
                  className="w-8 h-8 rounded-md object-contain bg-[var(--nk-surface)] transition-transform hover:scale-110"
                />
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </Tooltip>
            {menuOpen && (
              <div
                className={
                  'absolute top-11 left-0 w-60 bg-[var(--nk-input)] border border-[var(--nk-border-control)] rounded-lg p-1.5 shadow-2xl z-[200]'
                }
              >
                {!readOnly && <button
                  onClick={() => {
                    void save(true);
                  }}
                  disabled={saving}
                  className={
                    'w-full h-9 px-2.5 rounded-md text-left text-sm text-[var(--nk-text)] hover:bg-[var(--nk-surface-raised)] flex items-center gap-2'
                  }
                  type={'button'}
                >
                  <SaveIcon
                    size={14}
                    className={
                      hasUnsavedChanges
                        ? 'text-[var(--nk-info)]'
                        : 'text-[var(--nk-text-secondary)]'
                    }
                  />
                  {'保存退出'}
                </button>}
                {!readOnly && <button
                  onClick={() => {
                    void save();
                  }}
                  disabled={saving}
                  className={
                    'w-full h-9 px-2.5 rounded-md text-left text-sm text-[var(--nk-text)] hover:bg-[var(--nk-surface-raised)] flex items-center gap-2'
                  }
                  type={'button'}
                >
                  <SaveIcon
                    size={14}
                    className={
                      hasUnsavedChanges
                        ? 'text-[var(--nk-info)]'
                        : 'text-[var(--nk-text-secondary)]'
                    }
                  />
                  <span className={'flex-1'}>{'保存'}</span>
                  <span className={'text-[10px] text-[var(--nk-text-muted)]'}>{'Ctrl+S'}</span>
                </button>}
                {!readOnly && <CanvasTransferMenu busy={saving || !!props.transferring}
                  onImport={props.onImportWorkflow} onExport={props.onExportWorkflow}
                  close={() => setMenuOpen(false)} onError={setError} />}
                <CanvasProjectSwitcher currentProjectId={props.currentProjectId}
                  busy={saving} onSwitch={(id) => { void switchProject(id); }} />
                <button
                  onClick={leave}
                  className={
                    'w-full h-9 px-2.5 rounded-md text-left text-sm text-[var(--nk-text)] hover:bg-[var(--nk-surface-raised)] flex items-center gap-2'
                  }
                  type={'button'}
                >
                  <BackIcon size={14} className={'text-[var(--nk-text-secondary)]'} />
                  {'退出项目'}
                </button>
              </div>
            )}
          </div>
          {readOnly ? <span className="nako-project-title font-semibold text-[var(--nk-text-secondary)]">{canvasTitle}</span> : isEditingTitle ? (
            <input
              ref={canvasTitleInputRef}
              type={'text'}
              value={editingTitleValue}
              onChange={(participant) => setEditingTitleValue(participant.target.value)}
              onBlur={commitTitle}
              aria-label="项目名称"
              onKeyDown={titleKeyDown}
              className={
                'font-semibold text-[var(--nk-text-secondary)] bg-transparent outline-none min-w-[100px]'
              }
            />
          ) : (
            <Tooltip text={'点击重命名'} position={'bottom'}>
              <button
                type="button"
                className={
                  'nako-project-title font-semibold cursor-pointer transition-colors text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
                }
                title={canvasTitle}
                onClick={startRename}
              >
                {canvasTitle}
              </button>
            </Tooltip>
          )}
        </div>
        <div className={'flex items-center gap-2 pointer-events-auto'}>
          <div data-nako-account-center-slot={'true'} />
          <div
            className="nako-save-status"
            title={`保存者：${lastSavedBy} · 版本：${lastSavedRevision ?? '--'}${lastAutoSaveTime ? ' · ' + new Date(lastAutoSaveTime).toLocaleTimeString() : ''}`}
            role="status"
          >
            {props.transferring
              ? '工作流传输中…'
              : saving
              ? '保存中…'
              : hasUnsavedChanges
                ? '未保存'
                : lastAutoSaveTime
                  ? '已保存'
                  : '尚未保存'}
          </div>
        </div>
      </div>
      {error && (
        <div
          role="alert"
          style={{ position: 'fixed', left: 24, top: 72, zIndex: 210, pointerEvents: 'none' }}
          className="fixed left-6 top-16 z-[210] rounded-md border border-[var(--nk-danger)] bg-[var(--nk-input)] px-3 py-2 text-xs text-[var(--nk-danger)]"
        >
          {error}
        </div>
      )}
    </React.Fragment>
  );
}
