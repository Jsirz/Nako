import { defineApplicationPlugin } from '../kernel/application.js';
import { createNodeRunService } from '../kernel/nodeRunService.js';
import { NODE_CAPABILITIES } from '../contracts/nodeExecution.js';
import { createNodeCapabilities } from './nodeCapabilities.js';
import { createNodeRunRouter } from './nodeRunRouter.js';
import { createNodeGenerationRecovery } from './nodeGenerationRecovery.js';

export default defineApplicationPlugin({
  id: 'module.nodes',
  dependencies: ['module.generation', 'module.project', 'storage.node-runs', 'media.filesystem', 'media.ffmpeg-sharp', 'module.workflow-runtime'],
  requires: ['node.registry', 'node.packages', 'nodes.store', 'generation.runtime', 'project.repository', 'media.store', 'media.agent', 'media.processor', 'workflow.execution'],
  provides: ['nodes.runtime'],
  async activate(context) {
    const projects = context.services.get('project.repository'), store = context.services.get('nodes.store');
    const capabilities = createNodeCapabilities({ generation: context.services.get('generation.runtime'),
      mediaStore: context.services.get('media.store'), mediaAgent: context.services.get('media.agent'), mediaProcessor: context.services.get('media.processor'), workflow: context.services.get('workflow.execution'), projects, store });
    const runs = await createNodeRunService({ registry: context.services.get('node.registry'), store, capabilities,
      readProject: id => projects.getWorkflowById(id), policy: NODE_CAPABILITIES,
      recoverRun: createNodeGenerationRecovery(context.services.get('generation.runtime')) });
    context.services.register('nodes.runtime', runs);
    context.services.get('http.routes').contribute(context, createNodeRunRouter({ runs, packages: context.services.get('node.packages') }), { phase: 30, order: 10 });
    context.onDispose(() => runs.close());
  },
});
