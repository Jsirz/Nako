import { createLocalWorkspace, chooseLocalWorkspace } from './desktop/localWorkspace.mjs';
import manifest from './desktop.manifest.json' with { type: 'json' };
export default {
  manifest,
  activate(context) {
    const environment = context.services.get('desktop.environment');
    context.services.register('desktop.identity', {
      chooseLocalWorkspace,
      create: () => createLocalWorkspace(environment),
    });
  },
};
