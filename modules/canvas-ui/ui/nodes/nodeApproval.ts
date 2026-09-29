import type { NodeRunReceipt } from '../../../contracts/nodeExecution.js';

/** Host-owned approval surface; sandboxed node UI cannot approve capability requests. */
export function confirmNodeRun(run: NodeRunReceipt): Promise<boolean> {
  return new Promise(resolve => {
    const dialog = document.createElement('dialog');
    dialog.className = 'rounded-xl border border-[var(--nk-border)] bg-[var(--nk-panel)] text-[var(--nk-text)] p-5 max-w-md shadow-xl';
    const title = document.createElement('h3'); title.textContent = '确认节点运行'; title.className = 'font-semibold mb-3';
    const details = document.createElement('p');
    details.textContent = `允许使用：${run.capabilities.join('、') || '本地计算'}。本次最多调用模型 ${run.maxModelCalls} 次。`;
    const actions = document.createElement('div'); actions.className = 'flex justify-end gap-3 mt-5';
    const finish = (value: boolean) => { dialog.close(); dialog.remove(); resolve(value); };
    for (const [label, value] of [['取消', false], ['授权并运行', true]] as const) {
      const button = document.createElement('button'); button.textContent = label;
      button.className = 'rounded px-3 py-2 border border-[var(--nk-border)]';
      button.onclick = () => finish(value); actions.append(button);
    }
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    const preview = document.createElement('pre'); preview.className = 'mt-3 text-xs max-h-48 overflow-auto whitespace-pre-wrap';
    preview.textContent = JSON.stringify(run.nodes, null, 2);
    dialog.append(title, details, preview, actions); document.body.append(dialog); dialog.showModal();
  });
}
