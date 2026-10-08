import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { RefreshCw, Download, RotateCcw } from 'lucide-react';
import type { DesktopUpdateBridge, DesktopUpdateState } from '../../../contracts/desktopUpdates';
import { PREPARE_DESKTOP_RESTART, type PrepareDesktopRestart } from '../../../contracts/desktopUpdates';
import { desktopBridge } from './desktopBridge';
import { DESKTOP_ERRORS, desktopError } from '../../../contracts/desktopErrors.js';
import { activateModal } from '../../../canvas-ui/api/ui/design/modalFocus';
import './updateSettings.css';

async function prepareRestart() {
  const work: Promise<boolean>[] = [];
  window.dispatchEvent(new CustomEvent<PrepareDesktopRestart>(PREPARE_DESKTOP_RESTART, {
    detail: { waitUntil: promise => work.push(promise) },
  }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const ready = await Promise.race([
      Promise.all(work).then(results => results.every(Boolean)),
      new Promise<boolean>(resolve => { timer = setTimeout(() => resolve(false), 15_000); }),
    ]);
    if (!ready) throw desktopError(DESKTOP_ERRORS.update, '画布尚未保存完成，请稍后重试', 'update.prepareRestart', 409);
  } finally { clearTimeout(timer); }
}

export function UpdateSettings({ bridge, version }: { bridge?: DesktopUpdateBridge; version: string }) {
  const [state, setState] = useState<DesktopUpdateState>({ version, phase: bridge ? 'idle' : 'disabled',
    message: bridge ? '点击检查更新' : '自动更新仅适用于桌面安装版' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!bridge) return;
    let alive = true, received = false;
    const unsubscribe = bridge.subscribe(next => { received = true; if (alive) setState(next); });
    void bridge.state().then(next => { if (alive && !received) setState(next); }, () => {
      if (alive) setError('无法读取更新状态，请重试');
    });
    return () => { alive = false; unsubscribe(); };
  }, [bridge]);
  const busy = pending || ['checking', 'available', 'downloading', 'installing'].includes(state.phase);
  const ready = state.phase === 'downloaded';
  async function check() {
    if (!bridge || busy) return;
    setPending(true); setError('');
    try { setState(await bridge.check()); }
    catch { setError('检查更新失败，请重试'); }
    finally { setPending(false); }
  }
  async function install() {
    if (!bridge || busy || !ready) return;
    setPending(true); setError('');
    try { await prepareRestart(); setState(await bridge.install()); }
    catch { setError('无法准备重启，请确认画布已保存后重试'); }
    finally { setPending(false); }
  }
  async function download() {
    if (!bridge || pending || state.phase !== 'available') return;
    setPending(true); setError('');
    try { setState(await bridge.download()); }
    catch { setError('下载更新失败，请重试'); }
    finally { setPending(false); }
  }
  return <section className="nako-update-settings" aria-label="应用版本">
    <button type="button" className="nako-update-version" onClick={() => void check()}
      disabled={busy || !bridge || state.phase === 'disabled'} title="检查更新" aria-label={`当前版本 ${state.version}，检查更新`}>
      <span>Nako <strong>v{state.version}</strong></span><RefreshCw size={14} aria-hidden="true" />
    </button>
    <p role="status" aria-live="polite">{error || state.message}
      {state.phase === 'downloading' ? ` ${Math.floor(state.percent ?? 0)}%` : ''}</p>
    {state.nextVersion && <small>新版本 v{state.nextVersion}</small>}
    {state.phase === 'downloading' && <progress aria-label="更新下载进度" max={100} value={state.percent ?? 0} />}
    {state.phase === 'available' && <button type="button" disabled={pending} onClick={() => void download()}>
      <Download size={14} aria-hidden="true" />立即更新
    </button>}
    {ready && <button type="button" disabled={busy} onClick={() => void install()}>
      <RotateCcw size={14} aria-hidden="true" />重启安装
    </button>}
    {state.phase === 'error' && <button type="button" disabled={busy} onClick={() => void check()}>
      <Download size={14} aria-hidden="true" />重试更新
    </button>}
  </section>;
}

function useUpdateState(bridge: DesktopUpdateBridge | undefined, version: string) {
  const [state, setState] = useState<DesktopUpdateState>({ version, phase: bridge ? 'idle' : 'disabled',
    message: bridge ? '点击检查更新' : '自动更新仅适用于桌面安装版' });
  useEffect(() => {
    if (!bridge) return;
    let alive = true, received = false;
    const unsubscribe = bridge.subscribe(next => { received = true; if (alive) setState(next); });
    void bridge.state().then(next => { if (alive && !received) setState(next); }).catch(() => {});
    return () => { alive = false; unsubscribe(); };
  }, [bridge]);
  return [state, setState] as const;
}

