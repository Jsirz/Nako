/** @jsxRuntime classic */
/** @jsx React.createElement */
import { accountUi, browserHost, generationUi, localRuntimeUi, mediaSettings } from '../../../kernel/browser';
import type { ProjectCacheSettingsService } from '../../../contracts/browserCapabilities';
import type { CanvasComponent } from '../app/canvasComponentType';
import type * as ReactTypes from 'react';
import { activateModal } from '../design/modalFocus';

type Runtime = Pick<
  typeof ReactTypes,
  'createElement' | 'useState' | 'useRef' | 'useEffect' | 'useLayoutEffect'
>;
export interface CanvasSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  localUserName?: string;
  setLocalUserName?: (value: string) => void;
  localUserId?: string;
  localUserNo?: string;
}
interface Dependencies {
  CloseIcon: CanvasComponent;
  avatarClass: (name: string, size: number) => string;
  avatarText: (name: string) => string;
  avatarColor: (id: string) => string;
}
const sections = [
  ['profile', '个人设置'],
  ['appearance', '画布外观'],
  ['local-service', '开源服务'],
  ['models', '闭源服务'],
  ['storage', '存储'],
] as const;
type Section = (typeof sections)[number][0];

/** Same settings surface; one owner for navigation, focus and mounted page lifetimes. */
function useCanvasSettingsState(
  React: Runtime,
  props: CanvasSettingsProps,
  _dependencies: Dependencies,
) {
  const [section, setSection] = React.useState<Section>('profile');
  const [message, setMessage] = React.useState('');
  const dialogRef = React.useRef<HTMLDivElement>(null),
    hostRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(props.onClose),
    avatarReadRef = React.useRef<AbortController | null>(null);
  const pageDisposeRef = React.useRef<(() => void) | null>(null);
  React.useLayoutEffect(() => {
    closeRef.current = props.onClose;
  });
  const close = () => {
    avatarReadRef.current?.abort();
    pageDisposeRef.current?.();
    pageDisposeRef.current = null;
    closeRef.current();
  };
  React.useEffect(() => {
    if (!props.isOpen) return;
    const release = dialogRef.current
      ? activateModal(dialogRef.current, () => {
          avatarReadRef.current?.abort();
          pageDisposeRef.current?.();
          pageDisposeRef.current = null;
          closeRef.current();
        })
      : () => {};
    accountUi().applyAvatar();
    return () => {
      avatarReadRef.current?.abort();
      pageDisposeRef.current?.();
      pageDisposeRef.current = null;
      release();
    };
  }, [props.isOpen]);
  React.useEffect(() => {
    if (!props.isOpen) return;
    const host = hostRef.current;
    setMessage('');
    accountUi().applyAvatar();
    if (host) {
      if (section === 'models')
        pageDisposeRef.current = generationUi().mountSettings(host);
      else if (section === 'storage') {
        const downloads = mediaSettings().mountSettings(host);
        const cache = browserHost.services.optional<ProjectCacheSettingsService>('ui.project.cacheSettings')?.mountSettings(host);
        pageDisposeRef.current = () => { cache?.(); downloads(); };
      } else if (section === 'appearance')
        pageDisposeRef.current = accountUi().mountAppearance(host);
      else if (section === 'local-service')
        pageDisposeRef.current = localRuntimeUi().mountSettings(host);
    }
    return () => {
      avatarReadRef.current?.abort();
      pageDisposeRef.current?.();
      pageDisposeRef.current = null;
    };
  }, [props.isOpen, section]);
  React.useEffect(() => {
    if (props.isOpen) accountUi().applyAvatar();
  }, [props.isOpen, props.localUserName, section]);
  const select = (next: Section) => {
    if (next === section) return;
    avatarReadRef.current?.abort();
    pageDisposeRef.current?.();
    pageDisposeRef.current = null;
    setSection(next);
  };
  const upload = async (file: File) => {
    avatarReadRef.current?.abort();
    const controller = new AbortController();
    avatarReadRef.current = controller;
    setMessage('正在读取头像…');
    try {
      await accountUi().setAvatarFile(file, { signal: controller.signal });
      if (!controller.signal.aborted) setMessage('头像已更新。');
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : '头像读取失败。');
    }
  };
  return { section, message, dialogRef, hostRef, avatarReadRef, close, select, upload, setMessage };
}

export function CanvasSettings(React: Runtime, props: CanvasSettingsProps, dependencies: Dependencies) {
  const state = useCanvasSettingsState(React, props, dependencies);
  if (!props.isOpen) return null;
  return renderCanvasSettings(React, props, dependencies, state);
}

