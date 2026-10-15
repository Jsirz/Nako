import type { ImageAngle } from './imageAngle';

/** Opaque UI values are supplied and consumed by the browser's React adapter. */
export interface CanvasPresentationService {
  tooltip(props: { text: string; children: unknown; delay?: number; position?: 'top' | 'bottom' | 'left' | 'right' }): unknown;
  imageAngle(props: {
    node: { id: string; resultUrl?: string; imageAngle?: unknown; aspectRatio?: string };
    onClose(): void;
    onApply(id: string, angle: ImageAngle): void;
    editing?: boolean;
  }): unknown;
}