export function UpdateModal({ bridge, version }: { bridge?: DesktopUpdateBridge; version: string }) {
  const [state, setState] = useUpdateState(bridge, version);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const visible = Boolean(bridge) && !closed && ['available', 'downloading', 'downloaded', 'installing', 'error'].includes(state.phase);
  useEffect(() => {
    if (['available', 'downloaded'].includes(state.phase)) setClosed(false);
  }, [state.phase, state.nextVersion]);
  const installing = state.phase === 'installing';
  useEffect(() => {
    if (visible && surface.current) return activateModal(surface.current, () => setClosed(true), { dismissible: !installing });
  }, [visible, installing]);
  if (!visible) return null;
  const download = async () => {
    if (!bridge || pending || state.phase !== 'available') return;
    setPending(true); setError('');
    try { setState(await bridge.download()); } catch { setError('下载更新失败，请重试'); }
    finally { setPending(false); }
  };
  const install = async () => {
    if (!bridge || pending || state.phase !== 'downloaded') return;
    setPending(true); setError('');
    try { await prepareRestart(); setState(await bridge.install()); }
    catch { setError('无法准备重启，请确认画布已保存后重试'); }
    finally { setPending(false); }
  };
  const retry = async () => {
    if (!bridge || pending) return;
    setPending(true); setError('');
    try {
      const next = await bridge.check();
      setState(next);
      if (next.phase === 'available') setClosed(false);
    } catch { setError('检查更新失败，请重试'); }
    finally { setPending(false); }
  };
  const title = state.phase === 'available' ? `发现新版本 ${state.nextVersion || ''}`
    : state.phase === 'downloading' ? '正在下载新版本'
      : state.phase === 'downloaded' ? '新版本准备好了'
        : state.phase === 'installing' ? '正在安装新版本' : '更新失败';
  return <div ref={surface} className="nako-update-overlay" role="dialog" aria-modal="true" aria-labelledby="nako-update-title">
    <div className="nako-update-modal">
      <button className="nako-update-close" type="button" onClick={() => setClosed(true)} disabled={state.phase === 'installing'} aria-label="关闭更新提示">×</button>
      <div className="nako-update-mark" aria-hidden="true">N</div>
      <p className="nako-update-kicker">Nako 画布 · 应用更新</p>
      <h2 id="nako-update-title">{title}</h2>
      <p className="nako-update-message">{error || state.message}</p>
      {state.releaseNotes && state.phase === 'available' && <div className="nako-update-notes">{state.releaseNotes}</div>}
      {state.phase === 'downloading' && <progress aria-label="更新下载进度" max={100} value={state.percent ?? 0} />}
      {state.phase === 'downloading' && <p className="nako-update-percent">{Math.floor(state.percent ?? 0)}%</p>}
      {state.phase === 'available' && <div className="nako-update-actions"><button type="button" className="nako-update-primary" onClick={() => void download()} disabled={pending}>立即更新</button><button type="button" onClick={() => setClosed(true)} disabled={pending}>稍后提醒</button></div>}
      {state.phase === 'downloaded' && <div className="nako-update-actions"><button type="button" className="nako-update-primary" onClick={() => void install()} disabled={pending}>立即更新并重启</button><button type="button" onClick={() => setClosed(true)} disabled={pending}>稍后重启</button></div>}
      {state.phase === 'error' && <div className="nako-update-actions"><button type="button" className="nako-update-primary" onClick={() => void retry()} disabled={pending}>重试更新</button><button type="button" onClick={() => setClosed(true)} disabled={pending}>关闭</button></div>}
      {state.phase === 'downloading' && <p className="nako-update-footnote">关闭提示后下载仍会继续。</p>}
      {state.phase === 'downloaded' && <p className="nako-update-footnote">重启前会保存当前画布并停止正在运行的任务。</p>}
    </div>
  </div>;
}

/** The desktop plugin owns the settings slot; the canvas never imports platform logic. */
export function installUpdateSettings() {
  const roots = new Map<Element, Root>();
  const bridge = desktopBridge();
  const version = bridge?.version || document.querySelector<HTMLMetaElement>('meta[name="nako-version"]')?.content || '未知';
  const sync = () => {
    for (const [element, root] of roots) if (!element.isConnected) { root.unmount(); roots.delete(element); }
    for (const element of document.querySelectorAll('[data-nako-settings-version]')) {
      if (roots.has(element)) continue;
      const root = createRoot(element);
      roots.set(element, root);
      root.render(<UpdateSettings bridge={bridge?.updates} version={version} />);
    }
  };
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
  const modalHost = document.createElement('div');
  modalHost.dataset.nakoUpdateHost = 'true';
  document.body.append(modalHost);
  const modalRoot = createRoot(modalHost);
  modalRoot.render(<UpdateModal bridge={bridge?.updates} version={version} />);
  return () => { observer.disconnect(); roots.forEach(root => root.unmount()); roots.clear(); modalRoot.unmount(); modalHost.remove(); };
}
