const invalid = (message) => Object.assign(new Error(message), {
  name: 'AgentCanvasError', code: 'AGENT_CANVAS_INCOMPLETE', status: 502,
});

function metadata(previous, incoming, label, valid) {
  // Chat-completion deltas may repeat metadata. Only arguments are appended.
  if (incoming == null || incoming === '') return previous;
  if (typeof incoming !== 'string' || !valid(incoming))
    throw invalid(`模型工具调用${label}无效。`);
  if (previous && previous !== incoming)
    throw invalid(`模型工具调用${label}在流式响应中发生变化，本次未执行。`);
  return incoming;
}

// Provider IDs are opaque correlation tokens, not our project/session IDs or file paths.
const validId = value => /^[\x21-\x7e]{1,1024}$/.test(value);
const validName = value => /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function createToolCallAccumulator() {
  const calls = new Map();
  return {
    accept(values, streaming) {
      if (values == null) return;
      if (!Array.isArray(values)) throw invalid('模型工具调用列表无效。');
      for (const [position, call] of values.entries()) {
        if (!call || typeof call !== 'object') throw invalid('模型工具调用格式无效。');
        const index = streaming ? call.index : position;
        if (!Number.isInteger(index) || index < 0 || index >= 8)
          throw invalid('模型工具调用数量无效。');
        if (call.type != null && call.type !== 'function') throw invalid('模型工具调用类型无效。');
        const current = calls.get(index) || { id: '', type: 'function', function: { name: '', arguments: '' } };
        current.id = metadata(current.id, call.id, '标识', validId);
        current.function.name = metadata(current.function.name, call.function?.name, '名称', validName);
        const args = call.function?.arguments;
        if (args != null) {
          if (typeof args !== 'string') throw invalid('模型工具调用参数格式无效。');
          current.function.arguments += args;
        }
        calls.set(index, current);
      }
    },
    get size() { return calls.size; },
    finish() {
      const values = [...calls.entries()].sort(([a], [b]) => a - b).map(([, call]) => call);
      if (values.some(call => !validId(call.id))) throw invalid('模型工具调用标识缺失或无效。');
      if (new Set(values.map(call => call.id)).size !== values.length)
        throw invalid('模型工具调用标识重复，本次未执行。');
      if (values.some(call => !validName(call.function.name))) throw invalid('模型工具调用名称缺失或无效。');
      return values;
    },
  };
}
