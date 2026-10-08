export const DESIGN_TOKENS = {
  color: {
    canvas: '#050505',
    surface: '#111111',
    surfaceRaised: '#1a1a1a',
    border: '#2a2a2a',
    text: '#f2f2f2',
    textMuted: '#a3a3a3',
    accent: '#f2f2f2',
    focus: '#60a5fa',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#fb7185',
    edgeDanger: '#ff4d5a',
  },
  radius: { small: '6px', medium: '8px', large: '12px', round: '999px' },
  space: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 6: '24px', 8: '32px' },
  motion: { fast: '120ms', normal: '200ms', slow: '300ms' },
} as const;

export const DESIGN_CSS = `
:root {
  color-scheme: inherit;
  --nako-canvas: var(--nk-canvas);
  --nako-surface: var(--nk-surface);
  --nako-surface-raised: var(--nk-surface-raised);
  --nako-border: var(--nk-border);
  --nako-text: var(--nk-text);
  --nako-text-muted: var(--nk-text-muted);
  --nako-focus: var(--nk-focus);
  --nako-success: var(--nk-success);
  --nako-warning: var(--nk-warning);
  --nako-danger: var(--nk-danger);
  --nako-edge-danger: var(--nk-danger);
  --nako-radius-sm: ${DESIGN_TOKENS.radius.small};
  --nako-radius-md: ${DESIGN_TOKENS.radius.medium};
  --nako-radius-lg: ${DESIGN_TOKENS.radius.large};
  --nako-motion-fast: ${DESIGN_TOKENS.motion.fast};
  --nako-motion-normal: ${DESIGN_TOKENS.motion.normal};
}
.nako-ui { font: inherit; }
.nako-button, .nako-input, .nako-select {
  border: 1px solid var(--nako-border); border-radius: var(--nako-radius-md);
  color: var(--nako-text); background: var(--nako-surface-raised);
}
.nako-button { min-height: 36px; padding: 8px 14px; cursor: pointer; }
.nako-button.is-primary { color: var(--nk-on-primary); background: var(--nk-primary); }
.nako-key-link { display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; text-decoration: none; font: inherit; transition: background .15s, box-shadow .15s; }
.nako-key-link:hover { color: var(--nk-on-primary); background: color-mix(in srgb, var(--nk-primary) 88%, var(--nk-on-primary)); }
.nako-key-link:focus-visible { outline: 2px solid var(--nk-focus); outline-offset: 3px; }
input.nako-key-input { border: 1px solid var(--nk-info); background: var(--nk-info-bg); color: var(--nk-text); outline: none; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--nk-focus) 10%, transparent); transition: border-color .15s, background .15s, box-shadow .15s; }
input.nako-key-input::placeholder { color: var(--nk-text-secondary); opacity: 1; }
input.nako-key-input:hover { border-color: var(--nk-focus); }
input.nako-key-input:focus { border-color: var(--nk-focus); background: var(--nk-input); box-shadow: 0 0 0 3px color-mix(in srgb, var(--nk-focus) 24%, transparent); }
.nako-button.is-danger, .nako-toast.is-danger { border-color: var(--nako-danger); }
.nako-button:disabled, [aria-disabled="true"] { cursor: not-allowed; opacity: .42; }
.nako-field { display: grid; gap: 6px; color: var(--nako-text-muted); }
.nako-input, .nako-select { min-height: 38px; padding: 8px 10px; }
.nako-dialog, .nako-popover-content, .nako-menu-content, .nako-toast {
  border: 1px solid var(--nako-border); border-radius: var(--nako-radius-lg);
  color: var(--nako-text); background: var(--nako-surface); box-shadow: 0 24px 64px rgb(0 0 0 / .48);
}
.nako-dialog { max-width: min(560px, calc(100vw - 32px)); padding: 24px; }
.nako-toast { padding: 12px 16px; }
.nako-toast.is-success { border-color: var(--nako-success); }
.nako-toast.is-warning { border-color: var(--nako-warning); }
.nako-anchored-confirmation {
  position: fixed; z-index: 2147483000; box-sizing: border-box;
  width: min(340px, calc(100vw - 24px)); padding: 14px;
  border: 1px solid var(--nk-border); border-radius: var(--nako-radius-lg);
  color: var(--nako-text); background: var(--nk-input);
  box-shadow: 0 24px 64px rgb(0 0 0 / .64), inset 0 1px rgb(255 255 255 / .035);
  animation: nako-confirmation-in var(--nako-motion-fast) ease-out;
}
.nako-anchored-confirmation[data-nako-confirmation-intent="destructive"] {
  border-color: color-mix(in srgb, var(--nako-danger) 52%, var(--nk-border));
}
.nako-confirmation-ledger {
  display: flex; align-items: center; gap: 8px; margin-bottom: 9px;
  color: var(--nk-text-muted); font: 600 10px/1.3 'Cascadia Code', Consolas, monospace;
  letter-spacing: .09em;
}
.nako-confirmation-ledger::after { content: ''; height: 1px; flex: 1; background: var(--nk-hover); }
.nako-confirmation-title { margin: 0; color: var(--nako-text); font-size: 14px; line-height: 1.4; font-weight: 700; }
.nako-confirmation-description { margin: 6px 0 0; color: var(--nako-text-muted); font-size: 12px; line-height: 1.6; }
.nako-confirmation-remember {
  display: flex; align-items: center; gap: 8px; margin-top: 12px;
  color: var(--nk-text-secondary); font-size: 11px; cursor: pointer;
}
.nako-confirmation-remember input { width: 14px; height: 14px; margin: 0; accent-color: var(--nk-primary); }
.nako-confirmation-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.nako-confirmation-actions .nako-button { min-height: 32px; padding: 6px 11px; font-size: 11px; }
.nako-confirmation-actions .nako-button.is-ghost { color: var(--nk-text-secondary); background: transparent; border-color: transparent; }
.nako-confirmation-actions .nako-button.is-danger { color: var(--nk-danger); background: var(--nk-danger-bg); border-color: var(--nk-danger); }
.nako-confirmation-tick {
  position: absolute; left: calc(var(--nako-confirmation-anchor-x) - 5px);
  width: 10px; height: 10px; border: 1px solid var(--nk-border); background: var(--nk-input);
  transform: rotate(45deg);
}
.nako-anchored-confirmation[data-placement="below"] .nako-confirmation-tick { top: -6px; border-right: 0; border-bottom: 0; }
.nako-anchored-confirmation[data-placement="above"] .nako-confirmation-tick { bottom: -6px; border-left: 0; border-top: 0; }
@keyframes nako-confirmation-in {
  from { opacity: 0; transform: translateY(3px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.nako-regeneration-overlay {
  position: absolute; inset: 0; z-index: 20; display: grid; place-items: center;
  overflow: hidden; isolation: isolate; border-radius: inherit;
  container-type: inline-size; contain: paint;
  transform: translateZ(0);
  color: var(--nako-text); background-color: var(--nk-surface);
}
.nako-regeneration-overlay::before {
  content: ''; position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--nk-focus) 12%, transparent), transparent 40%),
    linear-gradient(180deg, var(--nk-surface-raised) 0, var(--nk-canvas) 72%);
  opacity: .9;
}
.nako-regeneration-exposure { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
.nako-regeneration-exposure-band {
  position: absolute; top: -30%; bottom: -30%; left: -44%; width: 34%;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--nk-focus) 32%, transparent) 48%, transparent);
  opacity: .34; transform: translate3d(-20%, 0, 0) rotate(10deg);
  will-change: transform, opacity;
  animation: nako-exposure-sweep 4.8s cubic-bezier(.25, 1, .5, 1) infinite;
}
.nako-regeneration-exposure-orbit {
  position: absolute; left: 50%; top: 50%; width: clamp(190px, 32cqw, 360px);
  aspect-ratio: 1; border: 1px solid var(--nk-border-control); border-radius: 999px;
  opacity: .36; transform: translate3d(-50%, -50%, 0) scale(.86);
  will-change: transform, opacity;
  animation: nako-exposure-breathe 3.2s cubic-bezier(.45, 0, .55, 1) infinite;
}
.nako-regeneration-exposure-orbit::before,
.nako-regeneration-exposure-orbit::after {
  content: ''; position: absolute; border-radius: inherit; border: 1px solid var(--nk-border);
}
.nako-regeneration-exposure-orbit::before { inset: 16%; }
.nako-regeneration-exposure-orbit::after { inset: 34%; background: rgb(255 255 255 / .025); }
.nako-regeneration-copy {
  position: relative; z-index: 2; display: grid; grid-template-columns: auto minmax(0, 1fr);
  align-items: center; gap: 15px; min-width: clamp(300px, 32cqw, 420px);
  max-width: calc(100% - 48px); padding: 17px 20px;
  border: 1px solid var(--nk-border-control); border-radius: 10px;
  color: var(--nk-text); background: var(--nk-surface-raised);
  box-shadow: 0 18px 50px rgb(0 0 0 / .55), inset 0 1px rgb(255 255 255 / .035);
}
.nako-regeneration-copy-text { display: flex; min-width: 0; flex-direction: column; gap: 5px; }
.nako-regeneration-copy strong {
  color: var(--nk-text); font-size: clamp(18px, 1.85cqw, 24px); line-height: 1.25;
  font-weight: 700; letter-spacing: -.01em;
}
.nako-regeneration-copy small {
  color: var(--nk-text-secondary); font-size: clamp(12px, 1.15cqw, 14px); line-height: 1.4; font-weight: 500;
}
.nako-regeneration-meter { display: flex; align-items: center; gap: 4px; height: 22px; }
.nako-regeneration-meter i {
  display: block; width: 3px; height: 20px; border-radius: 999px; background: var(--nk-text-secondary);
  opacity: .34; transform: scaleY(.4); transform-origin: center;
  will-change: transform, opacity;
  animation: nako-exposure-meter 1.2s linear infinite;
}
.nako-regeneration-meter i:nth-child(2) { animation-delay: .16s; }
.nako-regeneration-meter i:nth-child(3) { animation-delay: .32s; }
.nako-regeneration-overlay[data-nako-motion="paused"] .nako-regeneration-exposure-band,
.nako-regeneration-overlay[data-nako-motion="paused"] .nako-regeneration-exposure-orbit,
.nako-regeneration-overlay[data-nako-motion="paused"] .nako-regeneration-meter i {
  animation-play-state: paused;
}
@keyframes nako-exposure-sweep {
  0% { opacity: 0; transform: translate3d(-20%, 0, 0) rotate(10deg); }
  14% { opacity: .48; }
  72% { opacity: .3; }
  100% { opacity: 0; transform: translate3d(430%, 0, 0) rotate(10deg); }
}
@keyframes nako-exposure-breathe {
  0%, 100% { opacity: .3; transform: translate3d(-50%, -50%, 0) scale(.86); }
  50% { opacity: .6; transform: translate3d(-50%, -50%, 0) scale(1.05); }
}
@keyframes nako-exposure-meter {
  0%, 100% { opacity: .3; transform: scaleY(.38); }
  44% { opacity: .95; transform: scaleY(1); }
}
/*
 * 富文本编辑器要排除掉，别看它也匹配 [tabindex]。
 *
 * 提示词编辑器（Tiptap/ProseMirror）自己会挂 tabindex="0"，于是这条焦点环套在了
 * 编辑器那个只有一行高的内容盒上，而它外面就是滚动容器：环的上边和左右边被裁掉，
 * 只剩下边留在可视区——用户看到的就是"输入框里凭空多出一条蓝线"，
 * 字一多、内容盒长过视口，下边滚出去，又变成右边一条竖线。（2026-08-12 真机确认）
 *
 * 文本编辑区的焦点指示本来就是光标，环在这里只添乱，不是可访问性损失。
 */
:where(button, a, input, select, textarea, [tabindex]):not([contenteditable="true"]):focus-visible {
  outline: 2px solid var(--nako-focus) !important; outline-offset: 3px !important;
}
[data-nako-state="loading"] { cursor: progress; }
[data-nako-state="empty"] { color: var(--nako-text-muted); }
[data-nako-state="error"] { border-color: var(--nako-danger); }
[data-nako-danger="true"] { color: var(--nako-danger); }
.nako-canvas-edge {
  transition: opacity var(--nako-motion-fast) ease;
}
.nako-canvas-edge .nako-edge-visible,
.nako-canvas-edge .edge-flow-segments,
.nako-canvas-edge .nako-edge-scissors {
  transition: opacity var(--nako-motion-fast) ease, stroke var(--nako-motion-fast) ease;
}
.nako-canvas-edge .nako-edge-scissors {
  opacity: 0;
}
.nako-canvas-edge:hover {
  opacity: 1 !important;
}
.nako-canvas-edge:hover .nako-edge-visible {
  stroke: var(--nk-danger) !important;
  stroke-opacity: .82 !important;
}
.nako-canvas-edge:hover .edge-flow-segments {
  opacity: 1;
}
.nako-canvas-edge:hover .edge-flow-segments path {
  filter: drop-shadow(0 0 4px rgba(255, 77, 90, .62));
  will-change: d, opacity;
}
.nako-canvas-edge:hover .nako-edge-scissors {
  opacity: 1;
}
@media (max-width: 1279px) {
  [data-nako-shell="projects"] main { padding-inline: 24px !important; }
}
@media (min-width: 2560px) {
  [data-nako-shell="projects"] main { max-width: 1600px !important; }
  [data-nako-settings="true"] { max-width: 1280px !important; }
}

/* The existing settings page uses one measured navigation/content layout. */
[data-nako-settings="true"] { width: min(1080px, calc(100vw - 48px)) !important; height: min(760px, calc(100dvh - 64px)) !important; max-height: calc(100dvh - 32px); background: var(--nk-input) !important; border: 1px solid var(--nk-border) !important; border-radius: 12px !important; overflow: hidden; font-size: 14px; }
[data-nako-settings-sidebar] { width: 200px !important; flex: 0 0 200px !important; padding: 24px 12px !important; background: var(--nk-input) !important; }
[data-nako-settings-sidebar] > div:first-child { padding: 0 12px 20px !important; color: var(--nk-text) !important; font-size: 18px !important; }
[data-nako-settings-sidebar] nav { gap: 6px !important; }
[data-nako-settings-sidebar] nav button { min-height: 42px; padding: 10px 12px !important; border-radius: 6px !important; font-size: 14px !important; font-weight: 500 !important; color: var(--nk-text-secondary); white-space: nowrap; }
[data-nako-settings-content] { padding: 20px 24px 24px !important; min-width: 0; overflow-y: auto; overscroll-behavior: contain; }
[data-nako-settings-content] > div { padding-left: 0 !important; padding-right: 0 !important; }
[data-nako-settings-content] > div:first-child { padding-top: 0 !important; padding-bottom: 16px; }
[data-nako-settings-content] > div:first-child > button { padding: 8px !important; }
[data-nako-settings-sidebar] nav { padding: 0 !important; }
[data-nako-settings-sidebar] nav button[class*="text-blue"] { background: var(--nk-surface-raised) !important; color: var(--nk-text) !important; }
[data-nako-settings-sidebar] nav[data-nako-storage-active] button:not([data-nako-download-storage-button]) { background: transparent !important; color: var(--nk-text-secondary) !important; }
[data-nako-download-storage-button][aria-selected="true"] { background: var(--nk-selected) !important; color: var(--nk-on-selected) !important; }
[data-nako-settings-content] p { color: var(--nk-text-secondary); }
[data-nako-settings-content] > button:first-child { top: 16px !important; right: 16px !important; width: 32px; height: 32px; }
[data-nako-settings-content] h3 { font-size: 18px !important; line-height: 1.4; }
[data-nako-settings-content] p { font-size: 13px; line-height: 1.65; }
[data-nako-settings-content] input:not([type="checkbox"]), [data-nako-settings-content] select { min-height: 40px; font-size: 14px; }
[data-nako-source-body] { padding: 20px !important; }
[data-nako-source-toggle] { padding: 18px 20px !important; gap: 16px !important; }
[data-nako-source-save], a.nako-key-link { min-height: 40px; padding: 10px 18px; border: 0; border-radius: 8px; background: var(--nk-primary); color: var(--nk-on-primary); font-size: 14px; font-weight: 600; line-height: 1.5; }
@media (max-width: 760px) {
  [data-nako-settings="true"] { width: calc(100vw - 24px) !important; height: calc(100dvh - 24px) !important; }
  [data-nako-settings-sidebar] { width: 148px !important; flex-basis: 148px !important; padding: 20px 8px !important; }
  [data-nako-settings-sidebar] nav button { white-space: normal; text-align: left; }
  [data-nako-settings-content] { padding: 48px 20px 24px !important; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important; animation-duration: .01ms !important;
    animation-iteration-count: 1 !important; transition-duration: .01ms !important;
  }
}
`;
