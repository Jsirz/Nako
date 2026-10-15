import { createStableElement as element } from '../../../kernel/ui/dom';
import { DeployedWorkflowRecord } from './workflowManagerTypes';

export function appendWorkflowCoverMedia() {
  return (
    container: HTMLElement,
    record: DeployedWorkflowRecord,
    preview?: { url: string; mediaKind: 'image' | 'video' },
  ) => {
    const customCoverUrl = record.definition.presentation?.customCoverUrl;
    const cover =
      preview ||
      (customCoverUrl
        ? { url: customCoverUrl, mediaKind: 'image' as const }
        : record.automaticCover);
    if (!cover) {
      const fallback = element('div', 'fwm-card-fallback');
      fallback.append(element('span', 'fwm-card-fallback-mark', 'FA'));
      container.append(fallback);
      return;
    }
    if (cover.mediaKind === 'video') {
      const media = element('video', 'fwm-card-media');
      media.src = cover.url;
      media.muted = true;
      media.playsInline = true;
      media.preload = 'metadata';
      media.addEventListener(
        'loadedmetadata',
        () => {
          if (media.duration > 0) media.currentTime = Math.min(0.05, media.duration / 2);
        },
        { once: true },
      );
      container.append(media);
      return;
    }
    const media = element('img', 'fwm-card-media');
    media.src = cover.url;
    media.alt = `${record.definition.name} 封面`;
    container.append(media);
  };
}
