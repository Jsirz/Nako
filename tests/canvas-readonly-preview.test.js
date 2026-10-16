// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { useCanvasPointerActions } from '../modules/canvas-ui/ui/canvas/useCanvasPointerActions';
import { useCanvasDrag } from '../modules/canvas-ui/ui/canvas/canvasEditorHooks';
import { useCanvasViewport } from '../modules/canvas-ui/ui/canvas/canvasViewport';
import { CanvasScene } from '../modules/canvas-ui/ui/canvas/canvasScene';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function contextOptions() {
  const options = {
    React, view: 'canvas', readOnly: true, nodes: [], selectedNodeIds: [],
    pointerRef: { current: { x: 0, y: 0 } },
    media: {
      useCanvasImageEditSave: vi.fn(), useCanvasCropSave: vi.fn(), useCanvasCompositeSave: vi.fn(),
    },
  };
  for (const key of ['startSelection', 'updateSelection', 'endSelection', 'updateNodeResize',
    'endNodeResize', 'updateConnectionDrag', 'completeConnectionDrag', 'updatePointerPos',
    'pushHistory', 'setNodes', 'setSelectedNodeIds', 'setSelectedConnection', 'setContextMenu',
    'closeWorkflowPanel', 'closeHistoryPanel', 'closeAssetLibrary', 'closeWorkflowPresetPanel']) {
    options[key] = vi.fn();
  }
  return options;
}

it.each([0, 1])('pans read-only previews with button %i and zooms without editing the document', (button) => {
  const options = contextOptions();
  const { result } = renderHook(() => useCanvasPointerActions({
    ...options,
    ...useCanvasDrag(React),
    ...useCanvasViewport(React, () => 300, () => 200),
  }));
  const target = document.createElement('div');
  target.setPointerCapture = vi.fn();
  target.hasPointerCapture = () => true;
  target.releasePointerCapture = vi.fn();
  const event = { target, button, pointerId: 1, clientX: 120, clientY: 90,
    movementX: 40, movementY: -25, stopPropagation: vi.fn() };
  act(() => result.current.onCanvasPointerDown(event));
  expect(result.current.isPanning).toBe(true);
  expect(target.setPointerCapture).toHaveBeenCalledWith(1);
  act(() => result.current.onCanvasPointerMove(event));
  expect(result.current.viewport).toEqual({ x: 40, y: -25, zoom: 1 });
  act(() => result.current.onCanvasPointerUp(event));
  expect(result.current.isPanning).toBe(false);
  expect(target.releasePointerCapture).toHaveBeenCalledWith(1);
  act(() => result.current.onCanvasPointerMove(event));
  expect(result.current.viewport.x).toBe(40);
  act(() => result.current.handleWheel({ ...event, deltaY: -100, deltaX: 0 }));
  expect(result.current.viewport.zoom).toBeGreaterThan(1);
  act(() => result.current.handleSliderZoom({ target: { value: '0.5' } }));
  expect(result.current.viewport.zoom).toBe(0.5);
  for (const key of ['startSelection', 'updateSelection', 'endSelection', 'updateNodeResize',
    'endNodeResize', 'updateConnectionDrag', 'completeConnectionDrag', 'setNodes', 'pushHistory']) {
    expect(options[key]).not.toHaveBeenCalled();
  }
  expect(options.media.useCanvasCropSave.mock.lastCall[0].enabled).toBe(false);
});

it('keeps normal canvas left-drag selection and ignores right-drag in previews', () => {
  const options = contextOptions();
  const { result, rerender } = renderHook(({ readOnly }) => useCanvasPointerActions({
    ...options, readOnly, ...useCanvasDrag(React),
    ...useCanvasViewport(React, () => 300, () => 200),
  }), { initialProps: { readOnly: true } });
  const target = document.createElement('div');
  target.id = 'canvas-background';
  const event = { target, button: 2 };
  act(() => result.current.onCanvasPointerDown(event));
  expect(result.current.isPanning).toBe(false);
  rerender({ readOnly: false });
  act(() => result.current.onCanvasPointerDown({ ...event, button: 0 }));
  expect(options.startSelection).toHaveBeenCalledTimes(1);
  expect(result.current.isPanning).toBe(false);
});

it('leaves scene navigation active while disabling node actions, drop, menus and edge editing', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  const generate = vi.fn(), onWheel = vi.fn(), onPointerDown = vi.fn(), onPointerUp = vi.fn();
  const onDrop = vi.fn(), onContextMenu = vi.fn(), onDoubleClick = vi.fn(), edge = vi.fn();
  const props = {
    readOnly: true, nodes: [{ id: 'one', type: 'Text', x: 0, y: 0 }],
    viewport: { x: 0, y: 0, zoom: 1 }, selectedNodeIds: [],
    visibleNodeIds: new Set(['one']), visibleGroups: [], nodesByGroupId: new Map(),
    nodeDisplayData: new Map(), canvasRef: React.createRef(), onPointerDown,
    onPointerMove: vi.fn(), onPointerUp, onWheel, onDoubleClick, onDrop, onContextMenu,
    onGenerate: generate, onNodePointerDown: vi.fn(), onNodeMouseEnter: vi.fn(), onNodeMouseLeave: vi.fn(),
    onEdgeClick: edge, onEdgeDoubleClick: edge,
  };
  let edgeProps;
  const components = {
    Wallpaper: () => null,
    Edges: (value) => { edgeProps = value; return null; }, Selection: () => null,
    Node: (value) => React.createElement('button', { onClick: () => value.onGenerate('one') }, '生成'),
  };
  const Scene = (value) => CanvasScene(React, value, components);
  const view = render(React.createElement(Scene, props));
  const canvas = view.container.querySelector('#canvas-background');
  expect(view.container.querySelector('#canvas-viewport-content').hasAttribute('inert')).toBe(false);
  fireEvent.pointerDown(canvas);
  fireEvent.wheel(canvas, { deltaY: -100 });
  fireEvent.pointerCancel(canvas);
  expect(onPointerDown).toHaveBeenCalledTimes(1);
  expect(onWheel).toHaveBeenCalledTimes(1);
  expect(onPointerUp).toHaveBeenCalledTimes(1);
  fireEvent.click(view.getByText('生成'));
  fireEvent.drop(canvas);
  fireEvent.contextMenu(canvas);
  fireEvent.doubleClick(canvas);
  for (const action of [generate, onDrop, onContextMenu, onDoubleClick]) expect(action).not.toHaveBeenCalled();
  expect(edgeProps.onEdgeClick).toBeUndefined();
  expect(edgeProps.onEdgeDoubleClick).toBeUndefined();
  view.rerender(React.createElement(Scene, { ...props, readOnly: false }));
  expect(view.container.querySelector('#canvas-viewport-content').hasAttribute('inert')).toBe(false);
  fireEvent.click(view.getByText('生成'));
  expect(generate).toHaveBeenCalledWith('one');
});
