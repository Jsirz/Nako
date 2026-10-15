export interface AdaptiveMediaNode {
  type?: unknown;
  width?: unknown;
  height?: unknown;
  naturalWidth?: unknown;
  naturalHeight?: unknown;
  resultAspectRatio?: unknown;
  aspectRatio?: unknown;
  resultUrl?: unknown;
}

export interface MediaNodeSizingAdapter {
  getSize(node: AdaptiveMediaNode): { width: number; height: number } | undefined;
  isResizable(node: AdaptiveMediaNode): boolean;
}
