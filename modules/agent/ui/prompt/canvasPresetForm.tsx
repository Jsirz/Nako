import { renderPresetPreview } from './renderPresetPreview';
import { AgentOperationError } from '../../../contracts/agentErrors.js';
import type * as ReactTypes from 'react';
import { createPromptPresetClient, serializePromptTag } from './promptPresets';
import {
  type PromptRuntime,
  type PromptIcons,
  type PresetFormProps,
} from './promptComponents';
import { usePromptMutation } from './usePromptMutation';
export function CanvasPresetForm(
  React: PromptRuntime,
  { type, initialCategory, onSave, onCancel }: PresetFormProps,
  {
    BackIcon,
    UploadIcon,
    ImageIcon,
    Spinner,
    TagIcon,
  }: Pick<PromptIcons, 'BackIcon' | 'UploadIcon' | 'ImageIcon' | 'Spinner' | 'TagIcon'>,
) {
  const { title, setTitle, category, setCategory, text, setText, preview, fileRef,
    mutation, saving, stop, cancel, pickFile, save } = usePresetFormState(React, { type, initialCategory, onSave, onCancel });
  return renderPresetForm(React, { type, title, setTitle, category, setCategory, text,
    setText, preview, fileRef, mutation, saving, stop, cancel, pickFile, save },
    { BackIcon, UploadIcon, ImageIcon, Spinner, TagIcon });
}

function usePresetFormState(React: PromptRuntime, { type, initialCategory, onSave, onCancel }: PresetFormProps) {
  const [title, setTitle] = React.useState(''),
    [category, setCategory] = React.useState(initialCategory || ''),
    [text, setText] = React.useState(''),
    [preview, setPreview] = React.useState<string | null>(null),
    [reading, setReading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null),
    readerRef = React.useRef<FileReader | null>(null),
    alive = React.useRef(false);
  const mutation = usePromptMutation(React),
    saving = mutation.busy || reading;
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      const reader = readerRef.current;
      readerRef.current = null;
      reader?.abort();
    };
  }, []);
  const stop = (event: ReactTypes.SyntheticEvent) => event.stopPropagation();
  const cancel = () => {
    if (!saving) onCancel();
  };
  const pickFile = (event: ReactTypes.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || mutation.busy) return;
    const previous = readerRef.current;
    readerRef.current = null;
    previous?.abort();
    setReading(false);
    const limit = file.type === 'video/mp4' ? 25 : 5;
    if (
      !['image/png', 'image/jpeg', 'image/webp', 'video/mp4'].includes(file.type) ||
      !file.size ||
      file.size > limit * 1024 * 1024
    ) {
      mutation.setError('请选择不超过 5 MB 的 PNG、JPEG、WebP 图片，或不超过 25 MB 的 MP4');
      return;
    }
    const reader = new FileReader();
    readerRef.current = reader;
    setReading(true);
    mutation.setError('');
    const current = () => alive.current && readerRef.current === reader;
    reader.onload = () => {
      if (current() && typeof reader.result === 'string') setPreview(reader.result);
    };
    reader.onerror = () => {
      if (current()) mutation.setError('预览读取失败，请重新选择文件');
    };
    reader.onloadend = () => {
      if (current()) {
        readerRef.current = null;
        setReading(false);
      }
    };
    reader.readAsDataURL(file);
  };
  const save = () => {
    if (saving) return;
    try {
      serializePromptTag(title, text);
      if (!category.trim() || category.trim().length > 80)
        throw new AgentOperationError('请填写不超过 80 字的分类名称', { operation: 'save-prompt-preset', field: 'category' });
    } catch (cause) {
      mutation.setError(cause instanceof Error ? cause.message : '请填写完整信息');
      return;
    }
    void mutation.run(
      (signal) =>
        createPromptPresetClient().create(
          {
            type,
            category: category.trim(),
            title: title.trim(),
            prompt: text.trim(),
            previewBase64: preview,
          },
          signal,
        ),
      onSave,
    );
  };
  return { title, setTitle, category, setCategory, text, setText, preview, fileRef,
    mutation, saving, stop, cancel, pickFile, save };
}

