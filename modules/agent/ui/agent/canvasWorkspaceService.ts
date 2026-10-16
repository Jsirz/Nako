import type { AgentCanvasService } from '../../../contracts/agentCanvasWorkspace';
import { createCanvasControlExecutor } from './canvasControlExecutor';
import { createCanvasAssetControl } from './canvasAssetControl';
import { createCanvasMediaControl } from './canvasMediaControl';
import { createCanvasWorkflowControl } from './canvasWorkflowControl';
import { createCanvasCreationControl } from './canvasCreationControl';
import { createGenerationPlanClient } from './generationPlanClient';
import { createCanvasProjectControl } from './canvasProjectControl';
import { createCanvasTaskControl } from './canvasTaskControl';
import { createCanvasBudgetControl } from './canvasBudgetControl';
import { createCanvasProductControl } from './canvasProductControl';

/** One controller chain per document epoch; the canvas supplies only document capabilities. */
export const agentCanvasService: AgentCanvasService = Object.freeze<AgentCanvasService>({
  createWorkspace(bindings) {
    const executor = createCanvasControlExecutor(bindings.control);
    const media = createCanvasMediaControl(createCanvasAssetControl(executor), executor, bindings.creation);
    const workflow = createCanvasWorkflowControl(media, executor, bindings.creation);
    const creation = createCanvasCreationControl(workflow, bindings.creation, createGenerationPlanClient());
    const projects = createCanvasProjectControl(creation.control, bindings.project);
    const tasks = createCanvasTaskControl(projects.control, bindings.creation);
    const budgets = createCanvasBudgetControl(tasks, creation, bindings.creation);
    const products = createCanvasProductControl(budgets.control, bindings.product);
    return { executor, creation, projects, tasks, budgets, products };
  },
});
