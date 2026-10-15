import { defineApplicationPlugin } from '../kernel/application.js';
import { selectDirectoryWithSystemDialog } from './server/platform/directoryPicker.js';

export default defineApplicationPlugin({
  id: 'module.platform-directories',
  provides: ['platform.directories'],
  activate(context) {
    /** @type {import('../contracts/localRuntimeService').DirectoryPickerService} */
    const directories = Object.freeze({ selectDirectory: selectDirectoryWithSystemDialog });
    context.services.register('platform.directories', directories);
  },
});
