/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import { UI_FEATURES } from '../../../contracts/uiFeatures';
import type { Runtime, WorkflowGeneratorModel } from './canvasWorkflowGeneratorModel';
import { renderWorkflowField } from './canvasWorkflowFieldRender';

export function renderWorkflowHeader(React: Runtime, model: WorkflowGeneratorModel) {
  const { node, cloud, loading, nodeId, paused, hasProgress, progressPercent } = model;
  return (
    <header
      style={{
        height: '64px',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '0 16px',
        borderBottom: '1px solid var(--nk-border)',
        background: cloud ? 'var(--nk-info-bg)' : 'var(--nk-surface)',
      }}
    >
      <img src={'/nako-logo.png'} alt={''} width={26} height={26} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {node.title || 'ComfyUI 工作流'}
        </div>
        <div
          style={{
            marginTop: '3px',
            fontSize: '9px',
            letterSpacing: '.11em',
            color: cloud ? 'var(--nk-info)' : 'var(--nk-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          {(node.subtitle || '本地 ComfyUI') +
            (node.workflowRef?.verificationStatus === 'draft' ? ' · 草稿' : ' · VERIFIED') +
            (loading && nodeId ? ' · NODE ' + nodeId : '')}
        </div>
      </div>
      <span
        style={{
          marginLeft: 'auto',
          padding: '5px 8px',
          borderRadius: '999px',
          background: loading
            ? 'var(--nk-info-bg)'
            : node.status === 'success'
              ? 'var(--nk-success-bg)'
              : 'var(--nk-surface-raised)',
          color: loading
            ? 'var(--nk-info)'
            : node.status === 'success'
              ? 'var(--nk-success)'
              : 'var(--nk-text-muted)',
          fontSize: '9px',
          fontWeight: 700,
        }}
      >
        {paused
          ? '查询暂停'
          : loading && hasProgress
            ? progressPercent + '%'
            : loading
              ? '运行中'
              : node.status === 'success'
                ? '已完成'
                : '就绪'}
      </span>
    </header>
  );
}

export function renderWorkflowPrompt(React: Runtime, model: WorkflowGeneratorModel) {
  const { cloud, creativeTextParameters } = model;
  return (
    <section
      data-nako-workflow-prompt={'true'}
      style={{
        height: cloud ? '166px' : 'auto',
        flex: cloud ? 'none' : '1 1 auto',
        minHeight: 0,
        overflow: 'auto',
        padding: '12px 16px 10px',
        borderBottom: '1px solid var(--nk-border)',
        background: cloud ? 'var(--nk-surface)' : 'var(--nk-input)',
      }}
    >
      {creativeTextParameters.length ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {creativeTextParameters.map((parameter) => renderWorkflowField(React, model, parameter, !0))}
        </div>
      ) : (
        <div
          style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            gap: '4px',
            color: 'var(--nk-text-muted)',
            fontSize: '11px',
          }}
        >
          <span style={{ fontSize: '10px', letterSpacing: '.1em' }}>{'PROMPT'}</span>
          <span>{'请在工作流配置中外置一个文字参数'}</span>
        </div>
      )}
    </section>
  );
}

export function renderWorkflowPrimaryProgress(React: Runtime, model: WorkflowGeneratorModel) {
  const { cloud, progressLabel, hasProgress, progressPercent } = model;
  return (
    <div
      data-nako-workflow-primary-progress={'true'}
      role={'status'}
      aria-live={'polite'}
      style={{
        height: '44px',
        flex: 'none',
        display: 'grid',
        alignContent: 'center',
        gap: '6px',
        padding: '7px 16px 8px',
        borderBottom: '1px solid var(--nk-border)',
        background: cloud ? 'var(--nk-surface)' : 'var(--nk-input)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          minWidth: 0,
          color: 'var(--nk-info)',
          fontSize: '10px',
        }}
      >
        <span
          aria-hidden={'true'}
          style={{
            width: '6px',
            height: '6px',
            flex: 'none',
            borderRadius: '999px',
            background: 'var(--nk-info)',
          }}
        />
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {progressLabel}
        </span>
      </div>
      <div
        aria-hidden={'true'}
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
  );
}

