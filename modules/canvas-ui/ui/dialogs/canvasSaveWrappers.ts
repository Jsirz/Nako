import type * as React from 'react';
import { ASSET_CATEGORIES, assetDefaultName } from '../../../asset-media/api/ui/media/assetOrganization';
import type { CanvasSaveDialogProps } from './canvasSaveDialog';
type Runtime = Pick<typeof React, 'createElement'>;
type SharedProps = Pick<CanvasSaveDialogProps, 'isOpen' | 'onClose' | 'categories' | 'onSave'>;
interface AssetProps extends SharedProps {
  defaultOwnership?: string;
  nodeToSnapshot?: { title?: string; prompt?: string; type?: string; resultUrl?: string } | null;
}
export function CanvasAssetDialog(
  runtime: Runtime,
  props: AssetProps,
  Dialog: React.ComponentType<CanvasSaveDialogProps>,
) {
  const node = props.nodeToSnapshot;
  if (!props.isOpen || !node) return null;
  return runtime.createElement(Dialog, {
    isOpen: props.isOpen,
    onClose: props.onClose,
    title: '保存到资产',
    submitLabel: '保存',
    defaultName: assetDefaultName(node),
    categories: [...new Set([...props.categories, ...ASSET_CATEGORIES])],
    coverUrl: node.resultUrl || '',
    coverAlt: '资产封面',
    defaultOwnership: props.defaultOwnership || '',
    compactCategory: true,
    onSave: props.onSave,
    closeImmediatelyOnSave: true,
  });
}
