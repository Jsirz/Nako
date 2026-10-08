export interface CanvasPoint { x: number; y: number }
export interface CanvasViewport extends CanvasPoint { zoom: number }
export const STABLE_MIN_ZOOM = 0.05;
export const STABLE_MAX_ZOOM = 5;
