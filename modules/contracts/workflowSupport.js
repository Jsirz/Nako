/** Published WebApp output identity, independent of private ComfyUI node IDs. */
export const RUNNINGHUB_WEBAPP_OUTPUT_NODE_ID = 'nako_webapp_output';

/** Asset identity is scoped to a project's media type. */
export function workflowAssetKey(reference) {
  return JSON.stringify([
    String(reference?.projectId || ''),
    String(reference?.type || ''),
    String(reference?.assetId || ''),
  ]);
}
