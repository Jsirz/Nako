import { beforeEach, afterEach } from 'vitest';
import { browserHost } from '../../modules/kernel/browser.ts';
import { expandPromptTags } from '../../modules/agent/ui/prompt/promptPresets.ts';
import { composeCreativePrompt } from '../../modules/agent/ui/prompt/creativePresets.ts';
import { imageAnglePrompt } from '../../modules/agent/ui/prompt/imageAngle.ts';

let dispose;
beforeEach(() => {
  dispose = browserHost.services.register('ui.prompt.composition', {
    expandTags: expandPromptTags, compose: composeCreativePrompt, imageAngle: imageAnglePrompt,
  });
});
afterEach(() => dispose());
