import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

import crypto from 'node:crypto';

import { workflowAssetKey } from '../../../modules/workflow-runtime/api/server/workflowRuntime/workflowAssetIdentity.js';
import { extensionFor, stagedHandleValue } from './executorSafety.js';
import { MAX_STAGE_ASSETS, MAX_STAGE_BYTES } from './inputSnapshot.js';

export const MAX_RETAINED_CACHE_BYTES = 20 * 1024 * 1024 * 1024;

export async function stageInputs(
  { runStore },
  { runId, deployment, client, assets, stageLedger, signal },
) {
  const uniqueAssets = [
    ...new Map(assets.map((asset) => [workflowAssetKey(asset), asset])).values(),
  ];
  const totalBytes = uniqueAssets.reduce((total, asset) => total + Number(asset.bytes || 0), 0);
  if (uniqueAssets.length > MAX_STAGE_ASSETS || totalBytes > MAX_STAGE_BYTES) {
    throw new LocalComfyExecutorError(
      '单次工作流最多暂存 20 个素材且总量不超过 4 GiB',
      'WORKFLOW_STAGE_QUOTA_EXCEEDED',
      413,
    );
  }
  const cleanupEnabled = Boolean(deployment.inputCleanupGrantId);
  const stagedByAssetId = new Map();
  const ledgerEntries = [];
  Object.assign(stageLedger, {
    stagedByAssetId,
    ledgerEntries,
    totalBytes: 0,
  });
  const persistLedger = () =>
    runStore.saveInputStageLedger(runId, {
      deploymentId: deployment.id,
      cleanupGrantId: deployment.inputCleanupGrantId,
      cleanupState: cleanupEnabled ? 'pending' : 'retained-cache',
      totalBytes: stageLedger.totalBytes,
      entries: ledgerEntries,
    });
  const uploadPlans = uniqueAssets.map((asset) => {
    const extension = extensionFor(asset.filename);
    const subfolder = cleanupEnabled
      ? `nako-runs/${runId}`
      : `nako-cache/${asset.sha256.slice(0, 2)}`;
    const filename = cleanupEnabled
      ? `${crypto.randomUUID()}${extension}`
      : `${asset.sha256}${extension}`;
    const plannedRelativeHandle = `${subfolder}/${filename}`;
    const ledgerEntry = {
      assetId: asset.assetId,
      sha256: asset.sha256,
      bytes: asset.bytes,
      relativeHandle: plannedRelativeHandle,
      state: 'uploading',
    };
    return { asset, filename, subfolder, ledgerEntry };
  });
  if (cleanupEnabled) {
    await persistLedger();
  } else {
    ledgerEntries.push(...uploadPlans.map((plan) => plan.ledgerEntry));
    stageLedger.totalBytes = totalBytes;
    await runStore.reserveRetainedCache({
      runId,
      deploymentId: deployment.id,
      totalBytes,
      entries: ledgerEntries,
      maximumBytes: MAX_RETAINED_CACHE_BYTES,
    });
  }
  for (const { asset, filename, subfolder, ledgerEntry } of uploadPlans) {
    if (cleanupEnabled) {
      ledgerEntries.push(ledgerEntry);
      stageLedger.totalBytes += Number(asset.bytes || 0);
    }
    // Persist the exact random target before the network side effect. If the
    // process exits after ComfyUI accepts the upload, recovery can still
    // verify and delete this precise file (or safely observe it as missing).
    if (cleanupEnabled) await persistLedger();
    const handle = await client.uploadInput({
      filePath: asset.filePath,
      filename,
      subfolder,
      overwrite: !cleanupEnabled,
      signal,
    });
    const staged = {
      ...asset,
      value: stagedHandleValue(handle),
      handle,
    };
    stagedByAssetId.set(workflowAssetKey(asset), staged);
    ledgerEntry.relativeHandle = staged.value;
    ledgerEntry.state = cleanupEnabled ? 'owned' : 'retained-cache';
    await persistLedger();
  }
  return stageLedger;
}
