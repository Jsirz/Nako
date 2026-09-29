import * as React from 'react';
import { CARD_PLACEHOLDER_IMAGE } from '../../../contracts/presentationAssets.js';
import { projectCoverPreviewUrl } from './projectDashboardChrome';

export function DashboardCover({ url, title }: { url?: string; title: string }) {
  const preview = url ? projectCoverPreviewUrl(url) : null;
  const [failed, setFailed] = React.useState<string | null>(null);
  return (
    <img
      src={preview && failed !== preview ? preview : CARD_PLACEHOLDER_IMAGE}
      alt={title}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(preview)}
      className="nako-dashboard-cover"
    />
  );
}
