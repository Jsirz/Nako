import { beforeEach, afterEach } from 'vitest';
import { browserHost } from '../../modules/kernel/browser.ts';
import { expandPromptTags } from '../../modules/agent/ui/prompt/promptPresets.ts';

let dispose;
beforeEach(() => {
  dispose = browserHost.services.register('ui.prompt.composition', { expandTags: expandPromptTags });
});
afterEach(() => dispose());