export function renderWorkflowError(React: Runtime, model: WorkflowGeneratorModel) {
  const { node, errorDetailsId, errorDetails, errorSummary, patch, stop } = model;
  return (
    <div
      data-nako-workflow-error={'true'}
      role={'alert'}
      style={{
        flex: 'none',
        margin: '0 16px 10px',
        padding: '0 10px',
        border: '1px solid var(--nk-danger)',
        borderRadius: '7px',
        background: 'var(--nk-danger-bg)',
        color: 'var(--nk-danger)',
        fontSize: '11px',
        lineHeight: 1.45,
        overflow: 'hidden',
      }}
    >
      <button
        type={'button'}
        data-nako-workflow-error-summary={'true'}
        aria-controls={errorDetailsId}
        aria-expanded={errorDetails}
        onClick={() => patch({ isWorkflowErrorDetailsOpen: !errorDetails })}
        onPointerDown={stop}
        style={{
          width: '100%',
          height: '43px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: 'inherit',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {errorSummary}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            flex: 'none',
            color: 'var(--nk-danger)',
            fontSize: '9px',
            fontWeight: 650,
          }}
        >
          {errorDetails ? '收起详情' : '查看详情'}
        </span>
      </button>
      {errorDetails ? (
        <div
          id={errorDetailsId}
          data-nako-workflow-error-details={'true'}
          tabIndex={0}
          style={{
            height: '132px',
            overflow: 'auto',
            padding: '9px 0 10px',
            borderTop: '1px solid var(--nk-danger)',
            color: 'var(--nk-danger)',
            fontSize: '10px',
            fontWeight: 400,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {node.errorMessage}
        </div>
      ) : null}
    </div>
  );
}

export function renderWorkflowFooter(React: Runtime, model: WorkflowGeneratorModel) {
  const {
    node,
    cloud,
    instanceType,
    loading,
    patch,
    stop,
    settings,
    paused,
    resume,
    cancel,
    run,
  } = model;
  return (
    <footer
      style={{
        height: '66px',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 14px 0 16px',
        borderTop: '1px solid var(--nk-border)',
        background: cloud ? 'var(--nk-info-bg)' : 'var(--nk-surface)',
      }}
    >
      {cloud ? (
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {node.title || '工作流'}
          </div>
          <div style={{ marginTop: '3px', fontSize: '9px', color: 'var(--nk-info)' }}>
            {'素材可在参数配置中上传或连接'}
          </div>
        </div>
      ) : null}
      <div
        data-nako-workflow-actions={'true'}
        style={{
          marginLeft: 'auto',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {cloud && UI_FEATURES.runningHub ? (
          <label
            data-nako-runninghub-instance-type={'true'}
            title={'运行机器'}
            style={{ width: '132px', height: '38px', display: 'block' }}
          >
            <select
              aria-label={'RunningHub 运行机器'}
              value={instanceType}
              disabled={loading}
              onChange={(event) =>
                patch({
                  runningHubInstanceType:
                    event.target.value === 'default' ? 'default' : 'plus',
                })
              }
              onPointerDown={stop}
              onWheel={stop}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 10px',
                border: '1px solid var(--nk-border-control)',
                borderRadius: '9px',
                background: 'var(--nk-surface)',
                color: loading ? 'var(--nk-info)' : 'var(--nk-text)',
                fontSize: '10px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <option value={'plus'}>{'PLUS · 48GB'}</option>
              <option value={'default'}>{'STANDARD · 24GB'}</option>
            </select>
          </label>
        ) : null}
        <button
          type={'button'}
          aria-label={'参数配置'}
          aria-controls={'nako-workflow-settings-' + node.id}
          aria-expanded={settings}
          onClick={() => patch({ isWorkflowParametersOpen: !settings })}
          onPointerDown={stop}
          style={{
            height: '38px',
            minWidth: '88px',
            padding: '0 13px',
            border: '1px solid ' + (settings ? 'var(--nk-info)' : 'var(--nk-border)'),
            borderRadius: '9px',
            background: settings ? 'var(--nk-hover)' : 'var(--nk-surface-raised)',
            color: 'var(--nk-text)',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 120ms ease,border-color 120ms ease,color 120ms ease',
          }}
        >
          {settings ? '返回创作' : '参数配置'}
        </button>
        <button
          type={'button'}
          aria-label={paused ? '继续查询' : loading ? '取消工作流' : '运行工作流'}
          onClick={paused ? resume : loading ? cancel : run}
          onPointerDown={stop}
          style={{
            height: '38px',
            minWidth: '58px',
            padding: '0 13px',
            borderRadius: '9px',
            border: '1px solid ' + (loading ? 'var(--nk-border)' : 'var(--nk-info)'),
            background: loading ? 'var(--nk-hover)' : 'var(--nk-primary)',
            color: loading ? 'var(--nk-text-secondary)' : 'var(--nk-on-primary)',
            fontSize: '10px',
            fontWeight: 750,
            cursor: 'pointer',
            transition: 'background 120ms ease,border-color 120ms ease,color 120ms ease',
          }}
        >
          {paused ? '继续' : loading ? '取消' : '运行'}
        </button>
      </div>
    </footer>
  );
}
