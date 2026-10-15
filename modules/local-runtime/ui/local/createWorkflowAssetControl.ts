import { bindWorkflowAssetLibrary } from './bindWorkflowAssetLibrary';
import { createStableElement as element } from '../../../kernel/ui/dom';
import type { BindingSet, WorkflowManagerClient } from './workflowManagerClient';
import { assetControlPresentation } from './workflowManagerControls';
import { ManagerState } from './workflowManagerTypes';

export function createWorkflowAssetControl(
  control: BindingSet['bindings'][number]['control'],
  binding: BindingSet['bindings'][number],
  state: ManagerState,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  client: WorkflowManagerClient,
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>,
) {
  const mediaKind = control.mediaKind || 'image';
  const presentation = assetControlPresentation(mediaKind);
  const wrapper = element('div', 'fwm-asset-control');
  const multiple = Boolean(control.multiple);
  const maximumItems = Math.max(1, Math.min(20, Number(control.maximumItems || 1)));
  wrapper.classList.toggle('is-multiple', multiple);
  wrapper.setAttribute('data-nako-compound-control', 'true');
  const selection = element('div', 'fwm-asset-selection');
  const picker = element('details', 'fwm-asset-picker');
  picker.setAttribute('data-nako-workflow-asset-picker', mediaKind);
  const trigger = element('summary', 'fwm-asset-trigger');
  trigger.setAttribute('aria-label', binding.label);
  let triggerThumb = element('span', 'fwm-asset-thumb', '◇');
  const triggerCopy = element('span', 'fwm-asset-trigger-copy');
  const triggerTitle = element('strong', '', '选择项目素材');
  const triggerMeta = element('span', '', presentation.label);
  triggerCopy.append(triggerTitle, triggerMeta);
  trigger.append(triggerThumb, triggerCopy, element('span', 'fwm-asset-chevron', '⌄'));
  const options = element('div', 'fwm-asset-options');
  options.setAttribute('role', 'listbox');
  options.append(element('div', 'fwm-asset-empty', '正在读取项目素材…'));
  picker.append(trigger, options);
  const assetValue = element('input');
  assetValue.type = 'hidden';
  assetValue.setAttribute('data-nako-workflow-asset-value', mediaKind);
  type Asset = Awaited<ReturnType<WorkflowManagerClient['listAssets']>>[number];
  type AssetReference = { assetId: string; projectId: string; type: string };
  const assetReference = (asset: Asset): AssetReference => ({
    assetId: asset.id,
    projectId: state.projectId!,
    type: mediaKind,
  });
  const selectedReferences = (): AssetReference[] => {
    const value = state.values[binding.key];
    const candidates = multiple ? (Array.isArray(value) ? value : []) : [value];
    return candidates.filter((candidate): candidate is AssetReference =>
      Boolean(
        candidate &&
        typeof candidate === 'object' &&
        typeof (candidate as AssetReference).assetId === 'string',
      ),
    );
  };
  const storeSelectedReferences = (references: AssetReference[]) => {
    if (multiple) {
      state.values[binding.key] = references;
      assetValue.value = references.map((reference) => reference.assetId).join(',');
    } else if (references[0]) {
      state.values[binding.key] = references[0];
      assetValue.value = references[0].assetId;
    } else {
      delete state.values[binding.key];
      assetValue.value = '';
    }
  };
  storeSelectedReferences(selectedReferences());
  const visual = (asset?: Asset) => {
    const frame = element('span', 'fwm-asset-thumb', asset ? '' : '◇');
    if (asset?.url && (mediaKind === 'image' || mediaKind === 'mask')) {
      const image = element('img');
      image.src = asset.url;
      image.alt = '';
      image.loading = 'lazy';
      frame.append(image);
    } else if (asset?.url && mediaKind === 'video') {
      const video = element('video');
      video.src = asset.url;
      video.muted = true;
      video.preload = 'metadata';
      frame.append(video);
    } else if (mediaKind === 'audio') {
      frame.textContent = '♫';
    }
    return frame;
  };
  const friendlyName = (asset: Asset, index: number) => {
    const filename = asset.filename || asset.id;
    return /^[0-9a-f-]{24,}\.[a-z0-9]+$/i.test(filename)
      ? `${presentation.label} ${index + 1}`
      : filename;
  };
  let loadedAssets: Asset[] = [];
  const syncOptionSelection = () => {
    const selectedIds = new Set(selectedReferences().map((reference) => reference.assetId));
    for (const option of options.querySelectorAll<HTMLElement>('[data-nako-workflow-asset-id]')) {
      const selected = selectedIds.has(option.dataset.nakoWorkflowAssetId || '');
      option.setAttribute('aria-selected', String(selected));
      option.closest('.fwm-asset-option')?.classList.toggle('is-selected', selected);
    }
  };
  const refreshSelection = () => {
    const references = selectedReferences();
    selection.replaceChildren();
    if (multiple) {
      const first = loadedAssets.find((asset) => asset.id === references[0]?.assetId);
      const nextThumb = visual(first);
      triggerThumb.replaceWith(nextThumb);
      triggerThumb = nextThumb;
      triggerTitle.textContent = `添加${presentation.label}`;
      triggerMeta.textContent = `已选 ${references.length} / 最多 ${maximumItems}`;
      references.forEach((reference, referenceIndex) => {
        const asset = loadedAssets.find((candidate) => candidate.id === reference.assetId);
        const item = element('div', 'fwm-asset-selected');
        const unlink = element('button', 'fwm-asset-unlink', '×');
        unlink.type = 'button';
        unlink.setAttribute(
          'aria-label',
          `移除${asset ? friendlyName(asset, referenceIndex) : `${presentation.label} ${referenceIndex + 1}`}`,
        );
        unlink.addEventListener('click', () => {
          storeSelectedReferences(
            selectedReferences().filter((candidate) => candidate.assetId !== reference.assetId),
          );
          refreshSelection();
          syncOptionSelection();
        });
        item.append(
          visual(asset),
          element(
            'span',
            'fwm-asset-selected-copy',
            asset
              ? friendlyName(asset, referenceIndex)
              : `${presentation.label} ${referenceIndex + 1}`,
          ),
          unlink,
        );
        selection.append(item);
      });
      return;
    }
    const reference = references[0];
    const asset = loadedAssets.find((candidate) => candidate.id === reference?.assetId);
    const nextThumb = visual(asset);
    triggerThumb.replaceWith(nextThumb);
    triggerThumb = nextThumb;
    triggerTitle.textContent = asset
      ? friendlyName(asset, loadedAssets.indexOf(asset))
      : '选择项目素材';
    triggerMeta.textContent = asset?.filename || presentation.label;
  };
  const selectAsset = (asset: Asset, _index: number, closePicker = true) => {
    const references = selectedReferences();
    if (multiple) {
      if (references.some((reference) => reference.assetId === asset.id)) {
        picker.open = false;
        return;
      }
      if (references.length >= maximumItems) {
        setNotice(`${binding.label}最多添加 ${maximumItems} 个素材。`, 'error');
        return;
      }
      storeSelectedReferences([...references, assetReference(asset)]);
    } else {
      storeSelectedReferences([assetReference(asset)]);
    }
    refreshSelection();
    syncOptionSelection();
    if (closePicker) picker.open = false;
  };
  const clearSelectedAsset = (assetId?: string) => {
    storeSelectedReferences(
      assetId ? selectedReferences().filter((reference) => reference.assetId !== assetId) : [],
    );
    refreshSelection();
    syncOptionSelection();
  };
  bindWorkflowAssetLibrary({
    wrapper, selection, picker, options, assetValue, state, mediaKind, presentation,
    client, setNotice, runBusy, multiple, maximumItems,
    getAssets: () => loadedAssets, setAssets: assets => { loadedAssets = assets; },
    selectedReferences, storeSelectedReferences, assetReference, visual, friendlyName,
    selectAsset, clearSelectedAsset, refreshSelection, syncOptionSelection,
  });
  return wrapper;
}
