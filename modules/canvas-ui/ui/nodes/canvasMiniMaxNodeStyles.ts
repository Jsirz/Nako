import type * as ReactTypes from 'react';

export const triggerStyle: ReactTypes.CSSProperties = {
  border: 0,
  background: 'transparent',
  color: 'var(--nk-text-secondary)',
  fontSize: '12px',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  padding: '7px 4px',
  borderRadius: '6px',
  cursor: 'pointer',
};
export const inputStyle: ReactTypes.CSSProperties = {
  background: 'var(--nk-surface)',
  border: '1px solid var(--nk-border)',
  color: 'var(--nk-text)',
  borderRadius: '8px',
  outline: 'none',
};
export const settingLabelStyle: ReactTypes.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  fontSize: '10px',
  color: 'var(--nk-text-muted)',
};
export const settingControlStyle: ReactTypes.CSSProperties = {
  ...inputStyle,
  height: '32px',
  padding: '0 8px',
  fontSize: '12px',
};
