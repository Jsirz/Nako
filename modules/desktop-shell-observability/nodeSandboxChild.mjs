import { NODE_ERROR } from '../contracts/nodeExecution.js';
import { desktopNodeError as nodeError } from '../contracts/desktopErrors.js';
import { getQuickJS } from 'quickjs-emscripten';
import path from 'node:path';

// Only this trusted bootstrap has Node APIs. Package code runs in QuickJS WASM.
process.once('message', async packet => {
  const quick = await getQuickJS(), runtime = quick.newRuntime();
  runtime.setMemoryLimit(64 * 1024 * 1024);
  runtime.setMaxStackSize(512 * 1024);
  const deadline = Date.now() + packet.timeoutMs;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  runtime.setModuleLoader(name => {
    if (!Object.hasOwn(packet.sources, name)) throw nodeError(NODE_ERROR.DENIED, `Module denied: ${name}`);
    return packet.sources[name];
  }, (base, name) => {
    if (!name.startsWith('./') && !name.startsWith('../')) throw nodeError(NODE_ERROR.DENIED, `Import denied: ${name}`);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(base), name));
    if (resolved.startsWith('../') || resolved.startsWith('/')) throw nodeError(NODE_ERROR.DENIED, 'Import outside package');
    return resolved;
  });
  const vm = runtime.newContext(), pending = new Map();
  let sequence = 0;
  const pump = () => { const result = runtime.executePendingJobs(); if (result.error) result.error.dispose(); };
  const call = vm.newFunction('call', (name, args, step) => {
    const deferred = vm.newPromise(), id = ++sequence;
    if (sequence > 512) { deferred.dispose(); throw nodeError(NODE_ERROR.INVALID, 'Capability message limit exceeded'); }
    pending.set(id, deferred);
    process.send({ type: 'call', id, capability: vm.getString(name), input: vm.dump(args), stepId: vm.getString(step) });
    return deferred.handle;
  });
  const progress = vm.newFunction('progress', message => {
    if (++sequence < 512) process.send({ type: 'progress', message: vm.getString(message).slice(0, 1000) });
  });
  vm.setProp(vm.global, '__call', call); call.dispose();
  vm.setProp(vm.global, '__progress', progress); progress.dispose();
  process.on('message', message => {
    if (message.type !== 'reply') return;
    const deferred = pending.get(message.id);
    if (!deferred) return;
    pending.delete(message.id);
    if (message.error) {
      const failure = nodeError(message.code || NODE_ERROR.FAILED, message.error);
      const error = vm.newError(message.error);
      const code = vm.newString(failure.code); vm.setProp(error, 'code', code); code.dispose();
      const status = vm.newNumber(message.status ?? failure.status); vm.setProp(error, 'status', status); status.dispose();
      const context = vm.unwrapResult(vm.evalCode(`JSON.parse(${JSON.stringify(JSON.stringify(message.context || failure.context))})`));
      vm.setProp(error, 'context', context); context.dispose();
      deferred.reject(error); error.dispose();
    } else {
      const value = vm.unwrapResult(vm.evalCode(`JSON.parse(${JSON.stringify(JSON.stringify(message.value ?? null))})`));
      deferred.resolve(value); value.dispose();
    }
    deferred.dispose(); pump();
  });
  const timer = setInterval(pump, 5);
  try {
    const missing = nodeError(NODE_ERROR.MISSING, 'Executor not exported');
    const bootstrap = `import * as pkg from './${packet.entry}';
      const handler = (pkg.executors || pkg.default?.executors || {})[${JSON.stringify(packet.method)}];
      if (typeof handler !== 'function') throw ${JSON.stringify({ message: missing.message, code: missing.code, status: missing.status, context: missing.context })};
      globalThis.__result = Promise.resolve(handler(${JSON.stringify(packet.input)}, Object.freeze({
        runId: ${JSON.stringify(packet.runId)}, nodeId: ${JSON.stringify(packet.nodeId)},
        call: __call, progress: __progress
      })));`;
    const evaluated = vm.evalCode(bootstrap, 'bootstrap.mjs', { type: 'module' });
    if (evaluated.error) {
      const failure = vm.dump(evaluated.error); evaluated.error.dispose();
      throw nodeError(failure.code || NODE_ERROR.FAILED, failure.message || '节点执行失败');
    }
    evaluated.value.dispose();
    const promise = vm.getProp(vm.global, '__result');
    const result = await vm.resolvePromise(promise); promise.dispose();
    if (result.error) {
      const failure = vm.dump(result.error); result.error.dispose();
      throw nodeError(failure.code || NODE_ERROR.FAILED, failure.message || '节点执行失败');
    }
    const value = result.value; const output = vm.dump(value); value.dispose();
    if (JSON.stringify(output).length > 4 * 1024 * 1024) throw nodeError(NODE_ERROR.INVALID, 'Node output exceeds 4 MB');
    process.send({ type: 'result', value: output });
  } catch (error) {
    const failure = nodeError(error.code || NODE_ERROR.FAILED, String(error.message || error).slice(0, 2000));
    process.send({ type: 'error', code: failure.code, status: failure.status, context: failure.context, message: failure.message });
  }
  finally {
    clearInterval(timer);
    for (const deferred of pending.values()) deferred.dispose();
    vm.dispose(); runtime.dispose(); process.disconnect();
  }
});
