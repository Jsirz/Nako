import { useEffect, useRef, useState } from 'react';
import { mediaCanvas } from '../../../kernel/browser';
import { canvasError } from '../../../contracts/canvasErrors.js';

export function useReplicaUpload(options: {
  projectId: string; nodeId: string; documentEpoch: number; readOnly: boolean;
  uploaded(url: string, target: string): void; failed(message: string): void;
}) {
  const [uploading, setUploading] = useState('');
  const current = useRef(options), controller = useRef<AbortController | undefined>(undefined);
  current.current = options;
  useEffect(() => {
    setUploading('');
    return () => { controller.current?.abort(); controller.current = undefined; };
  }, [options.projectId, options.nodeId, options.documentEpoch, options.readOnly]);
  const upload = async (file: File | undefined, target: string, kind: 'image' | 'video') => {
    if (!file || options.readOnly || controller.current) return;
    const task = new AbortController(); controller.current = task; setUploading(target); options.failed('');
    const valid = () => !task.signal.aborted && !current.current.readOnly && current.current.projectId === options.projectId &&
      current.current.documentEpoch === options.documentEpoch && current.current.nodeId === options.nodeId;
    try {
      if (mediaCanvas().classify(file) !== kind) throw canvasError(kind === 'video' ? '请选择视频文件。' : '请选择图片文件。', 'videoReplica.upload');
      const url = await mediaCanvas().uploadFile(file, options.projectId, options.nodeId, task.signal);
      if (valid()) current.current.uploaded(url, target);
    } catch (cause) {
      if (valid()) current.current.failed(cause && typeof cause === 'object' && 'code' in cause && 'message' in cause && typeof cause.message === 'string'
        ? cause.message : '素材上传失败，请重试。');
    } finally { if (controller.current === task) { controller.current = undefined; setUploading(''); } }
  };
  return { uploading, upload };
}
