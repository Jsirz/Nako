import type * as ReactTypes from 'react';
import type { CanvasContextMenuState } from '../canvas/canvasContextActions';
import { installNodeFramework, type NodeDefinition } from '../nodes/nodeFramework';
type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'Fragment' | 'useState' | 'useRef' | 'useEffect' | 'useLayoutEffect'
>;
type Icon = ReactTypes.ComponentType<{ size: number; className?: string }>;
export interface ContextMenuIcons {
  image: Icon;
  copy: Icon;
  paste: Icon;
  duplicate: Icon;
  delete: Icon;
  upload: Icon;
  assets: Icon;
  add: Icon;
  next: Icon;
  undo: Icon;
  redo: Icon;
  text: Icon;
  video: Icon;
  audio: Icon;
  workflow: Icon;
  compare: Icon;
  composite: Icon;
}
export interface CanvasContextMenuProps {
  state: Omit<CanvasContextMenuState, 'type'> & {
    type: CanvasContextMenuState['type'] | 'node-connector';
  };
  onClose(): void;
  onSelectType(type: string): void;
  onUpload(files: File[]): void;
  onUndo?(): void;
  onRedo?(): void;
  onPaste?(): void;
  onCopy?(): void;
  onCopyImage?(): Promise<void>;
  onCreateAsset?(): void;
  onAddAssets?(): void;
  canUndo?: boolean;
  canRedo?: boolean;
}
interface MenuItem {
  id?: string;
  label: string;
  icon: keyof ContextMenuIcons;
  action?: () => void;
  shortcut?: string;
  next?: boolean;
  disabled?: boolean;
}
const nativeNodeIcons: Readonly<Record<string, keyof ContextMenuIcons>> = {
  Text: 'text', Image: 'image', Video: 'video', Audio: 'audio',
  'Image Compare': 'compare', 'Image Composite': 'composite', ComfyUI: 'workflow',
};
function nodeIcon(definition: NodeDefinition): keyof ContextMenuIcons {
  const renderer = definition.render;
  if (renderer?.kind === 'native' && renderer.component && nativeNodeIcons[renderer.component])
    return nativeNodeIcons[renderer.component];
  if (definition.category === 'workflow') return 'workflow';
  const media = definition.outputs.flatMap(port => port.media);
  if (media.length === 1 && ['text', 'image', 'video', 'audio'].includes(media[0]))
    return media[0] as 'text' | 'image' | 'video' | 'audio';
  return definition.category === 'asset' ? 'assets' : definition.category === 'tool' ? 'composite' : 'add';
}
/** The original compact menu, with one reachable submenu and viewport-constrained placement. */
export function CanvasContextMenu(
  React: Runtime,
  props: CanvasContextMenuProps,
  icons: ContextMenuIcons,
) {
  const { state, onClose } = props;
  const menuRef = React.useRef<HTMLDivElement>(null),
    fileRef = React.useRef<HTMLInputElement>(null);
  const [mode, setMode] = React.useState<'main' | 'add-nodes'>('main');
  const [position, setPosition] = React.useState({ x: state.x, y: state.y });
  React.useEffect(() => {
    if (!state.isOpen) return;
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [state.isOpen, onClose]);
  React.useEffect(() => {
    if (state.isOpen) setMode('main');
  }, [state.isOpen, state.type, state.x, state.y]);
  React.useLayoutEffect(() => {
    if (!state.isOpen || !menuRef.current) return;
    const place = () => {
      const rect = menuRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 12,
        bottom = window.innerHeight - rect.height - margin;
      const fitsBelow = state.y + rect.height + margin <= window.innerHeight;
      const fitsAbove = state.y - rect.height >= margin;
      const y = fitsBelow ? state.y : fitsAbove ? state.y - rect.height : bottom;
      setPosition({
        x: Math.max(margin, Math.min(state.x, window.innerWidth - rect.width - margin)),
        y: Math.max(margin, y),
      });
    };
    place();
    menuRef.current.focus();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [state.isOpen, state.x, state.y, state.type, mode]);
  if (!state.isOpen) return null;
  const finish = (action: (() => unknown) | undefined) => () => {
    if (action) {
      void Promise.resolve(action()).catch((error: unknown) =>
        window.alert(error instanceof Error ? error.message : '复制图片失败。'),
      );
      onClose();
    }
  };
  const item = (entry: MenuItem, large = false) => {
    const Icon = icons[entry.icon];
    return (
      <button
        key={entry.id || entry.label}
        role="menuitem"
        disabled={entry.disabled}
        onClick={entry.action}
        className={`group flex items-center gap-3 w-full p-2 rounded-lg text-left transition-colors ${entry.disabled ? 'opacity-30' : 'text-[var(--nk-text-secondary)] hover:bg-[var(--nk-surface-raised)] hover:text-[var(--nk-text)]'}`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors bg-[var(--nk-surface-raised)] group-hover:bg-[var(--nk-hover)] ${entry.disabled ? 'bg-transparent' : ''}`}
        >
          <Icon size={large ? 18 : 16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">{entry.label}</span>
            <span className="flex items-center gap-2">
              {entry.shortcut && (
                <span className="text-xs font-sans text-[var(--nk-text-muted)]">
                  {entry.shortcut}
                </span>
              )}
              {entry.next &&
                React.createElement(icons.next, {
                  size: 14,
                  className: 'text-[var(--nk-text-muted)]',
                })}
            </span>
          </span>
        </span>
      </button>
    );
  };
  const separator = (key: string) => (
    <div key={key} role="separator" className="my-1 border-t mx-1 border-[var(--nk-border)]" />
  );
  const nodeOptions = state.type === 'node-options';
  const global = state.type === 'global' && mode === 'main';
  const connector = state.type === 'node-connector';
  const registeredNodes = installNodeFramework()
    .listDefinitions()
    .filter((definition) => definition.pluginId !== 'nako.canvas-core' || definition.category !== 'asset');
  const keyDown = (event: ReactTypes.KeyboardEvent) => {
    event.stopPropagation();
    if (event.key === 'Tab') {
      onClose();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      if (state.type === 'global' && mode === 'add-nodes') setMode('main');
      else onClose();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)',
      ) || [],
    );
    const index = buttons.findIndex((button) => button === document.activeElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1) % buttons.length
            : index < 0
              ? buttons.length - 1
              : (index - 1 + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={nodeOptions ? '节点菜单' : connector ? '从此节点生成' : '画布菜单'}
      tabIndex={-1}
      onKeyDown={keyDown}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          onClose();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        minWidth: 'min(200px, calc(100vw - 24px))',
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 24px)',
        backgroundColor: 'var(--nk-surface-raised)',
        border: '1px solid var(--nk-border)',
        borderRadius: 8,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,.4), 0 4px 6px -2px rgba(0,0,0,.2)',
        padding: 4,
        color: 'var(--nk-text-secondary)',
        overflowY: 'auto',
        outline: 'none',
      }}
      className={`${nodeOptions ? 'w-44' : global ? 'w-52' : 'w-56'} border rounded-lg shadow-2xl flex flex-col bg-[var(--nk-surface-raised)] border-[var(--nk-border)]`}
    >
      {global && (
        <input
          type="file"
          ref={fileRef}
          className="hidden"
          accept=".jpeg,.jpg,.png,.webp,.bmp,.m4v,.mov,.mp4,.webm,.mkv,.mp3,.m4a,.wav,.ogg,.aac,.flac"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            if (files.length) {
              props.onUpload(files);
              onClose();
            }
            event.target.value = '';
          }}
        />
      )}
      {!global && !nodeOptions && (
        <div className="px-4 py-3 text-sm font-medium border-b text-[var(--nk-text-secondary)] border-[var(--nk-border)]">
          {connector ? '从此节点生成' : '添加节点'}
        </div>
      )}
      <div
        className={
          global || nodeOptions
            ? 'p-1.5 flex flex-col gap-0.5'
            : 'p-2 flex flex-col gap-1 max-h-[400px] overflow-y-auto'
        }
      >
        {nodeOptions ? (
          <>
            {item({ label: '保存到资产', icon: 'image', action: finish(props.onCreateAsset) })}
            {props.onCopyImage && item({ label: '复制图片', icon: 'copy', action: finish(props.onCopyImage) })}
            {separator('asset')}
            {item({ label: '复制', icon: 'copy', shortcut: 'CtrlC', action: finish(props.onCopy) })}
            {item({ label: '粘贴', icon: 'paste', shortcut: 'CtrlV', disabled: true })}
            {separator('delete')}
            {item({
              label: '删除',
              icon: 'delete',
              shortcut: '⌫,del',
              action: () => props.onSelectType('DELETE'),
            })}
          </>
        ) : global ? (
          <>
            {item({ label: '上传', icon: 'upload', action: () => fileRef.current?.click() })}
            {item({ label: '添加资产', icon: 'assets', action: finish(props.onAddAssets) })}
            {separator('nodes')}
            {item({
              label: '添加节点',
              icon: 'add',
              next: true,
              action: () => setMode('add-nodes'),
            })}
            {separator('undo')}
            {item({
              label: '撤销',
              icon: 'undo',
              shortcut: 'CtrlZ',
              disabled: !props.canUndo,
              action: finish(props.onUndo),
            })}
            {item({
              label: '重做',
              icon: 'redo',
              shortcut: 'ShiftCtrlZ',
              disabled: !props.canRedo,
              action: finish(props.onRedo),
            })}
            {separator('paste')}
            {item({
              label: '粘贴',
              icon: 'paste',
              shortcut: 'CtrlV',
              action: finish(props.onPaste),
            })}
          </>
        ) : (
          <>
            {!registeredNodes.length && <p className="px-2 py-3 text-xs text-[var(--nk-text-muted)]">暂无可添加的节点</p>}
            {registeredNodes.map((definition) =>
              item(
                {
                  id: `${definition.pluginId}:${definition.type}`, label: definition.title || definition.type,
                  icon: nodeIcon(definition),
                  action: () => definition.pluginId === 'nako.canvas-core' && definition.type === 'comfyui'
                    ? finish(() => window.dispatchEvent(new CustomEvent('nako:open-workflow-library')))()
                    : props.onSelectType(`${definition.pluginId}::${definition.type}`),
                },
                true,
              ),
            )}
          </>
        )}
      </div>
    </div>
  );
}
