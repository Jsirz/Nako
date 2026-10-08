import { browserHost } from '../../kernel/browser';
import type { CanvasProjectUiService, ProjectMediaRecoveryService } from '../../contracts/projectWorkflow';

export const canvasProjectUi = () => browserHost.services.get<CanvasProjectUiService>('ui.canvas.project');
export const projectMediaRecovery = () => browserHost.services.get<ProjectMediaRecoveryService>('ui.media.recovery');
