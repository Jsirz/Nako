import { WorkflowExecutorRegistry } from './index.js';
export default {
  manifest: {
    id: 'workflow-runtime',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    type: 'module',
    services: { provides: ['workflow.executors'] },
  },
  activate(context) {
    context.services.register('workflow.executors', new WorkflowExecutorRegistry());
  },
};
