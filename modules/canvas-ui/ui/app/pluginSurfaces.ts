import { browserHost } from '../../../kernel/browser';
import type { CanvasComponent } from './canvasComponentType';

// Restart-required feature plugins publish their components before the root mounts.
// Absence is a supported state: neither the panel nor its launcher is rendered.
const empty = { Launcher: () => null, Panel: () => null };
export function optionalAgentSurfaces() {
  return browserHost.services.optional<{ Launcher: CanvasComponent; Panel: CanvasComponent }>('ui.agent.surfaces') ?? empty;
}