function renderPresetForm(React: PromptRuntime, { type, title, setTitle, category, setCategory,
  text, setText, preview, fileRef, mutation, saving, stop, cancel, pickFile, save }:
  ReturnType<typeof usePresetFormState> & Pick<PresetFormProps, 'type'>,
  { BackIcon, UploadIcon, ImageIcon, Spinner, TagIcon }:
  Pick<PromptIcons, 'BackIcon' | 'UploadIcon' | 'ImageIcon' | 'Spinner' | 'TagIcon'>) {

  return (
    <div
      role="dialog"
      aria-label="创建提示词预设"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) cancel();
      }}
      className={
        'flex flex-col w-full bg-[var(--nk-input)] animate-in slide-in-from-right-4 duration-300'
      }
      onMouseDown={stop}
      onClick={stop}
    >
      <div className={'flex items-center gap-2 px-5 py-3 border-b border-[var(--nk-border)]'}>
        <button
          aria-label="返回预设列表"
          disabled={saving}
          onClick={cancel}
          className={
            'p-1.5 hover:bg-[var(--nk-hover)] rounded-full text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)] transition-colors'
          }
        >
          <BackIcon size={18} />
        </button>
        <h3 className={'text-base font-bold text-[var(--nk-text)]'}>
          {'创建新预设 ('}
          {type === 'image'
            ? '图片'
            : type === 'video'
              ? '视频'
              : type === 'audio'
                ? '音频'
                : '文本'}
          {')'}
        </h3>
      </div>
      <div className={'overflow-y-auto p-5 space-y-4 custom-scrollbar'}>
        <div className={'flex items-start gap-4'}>
          {renderPresetPreview(React, { saving, preview, fileRef, stop, pickFile }, { UploadIcon, ImageIcon })}
          <div className={'flex-1 space-y-3'}>
            <div className={'space-y-1.5'}>
              <label
                className={
                  'text-[11px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest'
                }
              >
                {'分类'}
              </label>
              <input
                disabled={saving}
                aria-label="分类"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={'输入提示词预设分类'}
                className={
                  'w-full bg-[var(--nk-input)] border border-[var(--nk-border)] rounded-lg px-3.5 py-2 text-sm text-[var(--nk-text)] focus:outline-none focus:border-[var(--nk-info)] transition-colors'
                }
              />
            </div>
            <div className={'space-y-1.5'}>
              <label
                className={
                  'text-[11px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest'
                }
              >
                {'预设名称'}
              </label>
              <input
                disabled={saving}
                aria-label="预设名称"
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={'如：赛博朋克'}
                className={
                  'w-full bg-[var(--nk-input)] border border-[var(--nk-border)] rounded-lg px-3.5 py-2 text-sm text-[var(--nk-text)] focus:outline-none focus:border-[var(--nk-info)] transition-colors'
                }
              />
            </div>
          </div>
        </div>
        <div className={'space-y-1.5'}>
          <label
            className={
              'text-[11px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest'
            }
          >
            {'提示词内容'}
          </label>
          <textarea
            aria-label="提示词内容"
            disabled={saving}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={'输入提示词内容，多行将自动转为列表格式...'}
            className={
              'w-full bg-[var(--nk-input)] border border-[var(--nk-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--nk-text)] focus:outline-none focus:border-[var(--nk-info)] transition-colors min-h-[140px] resize-none'
            }
          />
        </div>
      </div>
      {mutation.error && (
        <div
          role="alert"
          style={{ color: 'var(--nk-danger)', fontSize: 12, padding: '0 20px 12px' }}
        >
          {mutation.error}
        </div>
      )}
      <div
        className={
          'px-5 py-3 border-t border-[var(--nk-border)] flex items-center justify-end gap-2.5 bg-[var(--nk-hover)]'
        }
      >
        <button
          onClick={cancel}
          disabled={saving}
          className={
            'min-w-[104px] h-9 inline-flex items-center justify-center px-5 rounded-lg text-sm font-bold text-[var(--nk-text-secondary)] bg-[var(--nk-hover)] hover:text-[var(--nk-text)] hover:bg-[var(--nk-hover)] transition-all'
          }
        >
          {'取消'}
        </button>
        <button
          onClick={save}
          disabled={saving}
          className={
            'min-w-[104px] h-9 inline-flex items-center justify-center px-5 rounded-lg text-sm font-bold bg-[var(--nk-info-bg)] hover:bg-[var(--nk-info-bg)] text-[var(--nk-text)] shadow-lg shadow-blue-900/20 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
          }
        >
          {saving ? <Spinner size={16} className={'animate-spin'} /> : <TagIcon size={16} />}
          {saving ? '保存中...' : '保存预设'}
        </button>
      </div>
    </div>
  );
}
