import * as React from 'react';
import { Copy, Eye } from 'lucide-react';

export function ReadOnlyBanner({ onCopy }: { onCopy(): Promise<void> }) {
  const [copying, setCopying] = React.useState(false);
  const [error, setError] = React.useState('');
  return (
    <div className="nako-read-only-banner" role="status">
      <div className="nako-read-only-copy">
        <Eye size={17} />
        <span>作品制作过程 · 只读预览</span>
        {error && <span role="alert">{error}</span>}
      </div>
      <button
        type="button"
        disabled={copying}
        onClick={async () => {
          setCopying(true);
          setError('');
          try { await onCopy(); }
          catch (cause) { setError(cause instanceof Error ? cause.message : '复制项目失败'); }
          finally { setCopying(false); }
        }}
      >
        <Copy size={15} />{copying ? '正在复制…' : '复制该项目'}
      </button>
    </div>
  );
}
