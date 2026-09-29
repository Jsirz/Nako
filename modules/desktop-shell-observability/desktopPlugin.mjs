import manifest from './desktop.manifest.json' with { type: 'json' };
import { createUpdateController } from './desktop/updateController.mjs';

export default {
  manifest,
  activate(context) {
    const environment = context.services.get('desktop.environment');
    const service = createUpdateController(environment.updates);
    context.services.register('desktop.application-updates', service);
    context.onDispose(() => service.dispose());
    service.start();
  },
};
