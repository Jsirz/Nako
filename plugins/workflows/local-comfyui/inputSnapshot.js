import { LocalComfyExecutorError } from '../../../modules/contracts/workflowProtocols.js';

import { workflowAssetKey } from '../../../modules/workflow-runtime/api/server/workflowRuntime/workflowAssetIdentity.js';

export const MAX_STAGE_ASSETS = 20;

export const MAX_STAGE_BYTES = 4 * 1024 * 1024 * 1024;
export function createSnapshotAssetSession({ assetResolver }, runId) {
  const cache = new Map();
  const snapshots = [];
  let reservedAssets = 0;
  let reservedBytes = 0;
  let budgetLock = Promise.resolve();

  const withBudgetLock = async (operation) => {
    const previous = budgetLock;
    let release;
    budgetLock = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return operation();
    } finally {
      release();
    }
  };

  const resolve = async (reference) => {
    const key = workflowAssetKey(reference);
    if (cache.has(key)) return cache.get(key);
    const pending = (async () => {
      const inspected = await assetResolver.resolve(reference);
      await withBudgetLock(() => {
        if (
          reservedAssets + 1 > MAX_STAGE_ASSETS ||
          reservedBytes + Number(inspected.bytes || 0) > MAX_STAGE_BYTES
        ) {
          throw new LocalComfyExecutorError(
            '单次工作流最多暂存 20 个素材且总量不超过 4 GiB',
            'WORKFLOW_STAGE_QUOTA_EXCEEDED',
            413,
          );
        }
        reservedAssets += 1;
        reservedBytes += Number(inspected.bytes || 0);
      });
      let snapshot;
      try {
        snapshot = await assetResolver.resolve(reference, { snapshotRunId: runId });
        if (snapshot.sha256 !== inspected.sha256 || snapshot.bytes !== inspected.bytes) {
          throw new LocalComfyExecutorError(
            '素材在创建运行快照期间发生变化',
            'WORKFLOW_ASSET_INTEGRITY_ERROR',
            409,
          );
        }
        snapshots.push(snapshot);
        return snapshot;
      } catch (error) {
        await snapshot?.disposeSnapshot?.().catch(() => undefined);
        await withBudgetLock(() => {
          reservedAssets -= 1;
          reservedBytes -= Number(inspected.bytes || 0);
        });
        throw error;
      }
    })();
    cache.set(key, pending);
    try {
      return await pending;
    } catch (error) {
      cache.delete(key);
      throw error;
    }
  };
  return { resolve, snapshots };
}
