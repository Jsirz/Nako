import { defineExecutorPlugin } from '../../../modules/workflow-runtime/api/defineExecutor.js';
// Both RunningHub endpoints use the same public executor protocol and implementation factory.
export default defineExecutorPlugin({ id: 'runninghub-webapp', exportName: 'RunningHubWorkflowExecutor', credentialId: 'provider.runninghub', loadClient: () => import('../shared/runninghubClient.js').then(module => module.RunningHubWorkflowClient), load: () => import('../shared/runninghubExecutor.js') });
