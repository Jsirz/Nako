import type { PromptAsset } from './promptAssets';

export interface PromptEditorProps {
  value: string;
  onChange(value: string): void;
  connectedAssets?: PromptAsset[];
  placeholder?: string;
  isDark?: boolean;
  onBlur?(): void;
  className?: string;
  type?: 'text' | 'image' | 'video' | 'audio';
  disableMentions?: boolean;
  disablePromptPresets?: boolean;
  disableDirectEdit?: boolean;
}
export interface PromptKeyHandle {
  onKeyDown(props: { event: KeyboardEvent }): boolean;
}
