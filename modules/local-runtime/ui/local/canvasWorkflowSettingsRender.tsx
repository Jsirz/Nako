/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import type { Runtime, WorkflowGeneratorModel } from './canvasWorkflowGeneratorModel';
import { renderWorkflowField } from './canvasWorkflowFieldRender';
import { renderWorkflowOpenSlot, renderWorkflowSlotCard } from './canvasWorkflowInputsRender';

function renderWorkflowSettingsInputs(React: Runtime, model: WorkflowGeneratorModel) {
  const { connectedCount, slots, cardSlots, openAssetSlots, limitNotice } = model;
  return (
    <div>
      <div
        style={{
          marginBottom: '8px',
          color: 'var(--nk-text-muted)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }}
      >
        {'INPUTS · ' + connectedCount + ' / ' + slots.length + ' 已连接'}
      </div>
      {cardSlots.length || openAssetSlots.length ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
            gap: '8px',
          }}
        >
          {...cardSlots.map((slot) => renderWorkflowSlotCard(React, model, slot))}
          {...openAssetSlots.map((slot) => renderWorkflowOpenSlot(React, model, slot))}
        </div>
      ) : (
        <div
          style={{
            padding: '10px 12px',
            border: '1px solid var(--nk-border)',
            borderRadius: '8px',
            background: 'var(--nk-input)',
            color: 'var(--nk-text-muted)',
            fontSize: '10px',
          }}
        >
          {'当前工作流没有需要连接的素材。'}
        </div>
      )}
      {limitNotice ? (
        <div
          data-nako-workflow-input-limit={'true'}
          style={{
            marginTop: '8px',
            color: 'var(--nk-warning)',
            fontSize: '9px',
          }}
        >
          {limitNotice}
        </div>
      ) : null}
    </div>
  );
}

function renderWorkflowExecution(React: Runtime, model: WorkflowGeneratorModel) {
  const { loading, progressLabel, hasProgress, progressPercent, node, outputHint, outputs } = model;
  return (
    <div
      data-nako-workflow-execution={'true'}
      style={{
        display: 'grid',
        gap: '9px',
        paddingTop: '12px',
        borderTop: '1px solid var(--nk-border)',
      }}
    >
      <div
        style={{
          color: 'var(--nk-text-muted)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }}
      >
        {'EXECUTION · 执行与输出'}
      </div>
      {loading ? (
        <div
          data-nako-workflow-progress={'true'}
          style={{
            display: 'grid',
            gap: '8px',
            padding: '10px 12px',
            border: '1px solid var(--nk-info)',
            borderRadius: '8px',
            background: 'var(--nk-surface)',
          }}
        >
          <span style={{ color: 'var(--nk-info)', fontSize: '10px' }}>
            {progressLabel}
          </span>
          <div
            style={{
              height: '3px',
              overflow: 'hidden',
              borderRadius: '999px',
              background: 'var(--nk-hover)',
            }}
          >
            <div
              style={{
                width: hasProgress ? progressPercent + '%' : '34%',
                height: '100%',
                borderRadius: 'inherit',
                background: 'var(--nk-info)',
                transition: 'width .22s ease',
                animation: hasProgress
                  ? 'none'
                  : 'nako-workflow-pulse 1.2s ease-in-out infinite alternate',
              }}
            />
          </div>
        </div>
      ) : null}
      <div
        data-nako-workflow-external-output={'true'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '10px 12px',
          border: '1px solid var(--nk-border)',
          borderRadius: '8px',
          background: 'var(--nk-input)',
          color:
            node.status === 'success' ? 'var(--nk-success)' : 'var(--nk-text-muted)',
          fontSize: '10px',
        }}
      >
        <span style={{ fontSize: '15px' }}>
          {node.status === 'success' ? '✓' : '↗'}
        </span>
        <span style={{ minWidth: 0 }}>{outputHint}</span>
        <span
          style={{
            marginLeft: 'auto',
            color: 'var(--nk-text-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          {outputs.length + ' 个输出'}
        </span>
      </div>
    </div>
  );
}

export function renderWorkflowSettings(React: Runtime, model: WorkflowGeneratorModel) {
  const { node, cloud, editBindings, stop, settingsParameters } = model;
  return (
    <section
      id={'nako-workflow-settings-' + node.id}
      data-nako-workflow-parameters={'true'}
      style={{
        flex: '1 0 auto',
        minHeight: 0,
        overflow: 'visible',
        padding: '16px',
        background: cloud ? 'var(--nk-info-bg)' : 'var(--nk-surface)',
      }}
    >
      <div style={{ display: 'grid', gap: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--nk-border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 650,
                color: 'var(--nk-text)',
              }}
            >
              {'参数配置'}
            </div>
            <div
              style={{
                marginTop: '3px',
                fontSize: '9px',
                color: 'var(--nk-text-muted)',
              }}
            >
              {'输入、生成参数与执行信息集中在这里。'}
            </div>
          </div>
          {cloud ? null : (
            <button
              type={'button'}
              aria-label={'编辑外置参数'}
              onClick={editBindings}
              onPointerDown={stop}
              style={{
                height: '32px',
                padding: '0 11px',
                border: '1px solid var(--nk-border)',
                borderRadius: '8px',
                background: 'var(--nk-surface-raised)',
                color: 'var(--nk-text)',
                fontSize: '10px',
                fontWeight: 650,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {'编辑字段'}
            </button>
          )}
        </div>
        {renderWorkflowSettingsInputs(React, model)}
        {settingsParameters.length ? (
          <div>
            <div
              style={{
                marginBottom: '8px',
                color: 'var(--nk-text-muted)',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              {'PARAMETERS · 生成参数'}
            </div>
            <div style={{ display: 'grid', gap: '9px' }}>
              {settingsParameters.map((parameter) => renderWorkflowField(React, model, parameter, !1))}
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '24px 0',
              color: 'var(--nk-text-muted)',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            {'没有其他需要配置的参数。'}
          </div>
        )}
        {renderWorkflowExecution(React, model)}
      </div>
    </section>
  );
}
