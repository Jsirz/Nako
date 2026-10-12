import type * as ReactTypes from 'react';
import { generationUi } from '../../../kernel/browser';
import { ERRORS, PluginError } from '../../../contracts/errors.js';
type Runtime = Pick<typeof ReactTypes, 'useState' | 'useEffect'>;
interface Availability {
  checking: boolean;
  blocked: boolean;
  warning: string;
}
export function useGenerationAvailability(React: Runtime, model: string, mode: string) {
  const key = JSON.stringify([model, mode]);
  const [state, setState] = React.useState<Availability & { key: string }>({
    key,
    checking: true,
    blocked: false,
    warning: '',
  });
  React.useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let request: AbortController | undefined;
    let invalidModel = false;
    const check = async () => {
      if (disposed) return;
      request = new AbortController();
      const current = request;
      timeout = setTimeout(() => current.abort(), 10000);
      try {
        const result = await generationUi().concurrency(model, mode, current.signal);
        if (!disposed)
          setState({
            key,
            checking: false,
            blocked: result.blocked,
            warning: result.blocked
              ? `${result.modelId || model} 并发已满 ${result.inFlight}/${result.maxConcurrent}`
              : '',
          });
      } catch (error) {
        invalidModel = error instanceof PluginError && error.code === ERRORS.invalidModel;
        if (!disposed)
          setState({
            key,
            checking: false,
            blocked: invalidModel,
            warning: invalidModel && error instanceof Error
              ? error.message : '暂时无法读取并发状态，生成前会再次检查',
          });
      } finally {
        clearTimeout(timeout);
        if (!disposed && !invalidModel) timer = setTimeout(() => void check(), 2000);
      }
    };
    setState({ key, checking: true, blocked: false, warning: '' });
    if (model) void check();
    else setState({ key, checking: false, blocked: true, warning: '请选择模型，或在设置中配置有效的默认模型' });
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(timeout);
      request?.abort();
    };
  }, [model, mode, key]);
  return state.key === key ? state : { checking: true, blocked: false, warning: '' };
}
