import { rename, rm, writeFile } from 'node:fs/promises';
import { WorkflowOutputError } from './workflowOutputs.js';

export async function publishWorkflowOutputs({ staged, outputs, manifest, writeManifest, publishedPaths, model, source, projectId, runId }) {
  if (staged.length === 0 && outputs.length === 0) {
    throw new WorkflowOutputError('没有可保存的工作流结果。请使用保存节点并开启保存输出。', 'OUTPUT_NOT_FOUND');
  }
  for (const item of staged) {
    await rename(item.temporaryPath, item.finalPath);
    publishedPaths.push(item.finalPath);
    item.manifestItem.publishedFile = true;
    manifest.updatedAt = new Date().toISOString();
    await writeManifest();
    const metadata = {
      id: item.assetId,
      filename: item.finalFilename,
      nodeId: item.candidate.nodeId,
      model,
      type: item.config.directory,
      sourceRunId: runId,
      sha256: item.integrity.sha256,
      bytes: item.integrity.bytes,
      source,
      createdAt: new Date().toISOString(),
    };
    await writeFile(item.metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
    publishedPaths.push(item.metadataPath);
    item.manifestItem.publishedMetadata = true;
    manifest.updatedAt = new Date().toISOString();
    await writeManifest();
    outputs.push({
      nodeId: item.candidate.nodeId,
      classType: item.candidate.classType,
      ...(source === 'local-comfyui-workflow' ? { comfyOutput: { type: 'output', saved: true } } : {}),
      outputKey: item.candidate.outputKey,
      outputIndex: item.candidate.outputIndex,
      mediaKind: item.candidate.mediaKind,
      assetId: item.assetId,
      url: `/library/media/${encodeURIComponent(projectId)}/${item.config.directory}/${encodeURIComponent(item.finalFilename)}`,
      sha256: item.integrity.sha256,
      bytes: item.integrity.bytes,
    });
  }
  manifest.state = 'published';
  manifest.updatedAt = new Date().toISOString();
  await writeManifest();
}

export function workflowPublicationResult(outputs, publishedPaths, runDirectory) {
  return {
    outputs,
    rollback: async () => {
      await Promise.all(publishedPaths.map((filePath) => rm(filePath, { force: true })));
      await rm(runDirectory, { recursive: true, force: true });
    },
    commit: () => rm(runDirectory, { recursive: true, force: true }),
  };
}
