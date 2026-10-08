import { ERRORS, PluginError } from '../../../contracts/index.js';
import { resizeLimit } from './imageResizeGeometry';
import { cropOutputRects, type CropOutput } from './imageCropGeometry';
import { gridExportIndices } from './gridExport';
import type { Dependencies } from './canvasImageCropTypes';
import type { ImageCropState } from './useCanvasImageCropState';

function cropExportError(state: ImageCropState, message: string) {
  return new PluginError(ERRORS.invalidMedia, message, {
    context: { moduleId: 'canvas-ui', nodeId: state.id, variant: state.props.variant },
  });
}

function panoramaOutputs(
  state: ImageCropState,
  image: HTMLImageElement,
  Vector2: Dependencies['Vector2'],
  viewCount: 1 | 4 | 12,
): CropOutput[] {
  const scene = state.sceneRef.current!, previousSize = new Vector2();
  scene.gl.getSize(previousSize);
  const previousAspect = scene.camera.aspect;
  const previousPosition = scene.camera.position?.clone();
  const previousQuaternion = scene.camera.quaternion?.clone();
  const width = Math.round(Math.max(2048, image.naturalWidth / 2)),
    height = Math.round(width / state.panoramaRatio);
  const invalid = resizeLimit({ width, height });
  if (invalid) throw cropExportError(state, invalid);
  const outputs: CropOutput[] = [];
  try {
    scene.gl.setSize(width, height, false);
    scene.camera.aspect = state.panoramaRatio;
    scene.camera.updateProjectionMatrix();
    if (
      viewCount > 1 &&
      (!scene.camera.position || !scene.camera.lookAt || !scene.camera.quaternion)
    )
      throw cropExportError(state, '全景相机尚未准备好');
    for (let index = 0; index < viewCount; index++) {
      if (viewCount > 1) {
        const yaw = ((index % 4) * Math.PI) / 2;
        const pitch = viewCount === 12 ? ([0, 30, -30][Math.floor(index / 4)] * Math.PI) / 180 : 0;
        scene.camera.position!.set(
          -Math.sin(yaw) * Math.cos(pitch) * 0.1,
          -Math.sin(pitch) * 0.1,
          Math.cos(yaw) * Math.cos(pitch) * 0.1,
        );
        scene.camera.lookAt!(0, 0, 0);
      }
      scene.gl.render(scene.scene, scene.camera);
      outputs.push({
        data: scene.gl.domElement.toDataURL('image/png'),
        width,
        height,
        row: Math.floor(index / 4),
        column: index % 4,
      });
    }
  } finally {
    if (previousPosition) scene.camera.position?.copy(previousPosition);
    if (previousQuaternion) scene.camera.quaternion?.copy(previousQuaternion);
    scene.gl.setSize(previousSize.x, previousSize.y, false);
    scene.camera.aspect = previousAspect;
    scene.camera.updateProjectionMatrix();
    scene.gl.render(scene.scene, scene.camera);
  }
  return outputs;
}

async function gridOutputs(state: ImageCropState, image: HTMLImageElement, session: number) {
  const { cropRef, display, source, rowCuts, columnCuts, rowGap, columnGap, sessionRef, grid } = state;
  const pieces = cropOutputRects(
    cropRef.current!, display, source, rowCuts, columnCuts, rowGap, columnGap,
  );
  const canvas = document.createElement('canvas');
  const outputs: CropOutput[] = [];
  for (let row = 0; row < pieces.rows.length; row++)
    for (let column = 0; column < pieces.columns.length; column++) {
      if (sessionRef.current !== session) return outputs;
      const vertical = pieces.rows[row], horizontal = pieces.columns[column];
      canvas.width = horizontal.size;
      canvas.height = vertical.size;
      const context = canvas.getContext('2d');
      if (!context) throw cropExportError(state, '无法创建裁切图片');
      if (grid) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(
        image,
        horizontal.start,
        vertical.start,
        horizontal.size,
        vertical.size,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      outputs.push({
        data: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        row,
        column,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  return outputs;
}

export function imageCropSave(state: ImageCropState, { Vector2 }: Dependencies) {
  const { invalidSelection, imageRef, cropRef, id, panorama, savingRef, gestureRef, sceneRef,
    sessionRef, setSaving, setError, setProgress, viewPreview, selectedViews, setViewPreview,
    setSelectedViews, rows, columns, order, exportSelection, props, closeRef,
  } = state;
  return async (viewCount: 1 | 4 | 12 = 1, previewOnly = false) => {
    if (invalidSelection) return;
    const image = imageRef.current, current = cropRef.current;
    if (
      !image ||
      !id ||
      (!panorama && (!current || current.width <= 0 || current.height <= 0)) ||
      savingRef.current ||
      gestureRef.current ||
      (panorama && !sceneRef.current)
    )
      return;
    const session = sessionRef.current;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setProgress(0);
    try {
      let outputs: CropOutput[];
      if (panorama && viewCount === 1 && viewPreview.length) {
        outputs = selectedViews.map((index) => viewPreview[index]);
        if (!outputs.length) throw cropExportError(state, '请至少选择一个视角');
      } else if (panorama) outputs = panoramaOutputs(state, image, Vector2, viewCount);
      else outputs = await gridOutputs(state, image, session);
      if (sessionRef.current !== session) return;
      if (outputs.some((output) => !output.data.startsWith('data:image/png')))
        throw cropExportError(state, '图片超出当前设备的处理范围。');
      if (previewOnly) {
        setViewPreview(outputs);
        setSelectedViews(outputs.map((_, index) => index));
        return;
      }
      const ordered = panorama
        ? outputs
        : gridExportIndices(rows, columns, order, exportSelection).map((index) => outputs[index]);
      await props.onSave(id, ordered, (completed) => {
        if (sessionRef.current === session) setProgress(completed);
      });
      if (sessionRef.current === session && !panorama) closeRef.current();
    } catch (cause) {
      if (sessionRef.current === session)
        setError(cause instanceof Error ? cause.message : '裁切保存失败，请重试。');
    } finally {
      if (sessionRef.current === session) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };
}
export type ImageCropSave = ReturnType<typeof imageCropSave>;
