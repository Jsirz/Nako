/** @jsxRuntime classic */
/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import type * as ReactTypes from 'react';
import {
  asRecord,
  connectedNodeText,
  isTextParameter,
  workflowControlStyle as controlStyle,
  type Runtime,
  type Parameter,
  type WorkflowGeneratorModel,
} from './canvasWorkflowGeneratorModel';

function workflowFieldModel(model: WorkflowGeneratorModel, parameter: Parameter) {
  const { values, numberDrafts, setNumberDrafts, parameterNode, set, onUpdate } = model;
  const kind = parameter.control?.kind || 'text';
  const linked = isTextParameter(parameter) ? parameterNode(parameter) : null;
  const connected = !!linked;
  const linkedEditable = connected && String(linked.type || '').toLowerCase() === 'text';
  const readOnly = connected && !linkedEditable;
  const value = connected
    ? connectedNodeText(linked)
    : (values[parameter.key] ?? parameter.control?.defaultValue ?? '');
  const numeric = kind === 'number' || kind === 'slider' || kind === 'seed';
  const seedPolicy =
    kind === 'seed' &&
    value &&
    typeof value === 'object' &&
    ['fixed', 'random', 'increment', 'decrement'].includes(String(asRecord(value).mode))
      ? String(asRecord(value).mode)
      : 'fixed';
  const seedStep =
    Number.isSafeInteger(Number(parameter.control?.step)) &&
    Number(parameter.control?.step) > 0
      ? Number(parameter.control.step)
      : 1;
  const number =
    kind === 'seed' && value && typeof value === 'object' ? asRecord(value).value : value;
  const defaultNumber =
    kind === 'seed' &&
    parameter.control?.defaultValue &&
    typeof parameter.control.defaultValue === 'object'
      ? asRecord(parameter.control.defaultValue).value
      : parameter.control?.defaultValue;
  const confirmedNumber =
    number !== '' && number !== null && number !== void 0 && Number.isFinite(Number(number))
      ? Number(number)
      : defaultNumber !== '' &&
          defaultNumber !== null &&
          defaultNumber !== void 0 &&
          Number.isFinite(Number(defaultNumber))
        ? Number(defaultNumber)
        : void 0;
  const hasNumberDraft = Object.prototype.hasOwnProperty.call(numberDrafts, parameter.key);
  const numberDisplay =
    kind === 'seed' && seedPolicy === 'random'
      ? ''
      : hasNumberDraft
        ? numberDrafts[parameter.key]
        : confirmedNumber === void 0
          ? ''
          : String(confirmedNumber);
  const setNumberDraft = (next: string) =>
    setNumberDrafts((current) => ({ ...current, [parameter.key]: next }));
  const clearNumberDraft = () =>
    setNumberDrafts((current) => {
      const next = { ...current };
      delete next[parameter.key];
      return next;
    });
  const changeNumber = (raw: string) => {
    setNumberDraft(raw);
    if (raw === '') return;
    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue)) return;
    if (kind === 'seed')
      set(
        parameter.key,
        seedPolicy === 'increment' || seedPolicy === 'decrement'
          ? { mode: seedPolicy, value: numericValue, step: seedStep }
          : { mode: 'fixed', value: numericValue },
      );
    else set(parameter.key, numericValue);
  };
  const changeSeedMode = (event: ReactTypes.ChangeEvent<HTMLSelectElement>) => {
    const mode = event.target.value;
    clearNumberDraft();
    if (mode === 'random') set(parameter.key, { mode: 'random' });
    else {
      const nextValue = confirmedNumber === void 0 ? 0 : confirmedNumber;
      set(
        parameter.key,
        mode === 'increment' || mode === 'decrement'
          ? { mode, value: nextValue, step: seedStep }
          : { mode: 'fixed', value: nextValue },
      );
    }
  };
  const setText = (next: string) => {
    if (linkedEditable) onUpdate(linked.id, { textContent: next });
    else if (!connected) set(parameter.key, next);
  };
  const change = (
    event: ReactTypes.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    if (readOnly) return;
    if (kind === 'toggle') set(parameter.key, (event.target as HTMLInputElement).checked);
    else if (numeric) changeNumber(event.target.value);
    else setText(event.target.value);
  };
  return {
    kind,
    connected,
    linkedEditable,
    readOnly,
    value,
    seedPolicy,
    numberDisplay,
    clearNumberDraft,
    changeSeedMode,
    setText,
    change,
  };
}

