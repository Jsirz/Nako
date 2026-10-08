import type * as ReactTypes from 'react';
import { cropMargin, hitCrop, createCrop, resizeCrop, moveCrop, moveCropCut, type CropPoint } from './imageCropGeometry';
import type { CropGesture } from './canvasImageCropTypes';
import type { ImageCropState } from './useCanvasImageCropState';

export function imageCropGestures(state: ImageCropState) {
  const { display, cropRef, grid, columnCuts, rowCuts, loaded, savingRef, gestureRef,
    updateCrop, setRatioOpen, setHover, setColumnCuts, setRowCuts, ratio,
  } = state;
  const location = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(display.width, event.clientX - bounds.left - cropMargin)),
      y: Math.max(0, Math.min(display.height, event.clientY - bounds.top - cropMargin)),
    };
  };
  const hit = (point: CropPoint): { kind: CropGesture['kind']; index?: number } => {
    const current = cropRef.current;
    if (!current) return { kind: 'create' };
    if (grid) {
      const column = columnCuts.findIndex(
        (cut) =>
          Math.abs(point.x - current.x - current.width * cut) <= 10 &&
          point.y >= current.y &&
          point.y <= current.y + current.height,
      );
      if (column >= 0) return { kind: 'column', index: column };
      const row = rowCuts.findIndex(
        (cut) =>
          Math.abs(point.y - current.y - current.height * cut) <= 10 &&
          point.x >= current.x &&
          point.x <= current.x + current.width,
      );
      if (row >= 0) return { kind: 'row', index: row };
    }
    return { kind: hitCrop(current, point) || 'create' };
  };
  const pointerDown = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || savingRef.current || event.button !== 0 || gestureRef.current) return;
    const start = location(event), action = hit(start);
    gestureRef.current = {
      id: event.pointerId,
      start,
      rect: cropRef.current || { ...start, width: 0, height: 0 },
      ...action,
    };
    if (action.kind === 'create') updateCrop({ ...start, width: 0, height: 0 });
    setRatioOpen(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    const point = location(event), gesture = gestureRef.current;
    if (!gesture) {
      const kind = hit(point).kind;
      setHover(kind === 'create' ? null : kind);
      return;
    }
    if (gesture.id !== event.pointerId) return;
    if (gesture.kind === 'column')
      setColumnCuts((old) =>
        moveCropCut(
          old,
          gesture.index!,
          (point.x - gesture.rect.x) / gesture.rect.width,
          gesture.rect.width,
        ),
      );
    else if (gesture.kind === 'row')
      setRowCuts((old) =>
        moveCropCut(
          old,
          gesture.index!,
          (point.y - gesture.rect.y) / gesture.rect.height,
          gesture.rect.height,
        ),
      );
    else if (gesture.kind === 'move')
      updateCrop(
        moveCrop(
          gesture.rect,
          { x: point.x - gesture.start.x, y: point.y - gesture.start.y },
          display,
        ),
      );
    else if (gesture.kind === 'create')
      updateCrop(createCrop(gesture.start, point, display, ratio));
    else updateCrop(resizeCrop(gesture.rect, gesture.kind, point, display, ratio));
  };
  const pointerUp = (event: ReactTypes.PointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.id !== event.pointerId) return;
    if (event.type === 'pointerup') pointerMove(event);
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return { pointerDown, pointerMove, pointerUp };
}
export type ImageCropGestures = ReturnType<typeof imageCropGestures>;
