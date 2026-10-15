import type * as ReactTypes from 'react';
import { activateModal } from '../../../kernel/ui/modalFocus';
import { resizeLimit } from './imageResizeGeometry';
import {
  cropMargin,
  cropRatio,
  centeredCrop,
  equalCuts,
  cropOutputRects,
  type CropSize,
  type CropRect,
  type CropOutput,
  type CropHandle,
} from './imageCropGeometry';
import type { PanoramaRenderer } from './canvasPanoramaScene';
import { gridExportIndices, type GridOrder } from './gridExport';
import type { CropGesture, Props, Runtime } from './canvasImageCropTypes';

function useImageCropControls(React: Runtime, variant: Props['variant']) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const sessionRef = React.useRef(0);
  const savingRef = React.useRef(false);
  const gestureRef = React.useRef<CropGesture | null>(null);
  const sceneRef = React.useRef<PanoramaRenderer | null>(null);
  const [display, setDisplay] = React.useState<CropSize>({ width: 0, height: 0 });
  const [crop, setCrop] = React.useState<CropRect | null>(null);
  const displayRef = React.useRef(display);
  const cropRef = React.useRef(crop);
  const updateCrop = (next: CropRect | null) => {
    cropRef.current = next;
    setCrop(next);
  };
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [ratioLabel, setRatioLabel] = React.useState(variant === 'panorama' ? '16:9' : 'Original');
  const [ratioOpen, setRatioOpen] = React.useState(false);
  const [fov, setFov] = React.useState(75);
  const [panoramaReady, setPanoramaReady] = React.useState(false);
  const [viewPreview, setViewPreview] = React.useState<CropOutput[]>([]);
  const [selectedViews, setSelectedViews] = React.useState<number[]>([]);
  const [mirror, setMirror] = React.useState(false);
  const [guides, setGuides] = React.useState(false);
  const [sceneVersion, setSceneVersion] = React.useState(0);
  const [order, setOrder] = React.useState<GridOrder>('row');
  const [exportSelection, setExportSelection] = React.useState('');
  const [rows, setRows] = React.useState(1);
  const [columns, setColumns] = React.useState(1);
  const [rowCuts, setRowCuts] = React.useState<number[]>([]);
  const [columnCuts, setColumnCuts] = React.useState<number[]>([]);
  const [rowGap, setRowGap] = React.useState(0);
  const [columnGap, setColumnGap] = React.useState(0);
  const [hover, setHover] = React.useState<CropHandle | 'move' | 'row' | 'column' | null>(null);
  const [viewport, setViewport] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  return {
    stageRef, rootRef, canvasRef, imageRef, sessionRef, savingRef, gestureRef, sceneRef,
    display, setDisplay, crop, setCrop, displayRef, cropRef, updateCrop, loaded, setLoaded,
    saving, setSaving, error, setError, progress, setProgress, ratioLabel, setRatioLabel,
    ratioOpen, setRatioOpen, fov, setFov, panoramaReady, setPanoramaReady, viewPreview,
    setViewPreview, selectedViews, setSelectedViews, mirror, setMirror, guides, setGuides,
    sceneVersion, setSceneVersion, order, setOrder, exportSelection, setExportSelection,
    rows, setRows, columns, setColumns, rowCuts, setRowCuts, columnCuts, setColumnCuts,
    rowGap, setRowGap, columnGap, setColumnGap, hover, setHover, viewport, setViewport,
  };
}
type CropControls = ReturnType<typeof useImageCropControls>;

function useImageCropSession(React: Runtime, props: Props, state: CropControls) {
  const { node, projectId, onClose, variant } = props;
  const { stageRef, rootRef, imageRef, sessionRef, savingRef, gestureRef, sceneRef, cropRef,
    displayRef, setLoaded, setSaving, setError, setProgress, setDisplay, setCrop, setFov,
    setMirror, setGuides, setOrder, setExportSelection, setPanoramaReady, setRatioLabel,
    setRatioOpen, setRows, setColumns, setRowCuts, setColumnCuts, setRowGap, setColumnGap,
    setViewport, setViewPreview, setSelectedViews, fov, mirror, ratioLabel, sceneVersion,
  } = state;
  const closeRef = React.useRef(onClose);
  React.useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const id = node?.id, url = node?.resultUrl;
  React.useEffect(() => {
    setViewPreview([]);
    setSelectedViews([]);
  }, [id, url, fov, mirror, ratioLabel, sceneVersion]);
  const fit = React.useCallback(() => {
    const image = imageRef.current, root = stageRef.current;
    if (!image || !root) return;
    const width = root.clientWidth || window.innerWidth,
      height = root.clientHeight || window.innerHeight;
    setViewport({ width, height });
    const factor = Math.max(
      0.001,
      Math.min(
        Math.max(1, width - cropMargin * 2 - 16) / image.naturalWidth,
        Math.max(1, height - cropMargin * 2 - 16) / image.naturalHeight,
      ),
    );
    const next = {
        width: image.naturalWidth * factor,
        height: image.naturalHeight * factor,
      },
      previous = displayRef.current,
      current = cropRef.current;
    const nextCrop =
      current && previous.width > 0
        ? {
            x: (current.x * next.width) / previous.width,
            y: (current.y * next.height) / previous.height,
            width: (current.width * next.width) / previous.width,
            height: (current.height * next.height) / previous.height,
          }
        : centeredCrop(next, image.naturalWidth / image.naturalHeight);
    displayRef.current = next;
    cropRef.current = nextCrop;
    setDisplay(next);
    setCrop(nextCrop);
  }, []);
  React.useEffect(() => {
    const session = ++sessionRef.current;
    savingRef.current = false;
    imageRef.current = null;
    gestureRef.current = null;
    sceneRef.current = null;
    cropRef.current = null;
    displayRef.current = { width: 0, height: 0 };
    setLoaded(false);
    setSaving(false);
    setError('');
    setProgress(0);
    setDisplay({ width: 0, height: 0 });
    setCrop(null);
    setFov(75);
    setMirror(false);
    setGuides(false);
    setOrder('row');
    setExportSelection('');
    setPanoramaReady(false);
    setRatioLabel(variant === 'panorama' ? '16:9' : 'Original');
    setRatioOpen(false);
    setRows(1);
    setColumns(1);
    setRowCuts([]);
    setColumnCuts([]);
    setRowGap(0);
    setColumnGap(0);
    if (!id || !rootRef.current) return;
    const release = activateModal(rootRef.current, () => closeRef.current()),
      image = new Image();
    image.crossOrigin = 'anonymous';
    const fail = () => {
      if (sessionRef.current === session) setError('图片加载失败，请关闭后重新打开。');
    };
    const timeout = window.setTimeout(fail, 15000);
    image.onload = () => {
      clearTimeout(timeout);
      if (sessionRef.current !== session) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        fail();
        return;
      }
      const invalid = resizeLimit({ width: image.naturalWidth, height: image.naturalHeight });
      if (invalid) {
        setError(invalid);
        return;
      }
      imageRef.current = image;
      setLoaded(true);
      setError('');
      fit();
    };
    image.onerror = () => {
      clearTimeout(timeout);
      fail();
    };
    if (url) image.src = url;
    else {
      clearTimeout(timeout);
      fail();
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (stageRef.current) observer?.observe(stageRef.current);
    window.addEventListener('resize', fit);
    return () => {
      sessionRef.current = session + 1;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      window.removeEventListener('resize', fit);
      observer?.disconnect();
      release();
    };
  }, [id, url, projectId, fit, variant]);
  return closeRef;
}

