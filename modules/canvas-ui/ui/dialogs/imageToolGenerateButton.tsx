import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { browserHost, mediaCanvas } from '../../../kernel/browser';
import type { DefaultModelsClient } from '../../../contracts/defaultModels.js';
export function ImageToolGenerateButton({
  label,
  onClick,
  editing = false,
}: {
  label: string;
  editing?: boolean;
  aspectRatio?: string;
  onClick(): void;
}) {
  const defaults = browserHost.services.optional<DefaultModelsClient>('generation.defaults');
  const subscribe = React.useCallback((listener: () => void) => defaults?.subscribe(listener) ?? (() => {}), [defaults]);
  const getModelName = React.useCallback(() => mediaCanvas().imageToolModel()?.name || '', []);
  const modelName = React.useSyncExternalStore(subscribe, getModelName, getModelName);
  const clicked = React.useRef(false);
  const [pending, setPending] = React.useState(false);
  return (
    <button
      className="primary"
      aria-label={label}
      disabled={pending || (!editing && !modelName)}
      title={
        editing
          ? '保存角度参数'
          : modelName
            ? `使用 ${modelName}`
            : '请在设置中选择已配置且支持图生图的默认图像模型'
      }
      onClick={() => {
        if (clicked.current) return;
        clicked.current = true;
        setPending(true);
        try {
          onClick();
        } finally {
          clicked.current = false;
          setPending(false);
        }
      }}
    >
      {label}
      <ArrowUp size={17} />
    </button>
  );
}
