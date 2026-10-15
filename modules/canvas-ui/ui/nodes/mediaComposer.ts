import { browserServices } from '../../../kernel/browser';
import type { ConnectedAssetsProps } from './canvasConnectedAssets';
import type * as ReactTypes from 'react';
import type { PromptEditorProps } from '../../../contracts/promptEditing';
import type { ComposerNode, ComposerModel, MediaComposerProps } from '../../../contracts/mediaComposer';
export type { ComposerNode, ComposerAsset, ComposerModel, MediaComposerProps } from '../../../contracts/mediaComposer';
export type ComposerRuntime = Pick<
  typeof ReactTypes,
  | 'createElement'
  | 'Fragment'
  | 'useState'
  | 'useRef'
  | 'useEffect'
  | 'useLayoutEffect'
  | 'useSyncExternalStore'
>;
type Icon = ReactTypes.ComponentType<{ size: number }>;
export interface MediaComposerComponents {
  models: ComposerModel[];
  ratios: string[];
  resolutions: string[];
  PromptEditor: ReactTypes.ComponentType<PromptEditorProps>;
  ConnectedAssets: ReactTypes.ComponentType<ConnectedAssetsProps>;
  ModelSelector: ReactTypes.ComponentType<{
    isVideoNode: boolean;
    currentModel: ComposerModel;
    availableModels: ComposerModel[];
    disabled: boolean;
    onModelChange(name: string): void;
  }>;
  Dimensions: ReactTypes.ComponentType<{
    videoSettings?: {
      duration: number;
      parameter?: NonNullable<ComposerModel['advancedParams']>[number];
      fixed: boolean;
      audio?: boolean;
    };
    data: ComposerNode;
    onUpdate(patch: Partial<ComposerNode>): void;
    disabled: boolean;
    allRatios: string[];
    supportedRatios: string[];
    allResolutions: string[];
    supportedResolutions: string[];
    isDark: boolean;
  }>;
  AdvancedSettings: ReactTypes.ComponentType<Record<string, unknown>>;
  Tooltip: ReactTypes.ComponentType<{ text: string; children: ReactTypes.ReactNode }>;
  CollapseIcon: Icon;
  SettingsIcon: Icon;
  GenerateIcon: Icon;
  VolumeIcon?: Icon;
  MuteIcon?: Icon;
  CreativePromptTokens: ReactTypes.ComponentType<Pick<MediaComposerProps, 'data' | 'onUpdate'> & { disabled?: boolean }>;
  CreativeLibraryTools: ReactTypes.ComponentType<Pick<MediaComposerProps, 'data' | 'onUpdate'> & { disabled?: boolean }>;
  MjStyleStatus: ReactTypes.ComponentType<{ prompt: string }>;
  ImageAngleControl: ReactTypes.ComponentType<{
    node: ComposerNode; referenceUrl?: string; disabled?: boolean;
    onUpdate: MediaComposerProps['onUpdate'];
  }>;
}
const subscribeNone = () => () => {},
  zero = () => 0;
export function useComposerBusy(React: ComposerRuntime, id: string, loading: boolean) {
  const scheduler = browserServices.__NAKO_GENERATION_SCHEDULER__;
  React.useSyncExternalStore(
    scheduler?.subscribe || subscribeNone,
    scheduler?.version || zero,
    zero,
  );
  return loading || !!scheduler?.isInFlight(id);
}
export function changeComposerModel(
  kind: 'image' | 'video',
  node: ComposerNode,
  model: ComposerModel,
  ratios: string[],
  resolutions: string[],
): Partial<ComposerNode> {
  const patch: Partial<ComposerNode> = { [`${kind}Model`]: model.name };
  const modes = kind === 'image' ? model.imageModes : model.videoModes;
  const currentMode = kind === 'image' ? node.imageMode : node.videoMode;
  if (modes?.length && !modes.some((mode) => mode.value === currentMode))
    patch[`${kind}Mode`] = modes[0].value;
  const nextRatios = model.aspectRatios || ratios,
    nextResolutions = model.resolutions || resolutions;
  if (nextRatios.length && (!node.aspectRatio || !nextRatios.includes(node.aspectRatio)))
    patch.aspectRatio = kind === 'video' && nextRatios.includes('16:9') ? '16:9' : nextRatios[0];
  if (nextResolutions.length && (!node.resolution || !nextResolutions.includes(node.resolution)))
    patch.resolution = nextResolutions[0];
  const count = model.advancedParams?.find((parameter) => parameter.key === 'generateCount');
  if (kind === 'image' && typeof count?.default === 'number') patch.generateCount = count.default;
  return patch;
}
