import type { Runtime, Dependencies } from './canvasApplicationDependencies';
import './canvasWorkspace.css';
import { useCanvasWorkspaceState } from './useCanvasWorkspaceState';
import { useCanvasDocumentState } from './useCanvasDocumentState';
import { useCanvasConnectionState } from './useCanvasConnectionState';
import { useCanvasSceneBridge } from './useCanvasSceneBridge';
import { useCanvasAgentControls } from './useCanvasAgentControls';
import { useCanvasSaveAndReferences } from './useCanvasSaveAndReferences';
import { useCanvasAssetActions } from './useCanvasAssetActions';
import { useCanvasAgentRuntime } from './useCanvasAgentRuntime';
import { useCanvasPointerActions } from './useCanvasPointerActions';
import { useCanvasProjectNavigation } from './useCanvasProjectNavigation';
import { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
import { renderCanvasWorkspace } from './renderCanvasWorkspace';
export function CanvasApplication(React: Runtime, dependencies: Dependencies) {
  const workspace = useCanvasWorkspaceState({ React, dependencies });
  const document = useCanvasDocumentState(workspace);
  const connections = useCanvasConnectionState(document);
  const scene = useCanvasSceneBridge(connections);
  const controls = useCanvasAgentControls(scene);
  const persistence = useCanvasSaveAndReferences(controls);
  const assets = useCanvasAssetActions(persistence);
  const pointers = useCanvasPointerActions(assets);
  const navigation = useCanvasProjectNavigation(pointers);
  const agent = useCanvasAgentRuntime(navigation);
  const effects = useCanvasDocumentEffects(agent);
  return renderCanvasWorkspace(effects);
}
