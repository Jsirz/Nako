import { launchNodeSandbox } from './nodeSandboxProcess.js';
import { NODE_ERROR, nodeError } from '../contracts/nodeExecution.js';

export function executeIsolatedNode({ sources, entry, method, timeoutMs = 120000, logger, pluginId }, input, context = {}) {
  if (context.signal?.aborted) return Promise.reject(nodeError(NODE_ERROR.CANCELLED, '节点运行已停止'));
  return new Promise((resolve, reject) => {
    let child, stderr = '';
    const report = details => logger?.error?.('[desktop-shell-observability] Node sandbox failed', {
      pluginId, method, runId: context.runId, nodeId: context.nodeId, ...details,
    });
    try { child = launchNodeSandbox(); }
    catch (error) {
      report({ message: error.message, code: error.code });
      reject(nodeError(NODE_ERROR.FAILED, `节点隔离进程启动失败：${error.message}`));
      return;
    }
    // Bounded diagnostic tail; never attach stderr, inputs or credentials to UI errors.
    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', chunk => { stderr = (stderr + chunk).slice(-8192); });
    const controller = new AbortController();
    let settled = false, messages = 0;
    const finish = (error, value) => {
      if (settled) return; settled = true;
      clearTimeout(timer); context.signal?.removeEventListener('abort', abort);
      controller.abort(); child.kill();
      error ? reject(error) : resolve(value);
    };
    const abort = () => finish(nodeError(NODE_ERROR.CANCELLED, '节点运行已停止'));
    const timer = setTimeout(() => finish(nodeError(NODE_ERROR.TIMEOUT, '节点运行超时')), timeoutMs);
    context.signal?.addEventListener('abort', abort, { once: true });
    const failed = error => {
      if (settled) return;
      report({ message: error.message, code: error.code, stderr });
      finish(nodeError(NODE_ERROR.FAILED, `节点隔离进程通信或启动失败：${error.message}`));
    };
    child.on('error', failed);
    // close follows exit and drains stderr, including bootstrap/dependency failures.
    child.on('close', (exitCode, signal) => {
      if (settled) return;
      report({ exitCode, signal, stderr });
      finish(nodeError(NODE_ERROR.FAILED,
        `节点隔离进程退出（退出码 ${exitCode ?? '未知'}${signal ? `，信号 ${signal}` : ''}），请查看后端错误日志`,
        { exitCode, signal }));
    });
    const send = message => {
      if (settled) return;
      try { child.send(message, error => { if (error) failed(error); }); }
      catch (error) { failed(error); }
    };
    child.on('message', async message => {
      if (settled) return;
      if (++messages > 1024 || JSON.stringify(message).length > 4 * 1024 * 1024) return finish(nodeError(NODE_ERROR.INVALID, '节点消息超出限制'));
      if (message.type === 'result') return finish(null, message.value);
      if (message.type === 'error') return finish(nodeError(message.code || NODE_ERROR.FAILED, message.message));
      if (message.type === 'progress') { context.progress?.(message.message); return; }
      if (message.type !== 'call') return;
      try {
        if (!context.call) throw nodeError(NODE_ERROR.DENIED, '没有能力授权');
        const value = await context.call(message.capability, message.input, message.stepId, controller.signal);
        if (!settled && child.connected) send({ type: 'reply', id: message.id, value });
      } catch (error) {
        if (!settled && child.connected) send({ type: 'reply', id: message.id, error: error.message, code: error.code });
      }
    });
    send({ sources, entry, method, input, timeoutMs, runId: context.runId || '', nodeId: context.nodeId || '' });
  });
}