function renderWorkflowFieldControl(
  React: Runtime,
  parameter: Parameter,
  field: ReturnType<typeof workflowFieldModel>,
  stop: WorkflowGeneratorModel['stop'],
  hero: boolean,
) {
  const {
    kind,
    connected,
    readOnly,
    value,
    seedPolicy,
    numberDisplay,
    clearNumberDraft,
    changeSeedMode,
    setText,
    change,
  } = field;
  if (kind === 'select')
    return (
      <select
        aria-label={parameter.label}
        value={String(value)}
        onChange={change}
        onPointerDown={stop}
        onWheel={stop}
        style={controlStyle}
      >
        {(parameter.control?.options || []).map((option) => (
          <option value={option.id} key={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  if (kind === 'toggle')
    return (
      <input
        aria-label={parameter.label}
        type={'checkbox'}
        checked={!!value}
        onChange={change}
        onPointerDown={stop}
        onWheel={stop}
        style={{ width: '20px', height: '20px', accentColor: 'var(--nk-focus)' }}
      />
    );
  if (kind === 'seed')
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 104px',
          gap: '8px',
        }}
      >
        <input
          aria-label={parameter.label}
          type={'number'}
          value={numberDisplay}
          placeholder={seedPolicy === 'random' ? '每次运行自动生成' : ''}
          disabled={seedPolicy === 'random'}
          min={parameter.control?.minimum}
          max={parameter.control?.maximum}
          step={parameter.control?.step || 1}
          onChange={change}
          onBlur={clearNumberDraft}
          onPointerDown={stop}
          onWheel={stop}
          style={{
            ...controlStyle,
            color: seedPolicy === 'random' ? 'var(--nk-text-muted)' : 'var(--nk-text)',
            cursor: seedPolicy === 'random' ? 'not-allowed' : 'text',
          }}
        />
        <select
          aria-label={parameter.label + '生成策略'}
          value={seedPolicy}
          onChange={changeSeedMode}
          onPointerDown={stop}
          onWheel={stop}
          style={{ ...controlStyle, padding: '0 8px', cursor: 'pointer' }}
        >
          <option value={'fixed'}>{'固定'}</option>
          <option value={'random'}>{'随机'}</option>
          <option value={'increment'}>{'递增'}</option>
          <option value={'decrement'}>{'递减'}</option>
        </select>
      </div>
    );
  if (kind === 'number' || kind === 'slider')
    return (
      <input
        aria-label={parameter.label}
        type={'number'}
        value={numberDisplay}
        min={parameter.control?.minimum}
        max={parameter.control?.maximum}
        step={parameter.control?.step || 1}
        onChange={change}
        onBlur={clearNumberDraft}
        onPointerDown={stop}
        onWheel={stop}
        style={controlStyle}
      />
    );
  if (hero)
    return (
      <textarea
        data-nako-workflow-prompt-editor={'true'}
        data-nako-workflow-connected-text={connected ? 'true' : 'false'}
        aria-label={parameter.label}
        value={String(value ?? '')}
        placeholder={parameter.description || '描述你想生成的内容…'}
        readOnly={readOnly}
        onChange={(event) => setText(event.target.value)}
        onPointerDown={stop}
        onWheel={stop}
        style={{
          width: '100%',
          height: '112px',
          minHeight: 0,
          padding: '10px 12px',
          border: '1px solid var(--nk-border-control)',
          borderRadius: '8px',
          background: 'var(--nk-input)',
          color: 'var(--nk-text)',
          fontSize: '13px',
          lineHeight: 1.65,
          outline: 'none',
          resize: 'none',
          overflow: 'auto',
          cursor: readOnly ? 'default' : 'text',
        }}
      />
    );
  return (
    <textarea
      aria-label={parameter.label}
      value={String(value ?? '')}
      placeholder={parameter.description || '描述你想生成的内容…'}
      readOnly={readOnly}
      onChange={change}
      onPointerDown={stop}
      onWheel={stop}
      rows={2}
      style={{
        ...controlStyle,
        height: '62px',
        resize: 'none',
        padding: '9px 11px',
        border: '1px solid var(--nk-border-control)',
        background: 'var(--nk-input)',
        fontSize: '12px',
        lineHeight: 1.6,
      }}
    />
  );
}

export function renderWorkflowField(
  React: Runtime,
  model: WorkflowGeneratorModel,
  parameter: Parameter,
  hero = false,
) {
  const field = workflowFieldModel(model, parameter);
  const { connected, linkedEditable } = field;
  const FieldContainer = parameter.control?.kind === 'seed' ? 'div' : 'label';
  return (
    <FieldContainer
      data-nako-workflow-field={parameter.key}
      data-nako-workflow-field-location={hero ? 'prompt' : 'settings'}
      data-nako-workflow-field-connected={connected ? 'true' : 'false'}
      style={
        hero
          ? { display: 'grid', gap: '5px', minWidth: 0 }
          : {
              display: 'grid',
              gridTemplateColumns: 'minmax(104px,138px) minmax(0,1fr)',
              alignItems: isTextParameter(parameter) ? 'start' : 'center',
              gap: '14px',
              minHeight: '44px',
            }
      }
      title={parameter.description || ''}
      key={parameter.key}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          color: hero ? 'var(--nk-text-muted)' : 'var(--nk-text-secondary)',
          fontSize: hero ? '10px' : '11px',
          fontWeight: 600,
          letterSpacing: hero ? '.08em' : '0',
          textTransform: hero ? 'uppercase' : 'none',
        }}
      >
        {hero ? 'PROMPT · ' + parameter.label : parameter.label}
        {connected ? (
          <span
            style={{
              marginLeft: 'auto',
              color: 'var(--nk-info)',
              fontSize: '9px',
              letterSpacing: '.04em',
            }}
          >
            {linkedEditable ? '已接入文本 · 双向同步' : '已接入文本'}
          </span>
        ) : parameter.control?.required ? (
          <span style={{ color: 'var(--nk-info)' }}>{'·'}</span>
        ) : null}
      </span>
      {renderWorkflowFieldControl(React, parameter, field, model.stop, hero)}
    </FieldContainer>
  );
}
