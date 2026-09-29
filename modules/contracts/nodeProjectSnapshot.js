/** Project edits affecting execution invalidate approval; observation/viewport updates do not. */
const executionFields = ['id', 'type', 'pluginId', 'nodeVersion', 'parameters', 'parameterValues', 'prompt',
  'model', 'imageModel', 'textModel', 'videoModel', 'audioModel', 'imageMode', 'videoMode', 'audioMode',
  'languageMode', 'duration', 'resolution', 'aspectRatio', 'generateCount', 'parentIds', 'sourcePortIndices',
  'inputLinks', 'workflowRef', 'inputPorts', 'outputPorts'];
export function nodeProjectSnapshot(project) {
  return { id: project.id, nodes: (project.nodes || []).map(node => Object.fromEntries(executionFields
    .filter(key => node[key] !== undefined).map(key => [key, node[key]]))) };
}
