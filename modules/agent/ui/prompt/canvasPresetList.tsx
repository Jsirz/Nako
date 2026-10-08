import type * as ReactTypes from 'react';
import { createPromptPresetClient } from './promptPresets';
import {
  presetText,
  isolatePromptMenuKeyboard,
  type PromptRuntime,
  type PromptIcons,
  type PromptKeyHandle,
  type PresetListProps,
  type PresetFormProps,
  type PresetCardProps,
} from './promptComponents';
import { usePromptMutation } from './usePromptMutation';
type Components = {
  CreateForm: ReactTypes.ComponentType<PresetFormProps>;
  PresetCard: ReactTypes.ComponentType<PresetCardProps>;
} & Pick<PromptIcons, 'AddIcon' | 'CopyIcon'>;
export function CanvasPresetList(
  React: PromptRuntime,
  props: PresetListProps,
  ref: ReactTypes.ForwardedRef<PromptKeyHandle>,
  { CreateForm, PresetCard, AddIcon, CopyIcon }: Components,
) {
  const [selected, setSelected] = React.useState(0),
    [storedCategory, setCategory] = React.useState(''),
    [creating, setCreating] = React.useState(false),
    [removed, setRemoved] = React.useState<string[]>([]);
  const alive = React.useRef(false),
    rootRef = React.useRef<HTMLDivElement>(null),
    mutation = usePromptMutation(React);
  const itemKey = (item: { category: string; title: string }) =>
    JSON.stringify([item.category, item.title]);
  const visible = React.useMemo(
    () => props.items.filter((item) => !removed.includes(itemKey(item))),
    [props.items, removed],
  );
  const categories = React.useMemo(
      () => [...new Set(visible.map((item) => item.category))],
      [visible],
    ),
    category = categories.includes(storedCategory) ? storedCategory : categories[0] || '';
  const items = React.useMemo(
      () => visible.filter((item) => item.category === category),
      [visible, category],
    ),
    text = presetText(items[selected]),
    title = items[selected]?.title || '';
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  React.useEffect(() => setSelected(0), [items]);
  React.useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>('[data-selected="true"]')
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [selected]);
  const select = (index: number) => {
    if (mutation.busy) return;
    if (index === items.length) {
      setCreating(true);
      return;
    }
    const item = items[index];
    if (item) props.command({ label: item.title, prompt: presetText(item) });
  };
  const copy = async (event: ReactTypes.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (alive.current) mutation.setError('复制失败，请选择提示词内容后手动复制');
    }
  };
  const remove = (index: number) => {
    const item = items[index];
    if (!item) return Promise.resolve(false);
    return mutation.run(
      (signal) =>
        createPromptPresetClient().remove(props.type || 'image', item.category, item.title, signal),
      () => {
        setRemoved((previous) => [...previous, itemKey(item)]);
        props.onDeleteSuccess?.();
      },
    );
  };
  React.useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (creating || mutation.busy || event.isComposing || event.keyCode === 229) return false;
      const count = items.length + 1;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        setSelected(
          (index) => (index + ((event.key === 'ArrowUp' ? -4 : 4) % count) + count) % count,
        );
        return true;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        if (
          categories.length &&
          ((direction < 0 && selected % 4 === 0) ||
            (direction > 0 && (selected % 4 === 3 || selected === count - 1)))
        ) {
          setCategory(
            categories[
              (categories.indexOf(category) + direction + categories.length) % categories.length
            ],
          );
          setSelected(0);
        } else setSelected((index) => (index + direction + count) % count);
        return true;
      }
      if (event.key === 'Enter') {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  const closeForm = () => {
    setCreating(false);
    if (!props.editor?.isDestroyed) props.editor?.commands.focus();
  };
  const panel = renderPresetListPanel(React, { props, creating, category, categories, closeForm,
    setRemoved, setCategory, setSelected, setCreating, rootRef, items, selected, select, remove,
    mutation, text, title, copy }, { CreateForm, PresetCard, AddIcon, CopyIcon });
  return renderPresetMenu(React, mutation.error, panel);
}

