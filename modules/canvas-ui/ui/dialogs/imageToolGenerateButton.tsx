import * as React from 'react';
import { ArrowUp } from 'lucide-react';
import { imageToolModel } from '../../../asset-media/api/ui/media/imageAngleDraft';
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
  const clicked = React.useRef(false);
  const [pending, setPending] = React.useState(false);
  return (
    <button
      className="primary"
      aria-label={label}
      disabled={pending || (!editing && !imageToolModel)}
      title={
        editing
          ? '保存角度参数'
          : imageToolModel
            ? `使用 ${imageToolModel.name}`
            : '没有可用的图生图模型'
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
