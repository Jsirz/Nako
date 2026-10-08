/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import type { Runtime, WorkflowGeneratorModel } from './canvasWorkflowGeneratorModel';

function renderInvalidWorkflowConnection(React: Runtime) {
  return (
    <div
      data-nako-workflow-invalid-connection={'true'}
      role={'status'}
      title={'当前类型的输入已满或不受支持'}
      style={{
        position: 'absolute',
        left: '-16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 24,
        width: '30px',
        height: '30px',
        display: 'grid',
        placeItems: 'center',
        border: '1px solid var(--nk-danger)',
        borderRadius: '999px',
        background: 'var(--nk-danger-bg)',
        boxShadow: '0 0 0 4px rgba(251,113,133,.14)',
        color: 'var(--nk-danger)',
        fontSize: '19px',
        fontWeight: 800,
        pointerEvents: 'none',
      }}
    >
      {'×'}
    </div>
  );
}

export function renderWorkflowInputPorts(React: Runtime, model: WorkflowGeneratorModel) {
  const {
    node,
    adapter,
    invalidConnection,
    openSlots,
    isHoveredForConnection,
    isInvalidHover,
    input,
  } = model;
  return (
    <>
      {invalidConnection ? renderInvalidWorkflowConnection(React) : null}
      {openSlots.map((slot) => (
        <div
          style={{
            position: 'absolute',
            left: '-12px',
            top: (adapter?.getInputPortY(node, slot.slotIndex) || 228) + 'px',
            transform: 'translateY(-50%) scale(' + (isHoveredForConnection ? 1 : 0.72) + ')',
            transformOrigin: 'center',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isHoveredForConnection ? 1 : 0,
            pointerEvents: isHoveredForConnection ? 'auto' : 'none',
            transition: 'opacity 120ms ease, transform 120ms ease',
          }}
          key={slot.id}
        >
          <button
            type={'button'}
            title={slot.label}
            aria-label={'连接' + slot.label}
            aria-hidden={isHoveredForConnection ? 'false' : 'true'}
            tabIndex={isHoveredForConnection ? 0 : -1}
            data-nako-connector-node-id={node.id}
            data-nako-connector-side={'left'}
            data-nako-connector-port-index={slot.slotIndex}
            onPointerDown={(event) => input(event, slot.slotIndex)}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '999px',
              border: '1px solid ' + (isInvalidHover ? 'var(--nk-danger)' : 'var(--nk-info)'),
              background: isInvalidHover ? 'var(--nk-danger-bg)' : 'var(--nk-surface)',
              color: isInvalidHover ? 'var(--nk-danger)' : 'var(--nk-info)',
              boxShadow: isInvalidHover
                ? '0 0 0 3px rgba(251,113,133,.1)'
                : '0 0 0 3px rgba(96,165,250,.1)',
              fontSize: '16px',
              lineHeight: '20px',
              cursor: 'crosshair',
            }}
          >
            {isInvalidHover ? '×' : '+'}
          </button>
          <span
            data-nako-workflow-port-label={slot.id}
            style={{
              position: 'absolute',
              right: '32px',
              minHeight: '24px',
              display: 'flex',
              alignItems: 'center',
              padding: '0 7px',
              border: '1px solid ' + (isInvalidHover ? 'var(--nk-danger)' : 'var(--nk-border)'),
              borderRadius: '6px',
              background: isInvalidHover ? 'var(--nk-danger-bg)' : 'var(--nk-surface)',
              boxShadow: '0 8px 24px rgba(0,0,0,.34)',
              color: isInvalidHover ? 'var(--nk-danger)' : 'var(--nk-info)',
              fontSize: '10px',
              fontWeight: 650,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {(adapter?.getMediaKindLabel(slot.mediaKind) || '数据') + ' · ' + slot.label}
          </span>
        </div>
      ))}
    </>
  );
}

export function renderWorkflowOutputPorts(React: Runtime, model: WorkflowGeneratorModel) {
  const { outputs, node, adapter, hover, output } = model;
  return outputs.map((port, index) => (
    <div
      data-nako-workflow-output-port={port.id}
      style={{
        position: 'absolute',
        right: '-14px',
        top: (adapter?.getOutputPortY(node, index) || 454) + 'px',
        transform: 'translateY(-50%) scale(' + (hover ? 1 : 0.72) + ')',
        transformOrigin: 'center',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: hover ? 1 : 0,
        pointerEvents: hover ? 'auto' : 'none',
        transition: 'opacity 120ms ease, transform 120ms ease',
      }}
      key={port.id}
    >
      <button
        type={'button'}
        title={port.label}
        aria-label={'连接输出' + port.label}
        aria-hidden={hover ? 'false' : 'true'}
        tabIndex={hover ? 0 : -1}
        data-nako-connector-node-id={node.id}
        data-nako-connector-side={'right'}
        data-nako-connector-port-index={index}
        onPointerDown={(event) => output(event, index)}
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '999px',
          border: '1px solid var(--nk-info)',
          background: 'var(--nk-surface)',
          color: port.primary ? 'var(--nk-info)' : 'var(--nk-info)',
          boxShadow: '0 0 0 3px rgba(96,165,250,.1)',
          fontSize: '16px',
          lineHeight: '20px',
          cursor: 'crosshair',
        }}
      >
        {'+'}
      </button>
      <span
        data-nako-workflow-port-label={port.id}
        style={{
          position: 'absolute',
          left: '32px',
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 7px',
          border: '1px solid var(--nk-border)',
          borderRadius: '6px',
          background: 'var(--nk-surface)',
          boxShadow: '0 8px 24px rgba(0,0,0,.34)',
          color: 'var(--nk-info)',
          fontSize: '10px',
          fontWeight: 650,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {(adapter?.getMediaKindLabel(port.mediaKind) || '数据') + ' · ' + port.label}
      </span>
    </div>
  ));
}
