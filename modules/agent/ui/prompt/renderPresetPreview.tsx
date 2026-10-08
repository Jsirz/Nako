import type * as ReactTypes from 'react';
import { promptPreviewIsVideo, type PromptRuntime, type PromptIcons } from './promptComponents';

type PreviewState = {
  saving: boolean;
  preview: string | null;
  fileRef: ReactTypes.RefObject<HTMLInputElement | null>;
  stop(event: ReactTypes.SyntheticEvent): void;
  pickFile(event: ReactTypes.ChangeEvent<HTMLInputElement>): void;
};
export function renderPresetPreview(React: PromptRuntime,
  { saving, preview, fileRef, stop, pickFile }: PreviewState,
  { UploadIcon, ImageIcon }: Pick<PromptIcons, 'UploadIcon' | 'ImageIcon'>) {
  return (
    <div className={'space-y-1.5 flex-shrink-0'}>
      <label
        className={'text-[11px] font-bold text-[var(--nk-text-muted)] uppercase tracking-widest'}
      >
        {'预览'}
      </label>
      <div
        onClick={() => {
          if (!saving) fileRef.current?.click();
        }}
        className={
          'w-[224px] aspect-video rounded-lg border-2 border-dashed border-[var(--nk-border)] hover:border-[var(--nk-info)] bg-[var(--nk-input)] flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden relative'
        }
      >
        {preview ? (
          <React.Fragment>
            {promptPreviewIsVideo(preview) ? (
              <video
                src={preview}
                onClick={stop}
                className="w-full h-full object-cover"
                muted
                controls
                playsInline
              />
            ) : (
              <img src={preview} className="w-full h-full object-cover" alt="预览" />
            )}
            <div
              data-nk-media-chrome="true"
              style={{
                background: 'color-mix(in srgb, var(--nk-media-bg) 75%, transparent)',
                ...(promptPreviewIsVideo(preview)
                  ? { pointerEvents: 'none' as const, opacity: 0 }
                  : {}),
              }}
              className={
                'absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity'
              }
            >
              <UploadIcon size={18} className={'text-[var(--nk-media-text)]'} />
            </div>
            {promptPreviewIsVideo(preview) && (
              <button
                type="button"
                disabled={saving}
                data-nk-media-chrome="true"
                onClick={(event) => {
                  event.stopPropagation();
                  fileRef.current?.click();
                }}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  padding: '3px 7px',
                  borderRadius: 4,
                  background: 'color-mix(in srgb, var(--nk-media-bg) 85%, transparent)',
                  color: 'var(--nk-media-text)',
                  fontSize: 11,
                }}
              >
                更换预览
              </button>
            )}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div
              className={
                'p-2 rounded-full bg-[var(--nk-surface-raised)] text-[var(--nk-text-muted)] group-hover:bg-[var(--nk-info-bg)] group-hover:text-[var(--nk-info)] transition-colors mb-1'
              }
            >
              <ImageIcon size={18} />
            </div>
            <span
              className={
                'text-[10px] text-[var(--nk-text-muted)] group-hover:text-[var(--nk-text-secondary)]'
              }
            >
              {'上传预览'}
            </span>
          </React.Fragment>
        )}
      </div>
      <input
        disabled={saving}
        ref={fileRef}
        type={'file'}
        accept={'image/png,image/jpeg,image/webp,video/mp4'}
        className={'hidden'}
        onChange={pickFile}
      />
    </div>
  );
}