function renderCanvasSettings(React: Runtime, props: CanvasSettingsProps, dependencies: Dependencies,
  state: ReturnType<typeof useCanvasSettingsState>) {
  const { section, message, dialogRef, hostRef, avatarReadRef, close, select, upload, setMessage } = state;
  const name = props.localUserName || '协作者', { CloseIcon } = dependencies;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[var(--nk-overlay)] backdrop-blur-sm"
      onPointerDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        data-nako-settings="true"
        data-nako-settings-owned="true"
        data-nako-settings-domains="appearance models storage local-service network"
        role="dialog"
        aria-label="NAKO Agent 纳科画布智能体设置"
        aria-modal="true"
        className="bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg shadow-2xl flex overflow-hidden w-full max-w-7xl h-[90vh]"
      >
        <aside
          data-nako-settings-sidebar="true"
          className="w-64 bg-[var(--nk-input)] flex flex-col shrink-0 border-r border-[var(--nk-border)]"
        >
          <div className="p-10">
            <span className="text-[var(--nk-text-muted)] text-xl font-bold tracking-tight">
              设置
            </span>
          </div>
          <nav
            className="flex-1 px-5 space-y-3"
            aria-label="设置分类"
            role="tablist"
            aria-orientation="vertical"
            onKeyDown={(event) => {
              if (
                !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
                  event.key,
                )
              )
                return;
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
              ];
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              if (index < 0) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? buttons.length - 1
                    : (index +
                        (['ArrowUp', 'ArrowLeft'].includes(event.key) ? buttons.length - 1 : 1)) %
                      buttons.length;
              buttons[next].click();
              buttons[next].focus();
            }}
          >
            {sections.map(([id, label]) => (
              <button
                key={id}
                id={`nako-settings-tab-${id}`}
                role="tab"
                aria-controls={`nako-settings-page-${id}`}
                aria-selected={section === id}
                tabIndex={section === id ? 0 : -1}
                data-nako-settings-section={id}
                data-nako-download-storage-button={id === 'storage' ? 'true' : undefined}
                onClick={() => select(id)}
                className={`w-full px-4 py-3 text-left rounded-lg text-sm ${section === id ? 'bg-[var(--nk-selected)] text-[var(--nk-on-selected)] font-semibold' : 'text-[var(--nk-text-secondary)] hover:text-[var(--nk-text)] hover:bg-[var(--nk-hover)]'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          <div data-nako-settings-version="true" className="mt-auto shrink-0" />
        </aside>
        <div
          data-nako-settings-content="true"
          className="min-w-0 min-h-0 flex-1 flex flex-col bg-[var(--nk-surface-raised)]"
        >
          <div className="shrink-0 pt-6 px-16 flex justify-end items-start">
            <button
              type="button"
              aria-label="关闭设置"
              onClick={close}
              className="inline-flex items-center gap-2 p-4 hover:bg-[var(--nk-surface-raised)] rounded-lg text-[var(--nk-text-muted)]"
            >
              <CloseIcon size={18} />
              <span data-nako-settings-return="true">返回工作台</span>
            </button>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-16 pb-8 custom-scrollbar"
            key={section}
            role="tabpanel"
            id={`nako-settings-page-${section}`}
            aria-labelledby={`nako-settings-tab-${section}`}
          >
            {section === 'profile' ? (
              <div className="p-8 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-[var(--nk-text)] mb-2">个人资料</h3>
                  <p className="text-sm text-[var(--nk-text-secondary)]">
                    设置画布中显示的名称与头像。
                  </p>
                </div>
                <div className="space-y-6 max-w-xl">
                  <div className="flex items-center gap-6">
                    <span className="w-24 shrink-0 text-base font-medium text-[var(--nk-text-secondary)]">
                      当前头像
                    </span>
                    <div className="flex items-center gap-4">
                      <div
                        data-nako-profile-avatar="local"
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-[var(--nk-media-text)] [text-shadow:0_1px_2px_var(--nk-media-bg),0_0_2px_var(--nk-media-bg)] data-[has-custom-avatar=true]:[text-shadow:none] font-bold border-2 border-[var(--nk-border-control)] ${dependencies.avatarClass(name, 64)}`}
                        style={{
                          background: dependencies.avatarColor(
                            props.localUserId || props.localUserNo || '1',
                          ),
                        }}
                      >
                        {dependencies.avatarText(name)}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--nk-text-muted)]">
                          支持 PNG、JPEG、WebP，最大 2 MB；未上传时使用姓名首字母。
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer rounded-md border border-[var(--nk-border-control)] bg-[var(--nk-input)] px-3 py-1.5 text-xs text-[var(--nk-text)]">
                            上传头像
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                event.target.value = '';
                                if (file) void upload(file);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="rounded-md px-3 py-1.5 text-xs text-[var(--nk-text-muted)]"
                            onClick={() => {
                              avatarReadRef.current?.abort();
                              accountUi().clearAvatar();
                              setMessage('已恢复默认头像。');
                            }}
                          >
                            恢复默认
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <label className="flex items-center gap-6">
                    <span className="w-24 shrink-0 text-base font-medium text-[var(--nk-text-secondary)]">
                      用户名称
                    </span>
                    <input
                      value={props.localUserName || ''}
                      onChange={(event) => props.setLocalUserName?.(event.target.value)}
                      placeholder="输入您的显示名称"
                      className="flex-1 min-w-0 bg-[var(--nk-surface-raised)] border border-[var(--nk-border)] rounded-lg px-4 py-2.5 text-base text-[var(--nk-text)]"
                    />
                  </label>
                  <p role="status" className="text-sm text-[var(--nk-text-secondary)]">
                    {message}
                  </p>
                </div>
              </div>
            ) : (
              <div ref={hostRef} data-nako-settings-page={section} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
