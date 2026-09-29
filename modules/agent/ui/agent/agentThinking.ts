export interface ThinkingParameter {
  key: string;
  default?: string | number | boolean;
  options?: Array<{ label: string; value: string | number }>;
}
export const isThinkingParameter = (key: string) =>
  ['reasoning', 'reasoning_effort', 'enable_thinking'].includes(key);

/** Only advertise and send capabilities declared by the selected model. */
export function agentThinking(
  parameters: ThinkingParameter[],
  preference: { thinkingEnabled?: boolean | null; thinkingEffort?: string },
) {
  const toggle = parameters.find((p) => p.key === 'enable_thinking');
  const effort = parameters.find((p) => p.key === 'reasoning' || p.key === 'reasoning_effort');
  const off =
    effort?.key === 'reasoning' ? effort.options?.find((o) => o.value === 'minimal') : undefined;
  const options = (effort?.options || []).filter((o) => o !== off);
  const supported = Boolean(toggle || effort);
  const canDisable = Boolean(toggle || off);
  const defaultEnabled = toggle
    ? toggle.default === true || toggle.default === 'true'
    : Boolean(effort && (!off || effort.default !== off.value));
  const enabled = supported && (canDisable ? (preference.thinkingEnabled ?? defaultEnabled) : true);
  const selected =
    options.find((o) => o.value === preference.thinkingEffort) ||
    options.find((o) => o.value === effort?.default) ||
    options[0];
  const params: Record<string, string | number | boolean> = {};
  if (toggle) params[toggle.key] = enabled;
  if (effort && selected) params[effort.key] = !enabled && off ? off.value : selected.value;
  return { supported, canDisable, enabled, options, effort: String(selected?.value || ''), params };
}
