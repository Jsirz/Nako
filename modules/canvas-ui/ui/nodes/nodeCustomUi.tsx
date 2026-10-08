import { canvasError } from '../../../contracts/canvasErrors.js';
import { useEffect, useRef, useState } from 'react';
import type { NodeRunReceipt } from '../../../contracts/nodeExecution.js';

const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
export function NodeCustomUi({ packageId, type, parameters, run, onChange, onRun, onCancel }: {
  packageId: string; type: string; parameters: Record<string, unknown>; run?: NodeRunReceipt;
  onChange(values: Record<string, unknown>): void; onRun(): void; onCancel(): void;
}) {
  const frame = useRef<HTMLIFrameElement>(null), [html, setHtml] = useState(''), [error, setError] = useState('');
  const channel = useRef(crypto.randomUUID());
  const handlers = useRef({ onChange, onRun, onCancel }); handlers.current = { onChange, onRun, onCancel };
  const state = useRef({ parameters, run }); state.current = { parameters, run };
  const send = () => frame.current?.contentWindow?.postMessage({ protocol: 'nako.node-ui/1', channel: channel.current, type: 'state', ...state.current }, '*');
  useEffect(() => {
    const abort = new AbortController();
    setHtml(''); setError(''); channel.current = crypto.randomUUID();
    fetch(`/api/node-packages/${encodeURIComponent(packageId)}/ui/${encodeURIComponent(type)}`, { signal: abort.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw canvasError(body.error, 'node-custom-ui.load'); return body.html; })
      .then(source => { if (!abort.signal.aborted) setHtml(`<meta http-equiv="Content-Security-Policy" content="${policy}">${source}`); })
      .catch(cause => { if (!abort.signal.aborted) setError(String(cause.message)); });
    return () => abort.abort();
  }, [packageId, type]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.protocol !== 'nako.node-ui/1') return;
      if (event.data.type === 'ready') { send(); return; }
      if (event.data.channel !== channel.current) return;
      if (event.data.type === 'parameters' && event.data.value && typeof event.data.value === 'object' && !Array.isArray(event.data.value)) {
        try { if (JSON.stringify(event.data.value).length <= 65536) handlers.current.onChange(event.data.value); } catch { /* Ignore cyclic or non-JSON messages. */ }
      }
      if (event.data.type === 'run') handlers.current.onRun();
      if (event.data.type === 'cancel') handlers.current.onCancel();
    };
    window.addEventListener('message', receive); return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(send, [parameters, run]);
  if (error) return <div role="alert">{error}</div>;
  return <iframe ref={frame} title="节点自定义界面" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={html} onLoad={send} className="w-full h-64 border-0" />;
}
