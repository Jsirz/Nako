import { ERRORS } from '../../../contracts/index.js';
import { localRuntimeError } from '../../../contracts/localRuntimeErrors.js';
import type {
  WorkflowCanvasNodesAdapter,
  WorkflowCanvasUploadedInputNode,
} from '../../../contracts/workflowCanvasNodeProtocol';

import type { WorkflowCanvasMediaKind } from './workflowManagerClient';

import { desktopBrowser } from '../../../kernel/browser';

import type { WorkflowCanvasOperationContext } from './workflowNodeContext';
import { expandWorkflowStorageSlots } from './workflowNodeSlots';
import { localAssetReference } from './workflowNodeValues';

export function canvasNodeTypeForMedia(mediaKind: WorkflowCanvasMediaKind): string {
  if (mediaKind === 'video') return 'Upload Video';
  if (mediaKind === 'audio') return 'Upload Audio';
  if (mediaKind === 'image' || mediaKind === 'mask') return 'Upload Image';
  return 'Text';
}

export interface WorkflowUploadRule {
  directory: 'images' | 'videos' | 'audios';
  label: string;
  extensions: ReadonlySet<string>;
  maximumBytes: number;
  fallbackContentType: string;
}

export const WORKFLOW_UPLOAD_RULES: Readonly<
  Record<'image' | 'video' | 'audio', WorkflowUploadRule>
> = {
  image: {
    directory: 'images',
    label: '图像',
    extensions: new Set(['.jpeg', '.jpg', '.png', '.webp', '.bmp']),
    maximumBytes: 50 * 1024 * 1024,
    fallbackContentType: 'image/png',
  },
  video: {
    directory: 'videos',
    label: '视频',
    extensions: new Set(['.m4v', '.mov', '.mp4', '.webm', '.mkv']),
    maximumBytes: 2 * 1024 * 1024 * 1024,
    fallbackContentType: 'video/mp4',
  },
  audio: {
    directory: 'audios',
    label: '音频',
    extensions: new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac']),
    maximumBytes: 500 * 1024 * 1024,
    fallbackContentType: 'audio/mpeg',
  },
};

export function workflowUploadRule(
  mediaKind: WorkflowCanvasMediaKind,
): WorkflowUploadRule | undefined {
  if (mediaKind === 'image' || mediaKind === 'mask') return WORKFLOW_UPLOAD_RULES.image;
  if (mediaKind === 'video') return WORKFLOW_UPLOAD_RULES.video;
  if (mediaKind === 'audio') return WORKFLOW_UPLOAD_RULES.audio;
  return undefined;
}

export function fileExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot >= 0 ? filename.slice(dot).toLowerCase() : '';
}

export function workflowUploadContentType(file: File, rule: WorkflowUploadRule): string {
  const prefix =
    rule.directory === 'images' ? 'image/' : rule.directory === 'videos' ? 'video/' : 'audio/';
  return file.type.toLowerCase().startsWith(prefix) ? file.type : rule.fallbackContentType;
}

export function uploadErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fallback;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.error === 'string' && candidate.error.trim() ? candidate.error : fallback;
}

export function createWorkflowNodeUpload(
  context: WorkflowCanvasOperationContext,
): Pick<WorkflowCanvasNodesAdapter, 'uploadInputAsset'> {
  void context;
  return {
    async uploadInputAsset(node, slotIndex, file, projectId) {
      const normalizedSlotIndex = Math.max(0, Math.trunc(slotIndex));
      const slot = expandWorkflowStorageSlots(node).find(
        (candidate) => candidate.slotIndex === normalizedSlotIndex,
      );
      if (!slot || slot.source !== 'input-port') {
        throw localRuntimeError('工作流素材入口已经变化，请刷新后重试', 'uploadInputAsset', ERRORS.invalidCanvas);
      }
      const rule = workflowUploadRule(slot.mediaKind);
      if (!rule) throw localRuntimeError(`${slot.label}不支持文件上传`, 'uploadInputAsset', ERRORS.invalidMedia);
      if (!projectId) throw localRuntimeError('请先打开项目，再上传工作流素材', 'uploadInputAsset', ERRORS.invalidCanvas);
      if (!file || !rule.extensions.has(fileExtension(file.name))) {
        throw localRuntimeError(`${slot.label}需要上传${rule.label}文件`, 'uploadInputAsset', ERRORS.invalidMedia);
      }
      if (file.size <= 0) throw localRuntimeError(`${slot.label}选择的文件为空`, 'uploadInputAsset', ERRORS.invalidMedia);
      if (file.size > rule.maximumBytes) {
        const maximum =
          rule.directory === 'videos' ? '2 GB' : rule.directory === 'audios' ? '500 MB' : '50 MB';
        throw localRuntimeError(`${slot.label}文件超过 ${maximum} 上限`, 'uploadInputAsset', ERRORS.invalidMedia);
      }

      const sourceNodeId = crypto.randomUUID();
      const path = desktopBrowser().localFilePath(file);
      const response = await fetch(
        path ? `/api/assets/import/${rule.directory}` : `/api/assets/upload/${rule.directory}`,
        path
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path, projectId, nodeId: sourceNodeId, filename: file.name }),
            }
          : {
              method: 'POST',
              headers: {
                'Content-Type': workflowUploadContentType(file, rule),
                'x-filename': encodeURIComponent(file.name),
                'x-project-id': projectId,
                'x-node-id': sourceNodeId,
              },
              ...desktopBrowser().fileUploadBody(file),
            },
      );
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw localRuntimeError(uploadErrorMessage(body, `${slot.label}上传失败`), 'uploadInputAsset',
          typeof body.code === 'string' ? body.code : ERRORS.mediaStorage, response.status);
      }
      const resultUrl = typeof body.url === 'string' ? body.url : '';
      const reference = localAssetReference(resultUrl, projectId, slot.mediaKind);
      if (!reference) throw localRuntimeError(`${slot.label}上传结果不属于当前项目`, 'uploadInputAsset', ERRORS.invalidMedia);

      return {
        id: sourceNodeId,
        type: canvasNodeTypeForMedia(slot.mediaKind) as WorkflowCanvasUploadedInputNode['type'],
        x: 0,
        y: 0,
        title: file.name,
        prompt: file.name,
        status: 'success',
        progress: 100,
        resultUrl,
        assetId: reference.assetId,
        projectId,
        model: 'Upload',
        aspectRatio: rule.directory === 'audios' ? '4:1' : '16:9',
        resolution: rule.directory === 'videos' ? '720p' : '1K',
      };
    },
  };
}
