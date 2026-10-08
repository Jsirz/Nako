import { cropMargin, cropHandles } from './imageCropGeometry';
import type { Runtime } from './canvasImageCropTypes';
import type { ImageCropState } from './useCanvasImageCropState';

function drawImageCropOverlay(state: ImageCropState) {
  const { canvasRef, crop, display, panorama, grid, selection, source, columns, columnCuts, rowCuts, hover } = state;
  const canvas = canvasRef.current;
  if (!canvas || !crop || !display.width || panorama) return;
  canvas.width = display.width + cropMargin * 2;
  canvas.height = display.height + cropMargin * 2;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(cropMargin, cropMargin);
  context.fillStyle = 'rgba(0,0,0,.6)';
  context.fillRect(0, 0, display.width, display.height);
  context.clearRect(crop.x, crop.y, crop.width, crop.height);
  context.strokeStyle = '#3b82f6';
  context.lineWidth = 2;
  context.strokeRect(crop.x, crop.y, crop.width, crop.height);
  if (grid && selection.pieces) {
    const pieces = selection.pieces;
    context.fillStyle = 'rgba(239,68,68,.2)';
    for (let index = 1; index < pieces.columns.length; index++) {
      const previous = pieces.columns[index - 1],
        start = ((previous.start + previous.size) * display.width) / source.width;
      context.fillRect(
        start,
        crop.y,
        (pieces.columns[index].start * display.width) / source.width - start,
        crop.height,
      );
    }
    for (let index = 1; index < pieces.rows.length; index++) {
      const previous = pieces.rows[index - 1],
        start = ((previous.start + previous.size) * display.height) / source.height;
      context.fillRect(
        crop.x,
        start,
        crop.width,
        (pieces.rows[index].start * display.height) / source.height - start,
      );
    }
    for (const [rowIndex, row] of pieces.rows.entries())
      for (const [columnIndex, column] of pieces.columns.entries()) {
        context.strokeRect(
          (column.start * display.width) / source.width,
          (row.start * display.height) / source.height,
          (column.size * display.width) / source.width,
          (row.size * display.height) / source.height,
        );
        context.font = '12px sans-serif';
        context.fillStyle = '#fff';
        context.fillText(
          String(rowIndex * columns + columnIndex + 1),
          (column.start * display.width) / source.width + 8,
          (row.start * display.height) / source.height + 18,
        );
      }
    for (const cut of columnCuts) {
      context.beginPath();
      context.moveTo(crop.x + crop.width * cut, crop.y);
      context.lineTo(crop.x + crop.width * cut, crop.y + crop.height);
      context.stroke();
    }
    for (const cut of rowCuts) {
      context.beginPath();
      context.moveTo(crop.x, crop.y + crop.height * cut);
      context.lineTo(crop.x + crop.width, crop.y + crop.height * cut);
      context.stroke();
    }
  } else {
    context.strokeStyle = 'rgba(255,255,255,.3)';
    context.lineWidth = 1;
    for (const part of [1 / 3, 2 / 3]) {
      context.beginPath();
      context.moveTo(crop.x + crop.width * part, crop.y);
      context.lineTo(crop.x + crop.width * part, crop.y + crop.height);
      context.moveTo(crop.x, crop.y + crop.height * part);
      context.lineTo(crop.x + crop.width, crop.y + crop.height * part);
      context.stroke();
    }
  }
  for (const handle of cropHandles(crop)) {
    context.beginPath();
    context.arc(handle.x, handle.y, hover === handle.id ? 8 : 6, 0, Math.PI * 2);
    context.fillStyle = '#3b82f6';
    context.fill();
    context.strokeStyle = 'white';
    context.lineWidth = 1;
    context.stroke();
  }
  context.restore();
}

export function useImageCropOverlay(React: Runtime, state: ImageCropState) {
  const { crop, display, grid, rowCuts, columnCuts, rowGap, columnGap, hover, panorama, source, selection, columns } = state;
  React.useLayoutEffect(() => drawImageCropOverlay(state), [
    crop, display, grid, rowCuts, columnCuts, rowGap, columnGap, hover, panorama,
    source.width, source.height, selection, columns,
  ]);
}
