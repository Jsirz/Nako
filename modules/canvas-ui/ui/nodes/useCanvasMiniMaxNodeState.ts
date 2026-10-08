import type * as ReactTypes from 'react';
import {
  MINIMAX_H3_MODE_OPTIONS,
  getMiniMaxH3ModeLabel,
  getMiniMaxH3VisualPorts,
  remapMiniMaxH3ParentIds,
  type MiniMaxH3Mode,
} from '../../../asset-media/api/ui/media/minimaxH3';
import type { Menu, NodeData, Props, Runtime } from './canvasMiniMaxNodeTypes';

const ratios: Record<string, [number, number]> = {
  '1:1': [1, 1],
  '2:3': [2, 3],
  '3:2': [3, 2],
  '3:4': [3, 4],
  '4:3': [4, 3],
  '9:16': [9, 16],
  '16:9': [16, 9],
  '21:9': [21, 9],
};
function miniMaxDimensions(aspectRatio: string | undefined, value: number) {
  const ratio = ratios[aspectRatio || '16:9'] || [16, 9],
    scale = Math.sqrt((value * 1024 * 1024) / (ratio[0] * ratio[1]));
  return `${value === 1 ? '1.0' : String(value)} MP（${Math.round((ratio[0] * scale) / 32) * 32}×${Math.round((ratio[1] * scale) / 32) * 32}）`;
}
function focusPrompt(event: ReactTypes.MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
  if (
    event.target instanceof Element &&
    event.target.closest('[contenteditable=true],button,a,input,select')
  )
    return;
  const editor = event.currentTarget.querySelector<HTMLElement>('[contenteditable=true]');
  if (!editor) return;
  editor.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function useCanvasMiniMaxNodeState(React: Runtime, props: Props) {
  const { data: node, projectId, onConnectorDown } = props;
  const connectedNodes = props.connectedImageNodes ?? [];
  const busy = node.status === 'loading',
    settingsOpen = !!node.isMiniMaxSettingsOpen,
    prompt = String(node.inlinePrompt || '');
  const live = React.useRef(props);
  live.current = props;
  const stop = (event: { stopPropagation(): void }) => event.stopPropagation();
  const update = (patch: Partial<NodeData>) => live.current.onUpdate(live.current.data.id, patch);
  const connectInput = (event: ReactTypes.PointerEvent, port = 0) => {
    event.stopPropagation();
    onConnectorDown(event, node.id, 'left', port);
  };
  const connectOutput = (event: ReactTypes.PointerEvent) => {
    event.stopPropagation();
    onConnectorDown(event, node.id, 'right', 0);
  };
  const mode = node.minimaxH3Mode || 't2va';
  const modeLabel = getMiniMaxH3ModeLabel(mode), ports = getMiniMaxH3VisualPorts(node);
  const dimensions = (value: number) => miniMaxDimensions(node.aspectRatio, value);
  const [menu, setMenu] = React.useState<Menu>(null);
  const menuRoot = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement | null>(null);
  const focusFrame = React.useRef<number | null>(null), lifetime = React.useRef(0);
  const closeMenu = (focus = false) => {
    setMenu(null);
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    const owner = lifetime.current;
    focusFrame.current = focus
      ? requestAnimationFrame(() => {
          focusFrame.current = null;
          if (owner === lifetime.current && trigger.current?.isConnected) trigger.current.focus();
        })
      : null;
  };
  const openMenu = (event: ReactTypes.MouseEvent<HTMLButtonElement>, key: Menu) => {
    event.stopPropagation();
    trigger.current = event.currentTarget;
    setMenu((current) => (current === key ? null : key));
  };
  const choose = (value: string | number) => {
    const current = live.current.data;
    if (menu === 'mode' && MINIMAX_H3_MODE_OPTIONS.some((option) => option.value === value)) {
      const next = value as MiniMaxH3Mode;
      update({
        minimaxH3Mode: next,
        parentIds: remapMiniMaxH3ParentIds(current.parentIds || [], mode, next),
      });
    } else if (menu === 'ratio') update({ aspectRatio: String(value) });
    else if (menu === 'resolution') update({ megapixels: Number(value) });
    else if (menu === 'duration') update({ duration: Number(value) });
    closeMenu(true);
  };
  const menuOptions: Array<readonly [string | number, string, string?]> =
    menu === 'mode'
      ? MINIMAX_H3_MODE_OPTIONS.map((option) => [option.value, option.label, option.description])
      : menu === 'ratio'
        ? [
            ['16:9', '横屏 16:9'],
            ['9:16', '竖屏 9:16'],
            ['1:1', '方形 1:1'],
            ['4:3', '标准 4:3'],
            ['3:4', '竖幅 3:4'],
            ['21:9', '超宽 21:9'],
          ]
        : menu === 'resolution'
          ? [0.1, 0.2, 0.4, 0.6, 1].map((value) => [value, dimensions(value)])
          : [];
  const currentValue =
    menu === 'mode'
      ? mode
      : menu === 'ratio'
        ? node.aspectRatio || '16:9'
        : menu === 'resolution'
          ? Number(node.megapixels ?? 0.2)
          : menu === 'duration'
            ? Number(node.duration ?? 5)
            : 'native';
  const menuKeyDown = (event: ReactTypes.KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
      return;
    }
    if (event.target instanceof HTMLInputElement) return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'),
    );
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    if (event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    if (next >= 0) {
      event.preventDefault();
      buttons[next].focus();
    }
  };
  React.useLayoutEffect(() => {
    const owner = ++lifetime.current;
    setMenu(null);
    return () => {
      lifetime.current = owner + 1;
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current);
    };
  }, [node.id, projectId]);
  React.useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRoot.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener('pointerdown', outside);
    const frame = requestAnimationFrame(() =>
      menuRoot.current
        ?.querySelector<HTMLElement>(
          '[role="menuitemradio"][aria-checked="true"],input[type="range"]',
        )
        ?.focus(),
    );
    return () => {
      document.removeEventListener('pointerdown', outside);
      cancelAnimationFrame(frame);
    };
  }, [menu, projectId, node.id]);
  return {
    props, node, busy, settingsOpen, prompt, connectedNodes, stop, update, connectInput,
    connectOutput, mode, modeLabel, ports, dimensions, menu, menuRoot, closeMenu, openMenu,
    choose, focusPrompt, menuOptions, currentValue, menuKeyDown,
  };
}
export type MiniMaxNodeState = ReturnType<typeof useCanvasMiniMaxNodeState>;
