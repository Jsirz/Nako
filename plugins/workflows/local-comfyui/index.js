import { defineExecutorPlugin } from '../../../modules/workflow-runtime/api/defineExecutor.js';
export default defineExecutorPlugin({ id: 'local-comfyui', exportName: 'LocalComfyExecutor', loadClient: () => import('./client.js').then(module => module.LocalComfyClient), load: () => import('./implementation.js') });
