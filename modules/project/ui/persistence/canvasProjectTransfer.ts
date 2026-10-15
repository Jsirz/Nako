import type * as React from 'react';
import { ERRORS, PluginError } from '../../../contracts/index.js';
import { desktopBrowser } from '../../../kernel/browser';

interface Options {
  enabled: boolean;
  getWorkflowEpoch(): number;
  save(): Promise<{ id?: string; unchanged?: boolean } | null | undefined>;
  openProject(id: string): Promise<unknown>;
  openJson(event: { target: { files: File[]; value: string } }): Promise<void>;
}
async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return new PluginError(ERRORS.projectTransfer, body?.error || `工作流传输失败（${response.status}）。`);
}
async function downloadArchive(id: string | undefined, valid: () => boolean) {
  if (!id) throw new PluginError(ERRORS.projectTransfer, '请先打开画布。');
  const response = await fetch(`/api/workflows/${encodeURIComponent(id)}/backup`);
  if (!response.ok) throw await responseError(response);
  const blob = await response.blob();
  if (!valid()) return;
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const filename = encoded ? decodeURIComponent(encoded) : `canvas-${id}.nako`;
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useCanvasProjectTransfer(
  hooks: Pick<typeof React, 'useRef' | 'useState' | 'useEffect'>, options: Options,
) {
  const live = hooks.useRef(options);
  live.current = options;
  const lock = hooks.useRef(false), mounted = hooks.useRef(true);
  const [transferring, setTransferring] = hooks.useState(false);
  hooks.useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const run = async (operation: (valid: () => boolean, id?: string) => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setTransferring(true);
    const start = live.current, epoch = start.getWorkflowEpoch();
    const valid = () => mounted.current && live.current.getWorkflowEpoch() === epoch;
    try {
      const receipt = start.enabled ? await start.save() : undefined;
      if (!valid()) return;
      if (start.enabled && (!receipt?.id || receipt.unchanged === false))
        throw new PluginError(ERRORS.projectTransfer, '当前画布尚未全部保存，请保存后重试。');
      await operation(valid, receipt?.id);
    } catch (error) {
      if (valid()) throw error;
    } finally {
      lock.current = false;
      if (mounted.current) setTransferring(false);
    }
  };
  const exportWorkflow = () => run((valid, id) => downloadArchive(id, valid));
  const importWorkflow = (file: File) => run(async (valid) => {
    if (!file.name.toLowerCase().endsWith('.nako')) {
      await live.current.openJson({ target: { files: [file], value: '' } });
      return;
    }
    const response = await fetch('/api/workflows/restore?copy=true', desktopBrowser().projectArchiveRestoreRequest(file));
    if (!response.ok) throw await responseError(response);
    const result = await response.json();
    if (typeof result.id !== 'string') throw new PluginError(ERRORS.projectTransfer, '导入回执无效，请核对项目列表。');
    if (valid()) await live.current.openProject(result.id);
  });
  return { exportWorkflow, importWorkflow, transferring };
}