export function useCanvasImageCropState(React: Runtime, input: Props) {
  const { variant = 'grid', saveLabel = '保存' } = input;
  const props = { ...input, variant, saveLabel };
  const state = useImageCropControls(React, props.variant);
  const closeRef = useImageCropSession(React, props, state);
  const { imageRef, display, crop, ratioLabel, viewport, rows, columns, rowCuts, columnCuts,
    rowGap, columnGap, order, exportSelection, savingRef, setRowCuts, setColumnCuts,
    setRowGap, setColumnGap, setRatioLabel, updateCrop, setRows, setColumns, setRatioOpen,
    sceneRef, setPanoramaReady, setError,
  } = state;
  const panorama = props.variant === 'panorama';
  const source = imageRef.current
    ? { width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight }
    : display;
  const ratio = source.width ? cropRatio(ratioLabel, source) : 1;
  const panoramaRatio = ratio || 16 / 9;
  const panoramaSize = {
    width: Math.min(
      Math.max(1, viewport.width - 32),
      Math.max(1, viewport.height - cropMargin * 2 - 16) * panoramaRatio,
    ),
    height: 0,
  };
  panoramaSize.height = panoramaSize.width / panoramaRatio;
  const onSceneReady = React.useCallback((scene: PanoramaRenderer | null) => {
    sceneRef.current = scene;
    setPanoramaReady(!!scene);
  }, []);
  const Boundary = React.useMemo(
    () =>
      class extends React.Component<{ children: ReactTypes.ReactNode }, { failed: boolean }> {
        state = { failed: false };
        static getDerivedStateFromError() {
          return { failed: true };
        }
        componentDidCatch() {
          setError('全景预览加载失败，请关闭后重新打开。');
          setPanoramaReady(false);
        }
        render() {
          return this.state.failed ? null : this.props.children;
        }
      },
    [React.Component],
  );
  const grid = !!crop && (rows > 1 || columns > 1);
  const selection = React.useMemo(() => {
    if (!crop || !display.width) return { pieces: null, error: '' };
    try {
      return {
        pieces: cropOutputRects(crop, display, source, rowCuts, columnCuts, rowGap, columnGap),
        error: '',
      };
    } catch {
      return { pieces: null, error: '裁切范围太小，无法为每个分块保留至少一个像素。' };
    }
  }, [crop, display, source.width, source.height, rowCuts, columnCuts, rowGap, columnGap]);
  let invalidSelection = panorama ? '' : selection.error;
  if (!panorama && !invalidSelection) {
    try {
      gridExportIndices(rows, columns, order, exportSelection);
    } catch (cause) {
      invalidSelection = cause instanceof Error ? cause.message : '导出序号无效';
    }
  }
  const restoreGrid = (nextRows = rows, nextColumns = columns) => {
    if (savingRef.current) return;
    setRowCuts(equalCuts(nextRows));
    setColumnCuts(equalCuts(nextColumns));
    setRowGap(0);
    setColumnGap(0);
    setRatioLabel('Original');
    updateCrop({ ...display, x: 0, y: 0 });
  };
  const changeRows = (value: number) => {
    setRows(value);
    restoreGrid(value, columns);
  };
  const changeColumns = (value: number) => {
    setColumns(value);
    restoreGrid(rows, value);
  };
  const selectRatio = (label: string) => {
    if (savingRef.current) return;
    setRatioLabel(label);
    setRatioOpen(false);
    if (label !== 'Free') updateCrop(centeredCrop(display, cropRatio(label, source)));
  };
  return {
    ...state, props, closeRef, panorama, source, ratio, panoramaRatio, panoramaSize,
    onSceneReady, Boundary, grid, selection, invalidSelection, restoreGrid,
    changeRows, changeColumns, selectRatio, id: props.node?.id, url: props.node?.resultUrl,
  };
}
export type ImageCropState = ReturnType<typeof useCanvasImageCropState>;
