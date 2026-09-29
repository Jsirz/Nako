import fs from 'node:fs';
import path from 'node:path';
export function findLatestMediaResult({ mediaDir, nodeId, getUrlPrefix }) {
  if (!fs.existsSync(mediaDir)) return null;
  let latestResult = null;
  for (const projectId of fs.readdirSync(mediaDir)) {
    for (const type of ['images', 'videos', 'audios']) {
      const typeDir = path.join(mediaDir, projectId, type);
      if (!fs.existsSync(typeDir)) continue;
      const files = fs.readdirSync(typeDir).filter((file) => file.endsWith('.json'));
      for (const file of files) {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(typeDir, file), 'utf8'));
          if (meta.nodeId !== nodeId) continue;
          if (!latestResult || new Date(meta.createdAt) > new Date(latestResult.createdAt)) {
            latestResult = {
              status: 'success',
              resultUrl: `${getUrlPrefix()}/media/${projectId}/${type}/${meta.filename}`,
              type: type === 'images' ? 'image' : type === 'videos' ? 'video' : 'audio',
              createdAt: meta.createdAt,
              aspectRatio: meta.aspectRatio,
              resolution: meta.resolution,
              model: meta.model,
              prompt: meta.prompt,
              cost: meta.cost,
            };
          }
        } catch {
          // A malformed legacy metadata file must not prevent recovery of other assets.
        }
      }
    }
  }
  return latestResult;
}

