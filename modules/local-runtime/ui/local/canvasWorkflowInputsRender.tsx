/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import type { WorkflowCanvasInputSlot } from '../../../contracts/workflowCanvasNodeProtocol';
import { connectedNodeText, type Runtime, type WorkflowGeneratorModel } from './canvasWorkflowGeneratorModel';

export function renderWorkflowSlotCard(
  React: Runtime,
  model: WorkflowGeneratorModel,
  slot: WorkflowCanvasInputSlot,
) {
  const node = model.linkedNode(slot);
  const url = node?.url || node?.resultUrl || node?.lastFrame;
  const textValue = connectedNodeText(node);
  const connected = !!node;
  return (
    <div
      data-nako-workflow-input={slot.mediaKind}
      style={{
        position: 'relative',
        height: '52px',
        display: 'grid',
        gridTemplateColumns: '42px minmax(0,1fr)',
        alignItems: 'center',
        gap: '10px',
        padding: '5px 9px 5px 5px',
        border: '1px solid ' + (connected ? 'var(--nk-info)' : 'var(--nk-border)'),
        borderRadius: '8px',
        background: connected ? 'var(--nk-info-bg)' : 'var(--nk-surface)',
        overflow: 'hidden',
      }}
      key={slot.id}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          borderRadius: '6px',
          background: 'var(--nk-input)',
          color: connected ? 'var(--nk-text)' : 'var(--nk-text-muted)',
          fontSize: '16px',
        }}
      >
        {url && (slot.mediaKind === 'image' || slot.mediaKind === 'mask') ? (
          <img
            src={url}
            alt={''}
            draggable={!1}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : url && slot.mediaKind === 'video' ? (
          <video
            src={url}
            muted={!0}
            preload={'metadata'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span>
            {slot.mediaKind === 'audio'
              ? '♫'
              : slot.mediaKind === 'video'
                ? '▶'
                : slot.mediaKind === 'text'
                  ? 'T'
                  : '◇'}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: connected ? 'var(--nk-text)' : 'var(--nk-text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {slot.label}
        </div>
        <div
          style={{
            marginTop: '3px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: connected ? 'var(--nk-info)' : 'var(--nk-text-muted)',
            fontSize: '9px',
            letterSpacing: slot.mediaKind === 'text' ? '0' : '.06em',
            textTransform: slot.mediaKind === 'text' ? 'none' : 'uppercase',
          }}
        >
          {connected
            ? slot.mediaKind === 'text' && textValue
              ? String(textValue)
              : '已连接'
            : slot.mediaKind === 'text'
              ? '可连接文本节点'
              : '等待素材'}
        </div>
      </div>
    </div>
  );
}

export function renderWorkflowOpenSlot(
  React: Runtime,
  model: WorkflowGeneratorModel,
  slot: WorkflowCanvasInputSlot,
) {
  const { uploadingSlot, adapter, input, stop, upload } = model;
  const uploading = uploadingSlot === slot.slotIndex;
  const mediaLabel = adapter?.getMediaKindLabel(slot.mediaKind) || '素材';
  const accept =
    slot.mediaKind === 'video'
      ? '.m4v,.mov,.mp4,.webm,.mkv,video/*'
      : slot.mediaKind === 'audio'
        ? '.mp3,.m4a,.wav,.ogg,.aac,.flac,audio/*'
        : '.jpeg,.jpg,.png,.webp,.bmp,image/*';
  return (
    <div
      data-nako-workflow-open-input={slot.mediaKind}
      data-nako-workflow-input-required={slot.required ? 'true' : 'false'}
      style={{
        minHeight: '62px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 10px',
        border: '1px dashed ' + (slot.required ? 'var(--nk-info)' : 'var(--nk-info)'),
        borderRadius: '8px',
        background: slot.required ? 'var(--nk-info-bg)' : 'var(--nk-surface)',
      }}
      key={slot.id}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            minWidth: 0,
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: 'var(--nk-text)',
              fontSize: '11px',
              fontWeight: 650,
            }}
          >
            {slot.label}
          </span>
          <span
            style={{
              flex: 'none',
              padding: '2px 5px',
              borderRadius: '999px',
              background: slot.required ? 'var(--nk-info-bg)' : 'var(--nk-surface-raised)',
              color: slot.required ? 'var(--nk-info)' : 'var(--nk-info)',
              fontSize: '8px',
              fontWeight: 700,
            }}
          >
            {slot.required ? '必填' : '可选'}
          </span>
        </div>
        <div style={{ marginTop: '4px', color: 'var(--nk-info)', fontSize: '9px' }}>
          {mediaLabel + ' · 尚未连接'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type={'button'}
          onPointerDown={(event) => input(event, slot.slotIndex)}
          style={{
            height: '30px',
            padding: '0 9px',
            border: '1px solid var(--nk-info)',
            borderRadius: '7px',
            background: 'var(--nk-info-bg)',
            color: 'var(--nk-info)',
            fontSize: '9px',
            fontWeight: 650,
            cursor: 'crosshair',
            whiteSpace: 'nowrap',
          }}
        >
          {'连接已有素材'}
        </button>
        <label
          style={{
            height: '30px',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 9px',
            border: '1px solid ' + (uploading ? 'var(--nk-info)' : 'var(--nk-info)'),
            borderRadius: '7px',
            background: uploading ? 'var(--nk-surface-raised)' : 'var(--nk-info-bg)',
            color: uploading ? 'var(--nk-info)' : 'var(--nk-info)',
            fontSize: '9px',
            fontWeight: 700,
            cursor: uploading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {uploading ? '上传中…' : '上传文件'}
          <input
            type={'file'}
            accept={accept}
            disabled={uploading}
            onClick={stop}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) upload(slot, file);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
}
