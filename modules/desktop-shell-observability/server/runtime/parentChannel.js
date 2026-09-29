/** Only process readiness and graceful shutdown cross the local parent channel. */
export function createParentChannel() {
  const parentPort = process.parentPort;
  const listeners = new Set();
  const receive = (message) => {
    if ((message?.data ?? message)?.type === 'stop')
      for (const listener of [...listeners]) listener();
  };
  parentPort?.on?.('message', receive);
  process.on?.('message', receive);
  return {
    notifyReady() {
      if (parentPort?.postMessage) parentPort.postMessage({ type: 'ready' });
      else process.send?.({ type: 'ready' });
    },
    onStop(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
