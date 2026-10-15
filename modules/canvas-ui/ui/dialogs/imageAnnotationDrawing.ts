import { mediaCanvas } from '../../../kernel/browser';
import type { AnnotationStroke } from '../../../contracts/mediaCanvas';
export type { AnnotationPoint, AnnotationTool, AnnotationStroke } from '../../../contracts/mediaCanvas';

export const drawAnnotationStroke = (context: CanvasRenderingContext2D, stroke: AnnotationStroke) =>
  mediaCanvas().drawStroke(context, stroke);
export const renderAnnotations = (canvas: HTMLCanvasElement, strokes: AnnotationStroke[], source: { width: number; height: number }) =>
  mediaCanvas().renderAnnotations(canvas, strokes, source);