type ListPanelState = {
  props: PresetListProps; creating: boolean; category: string; categories: string[];
  closeForm(): void; setRemoved: ReactTypes.Dispatch<ReactTypes.SetStateAction<string[]>>;
  setCategory: ReactTypes.Dispatch<ReactTypes.SetStateAction<string>>;
  setSelected: ReactTypes.Dispatch<ReactTypes.SetStateAction<number>>;
  setCreating: ReactTypes.Dispatch<ReactTypes.SetStateAction<boolean>>;
  rootRef: ReactTypes.RefObject<HTMLDivElement | null>; items: PresetListProps['items'];
  selected: number; select(index: number): void; remove(index: number): Promise<boolean>;
  mutation: ReturnType<typeof usePromptMutation>; text: string; title: string;
  copy(event: ReactTypes.SyntheticEvent): Promise<void>;
};
function renderPresetListPanel(_React: PromptRuntime, {
  props, creating, category, categories, closeForm, setRemoved, setCategory, setSelected,
  setCreating, rootRef, items, selected, select, remove, mutation, text, title, copy,
}: ListPanelState, { CreateForm, PresetCard, AddIcon, CopyIcon }: Components) {
  return creating ? (
    <div
      style={{
        width: 'min(768px, calc(100vw - 24px))',
        maxHeight: 'calc(100vh - 24px)',
      }}
      className={
        'bg-[var(--nk-input)] backdrop-blur-2xl border border-[var(--nk-border)] rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-[100] w-[768px] max-h-[min(85vh,720px)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200'
      }
      onWheel={(item) => item.stopPropagation()}
    >
      <CreateForm
        type={props.type || 'image'}
        initialCategory={category || categories[0] || ''}
        onSave={() => {
          closeForm();
          setRemoved([]);
          props.onDeleteSuccess?.();
        }}
        onCancel={closeForm}
      />
    </div>
  ) : (
    <div
      style={{
        width: 'min(768px, calc(100vw - 24px))',
        maxHeight: 'calc(100vh - 24px)',
      }}
      className={
        'bg-[var(--nk-input)] backdrop-blur-2xl border border-[var(--nk-border)] rounded-3xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] z-[100] w-[768px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200'
      }
      onWheel={(item) => item.stopPropagation()}
    >
      <div
        className={
          'flex items-center gap-1 px-4 py-3 border-b border-[var(--nk-border)] bg-[var(--nk-hover)] overflow-x-auto nowheel scrollbar-hide'
        }
      >
        {categories.map((item) => (
          <button
            onClick={() => {
              setCategory(item);
              setSelected(0);
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap ${category === item ? 'bg-[var(--nk-primary)] text-[var(--nk-on-primary)] shadow-lg' : 'text-[var(--nk-text-muted)] hover:text-[var(--nk-text-secondary)] hover:bg-[var(--nk-hover)]'}`}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        ref={rootRef}
        className={
          'p-4 grid grid-cols-4 gap-4 max-h-[480px] overflow-y-auto custom-scrollbar scrollbar-thin'
        }
      >
        {items.map((item, index) => (
          <PresetCard
            item={item}
            isSelected={index === selected}
            onClick={() => select(index)}
            onMouseEnter={() => setSelected(index)}
            onDelete={() => remove(index)}
            key={item.title}
          />
        ))}
        <button
          disabled={mutation.busy}
          data-selected={selected === items.length}
          onClick={() => setCreating(!0)}
          onMouseEnter={() => setSelected(items.length)}
          className={`flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed transition-all duration-200 gap-2 ${selected === items.length ? 'border-[var(--nk-info)] bg-[var(--nk-info-bg)] text-[var(--nk-info)]' : 'border-[var(--nk-border)] bg-[var(--nk-input)] text-[var(--nk-text-muted)] hover:border-[var(--nk-border-control)] hover:text-[var(--nk-text-secondary)]'}`}
        >
          <AddIcon size={24} />
          <span className={'text-[10px] font-bold'}>{'新增预设'}</span>
        </button>
      </div>
      <div className={'border-t border-[var(--nk-border)] bg-[var(--nk-hover)] px-4 py-3'}>
        <div className={'mb-2 flex items-center justify-between'}>
          <div className={'flex items-center gap-2'}>
            <span
              className={
                'text-[11px] font-bold uppercase tracking-widest text-[var(--nk-text-muted)]'
              }
            >
              {'提示词内容'}
            </span>
            {text && (
              <button
                onClick={copy}
                className={
                  'p-1 hover:bg-[var(--nk-hover)] rounded transition-all duration-200 text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)]'
                }
                title={'复制提示词'}
              >
                <CopyIcon size={12} />
              </button>
            )}
          </div>
          {title ? (
            <span className={'text-[11px] font-medium text-[var(--nk-text-secondary)]'}>
              {title}
            </span>
          ) : null}
        </div>
        <div
          className={
            'h-[120px] overflow-y-auto rounded-lg border border-[var(--nk-border)] bg-[var(--nk-input)] px-3 py-2 text-[12px] leading-5 text-[var(--nk-text)] whitespace-pre-wrap break-words custom-scrollbar select-text'
          }
          tabIndex={0}
          onMouseDown={(item) => item.stopPropagation()}
          onMouseUp={(item) => item.stopPropagation()}
          onClick={(item) => item.stopPropagation()}
          onPointerDown={(item) => item.stopPropagation()}
          onPointerUp={(item) => item.stopPropagation()}
        >
          {text || '鼠标悬停在预设缩略图上，可在这里查看完整提示词内容。'}
        </div>
      </div>
    </div>
  );
}

function renderPresetMenu(_React: PromptRuntime, error: string, panel: ReactTypes.ReactNode) {
  return (
    <div
      data-nako-preset-menu="true"
      style={{ position: 'relative' }}
      onKeyDown={isolatePromptMenuKeyboard}
      onCopy={(event) => event.stopPropagation()}
      onCut={(event) => event.stopPropagation()}
      onPaste={(event) => event.stopPropagation()}
    >
      {error && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            color: 'var(--nk-danger)',
            background: 'var(--nk-surface-raised)',
            fontSize: 12,
            padding: 8,
          }}
        >
          {error}
        </div>
      )}
      {panel}
    </div>
  );
}
