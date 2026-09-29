import { useEffect, useState, type ChangeEvent } from 'react';
function JsonField({ value, className, onChange }: { value: unknown; className: string; onChange(value: unknown): void }) {
  const serialized = JSON.stringify(value), [draft, setDraft] = useState(serialized), [error, setError] = useState('');
  useEffect(() => { setDraft(serialized); setError(''); }, [serialized]);
  return <><textarea className={className} value={draft} aria-invalid={Boolean(error)} onChange={event => {
    const text = event.target.value; setDraft(text);
    try { const parsed = JSON.parse(text); setError(''); onChange(parsed); } catch { setError('请输入有效 JSON'); }
  }} />{error && <span role="alert">{error}</span>}</>;
}
type Schema = { type?: string; title?: string; enum?: unknown[]; default?: unknown; minimum?: number; maximum?: number; description?: string };
export function NodeSchemaFields({ properties, values, onChange }: {
  properties: Record<string, Schema>; values: Record<string, unknown>; onChange(key: string, value: unknown): void;
}) {
  const inputClass = 'w-full rounded border border-[var(--nk-border-control)] bg-[var(--nk-input)] px-2 py-1 text-[var(--nk-text)]';
  return <>{Object.entries(properties).map(([key, schema]) => {
    const value = values[key] ?? schema.default;
    const numeric = ['number', 'integer'].includes(schema.type || '');
    const change = (event: ChangeEvent<HTMLInputElement>) => onChange(key, numeric ? Number(event.target.value) : event.target.value);
    return <label key={key} className="block space-y-1"><span>{schema.title || key}</span>
      {schema.enum ? <select className={inputClass} value={JSON.stringify(value)} onChange={event => onChange(key, JSON.parse(event.target.value))}>
        <option disabled value="">请选择</option>{schema.enum.map(option => <option key={JSON.stringify(option)} value={JSON.stringify(option)}>{String(option)}</option>)}
      </select> : schema.type === 'boolean' ? <input type="checkbox" checked={Boolean(value)} onChange={event => onChange(key, event.target.checked)} />
        : ['object', 'array'].includes(schema.type || '') ? <JsonField className={inputClass} value={value ?? (schema.type === 'array' ? [] : {})} onChange={value => onChange(key, value)} />
          : <input type={numeric ? 'number' : 'text'} className={inputClass} value={String(value ?? '')} min={schema.minimum} max={schema.maximum} step={schema.type === 'integer' ? 1 : 'any'} onChange={change} />}
    </label>;
  })}</>;
}
