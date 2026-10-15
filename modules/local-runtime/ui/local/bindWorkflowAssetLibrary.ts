import { requestAnchoredConfirmation } from '../../../kernel/ui/designSystem';
import { createStableElement as element } from '../../../kernel/ui/dom';
import type { WorkflowManagerClient } from './workflowManagerClient';
import { button, messageFor } from './workflowManagerControls';
import type { ManagerState } from './workflowManagerTypes';

type Asset = Awaited<ReturnType<WorkflowManagerClient['listAssets']>>[number];
type AssetReference = { assetId: string; projectId: string; type: string };

export function bindWorkflowAssetLibrary({
  wrapper, selection, picker, options, assetValue, state, mediaKind, presentation,
  client, setNotice, runBusy, multiple, maximumItems, getAssets, setAssets,
  selectedReferences, storeSelectedReferences, assetReference, visual, friendlyName,
  selectAsset, clearSelectedAsset, refreshSelection, syncOptionSelection,
}: {
  wrapper: HTMLDivElement; selection: HTMLDivElement; picker: HTMLDetailsElement;
  options: HTMLDivElement; assetValue: HTMLInputElement; state: ManagerState;
  mediaKind: string; presentation: { label: string; accept: string };
  client: WorkflowManagerClient; setNotice: (text: string, tone?: '' | 'error' | 'success') => void;
  runBusy: (label: string, action: () => Promise<void>) => Promise<void>;
  multiple: boolean; maximumItems: number; getAssets: () => Asset[]; setAssets: (assets: Asset[]) => void;
  selectedReferences: () => AssetReference[]; storeSelectedReferences: (references: AssetReference[]) => void;
  assetReference: (asset: Asset) => AssetReference; visual: (asset?: Asset) => HTMLElement;
  friendlyName: (asset: Asset, index: number) => string; selectAsset: (asset: Asset, index: number) => void;
  clearSelectedAsset: (assetId?: string) => void; refreshSelection: () => void; syncOptionSelection: () => void;
}) {
  const renderAssetOptions = () => {
    const loadedAssets = getAssets();
    options.replaceChildren();
    if (!loadedAssets.length) {
      options.append(element('div', 'fwm-asset-empty', '项目里还没有此类素材'));
      return;
    }
    loadedAssets.forEach((asset, index) => {
      const item = element('div', 'fwm-asset-option');
      const option = element('button', 'fwm-asset-option-main');
      option.type = 'button';
      option.setAttribute('role', 'option');
      option.setAttribute('data-nako-workflow-asset-id', asset.id);
      const selected = selectedReferences().some((reference) => reference.assetId === asset.id);
      option.setAttribute('aria-selected', String(selected));
      item.classList.toggle('is-selected', selected);
      const copy = element('span', 'fwm-asset-option-copy');
      copy.append(element('strong', '', friendlyName(asset, index)), element('span', '', asset.filename || asset.id));
      option.append(visual(asset), copy);
      option.addEventListener('click', (event) => {
        event.preventDefault();
        selectAsset(asset, index);
      });
      const remove = element('button', 'fwm-asset-delete');
      remove.type = 'button';
      remove.setAttribute('aria-label', `删除 ${friendlyName(asset, index)}`);
      remove.title = '删除素材记录';
      remove.setAttribute('data-nako-workflow-asset-delete', asset.id);
      remove.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const name = friendlyName(asset, index);
        void (async () => {
          const confirmed = await requestAnchoredConfirmation({
            anchor: remove, intent: 'destructive', title: '移除素材记录？',
            description: `“${name}”将移入可恢复记录；画布中的节点不受影响。`, confirmLabel: '移除',
          });
          if (!confirmed) return;
          remove.disabled = true;
          remove.textContent = '移除中…';
          try {
            await client.trashAsset(state.projectId!, mediaKind, asset.id);
            setAssets(getAssets().filter((candidate) => candidate.id !== asset.id));
            clearSelectedAsset(asset.id);
            renderAssetOptions();
            setNotice(`“${name}”已移入可恢复记录。`, 'success');
          } catch (error) {
            remove.disabled = false;
            remove.textContent = '';
            setNotice(messageFor(error), 'error');
          }
        })();
      });
      item.append(option, remove);
      options.append(item);
    });
  };
  void client.listAssets(state.projectId!, mediaKind).then((assets) => {
    setAssets(assets);
    renderAssetOptions();
    refreshSelection();
    syncOptionSelection();
  }).catch(() => options.replaceChildren(element('div', 'fwm-asset-empty', '读取素材失败，请稍后重试')));
  const uploadInput = element('input');
  uploadInput.type = 'file';
  uploadInput.accept = presentation.accept;
  uploadInput.hidden = true;
  uploadInput.setAttribute('aria-label', `上传${presentation.label}`);
  uploadInput.setAttribute('data-nako-workflow-asset-upload', mediaKind);
  const upload = button(`上传${presentation.label}`, 'quiet');
  upload.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    uploadInput.click();
  });
  uploadInput.addEventListener('change', () => {
    const file = uploadInput.files?.[0];
    uploadInput.value = '';
    if (!file) return;
    void runBusy(`正在上传${presentation.label}“${file.name}”…`, async () => {
      const asset = await client.uploadAsset(state.projectId!, mediaKind, file);
      const references = selectedReferences();
      storeSelectedReferences(multiple
        ? [...references.filter((reference) => reference.assetId !== asset.id), assetReference(asset)].slice(0, maximumItems)
        : [assetReference(asset)]);
      setNotice(`${presentation.label}“${file.name}”已上传并选中。`, 'success');
    });
  });
  wrapper.append(selection, picker, upload, uploadInput, assetValue);
}
