import express from 'express';
import { defineApplicationPlugin } from '../kernel/application.js';
import { createDramaModelGenerator } from './server/agent/drama/dramaModelGenerator.js';
import { createPromptAssistantRouter } from './server/prompt/promptAssistantRouter.js';
import { createPromptPresetRouter } from './server/prompt/promptPresetRouter.js';
export default defineApplicationPlugin({
  id: 'module.prompt',
  dependencies: [
    'generation-core',
    'storage.agent-files',
    'media.filesystem',
    'platform.text-transport',
  ],
  requires: ['generation.defaults', 'generation.textTransport', 'agent.persistence', 'media.agent'],
  activate(context) {
    const transport = context.services.get('generation.textTransport');
    const media = context.services.get('media.agent');
    const generate = createDramaModelGenerator({
      textTransport: transport,
      defaultModels: context.services.get('generation.defaults'),
      getCredentials: (name) => transport.credentials(name),
      readImages: media.imageContent,
    });
    const app = express.Router();
    context.services.get('http.routes').contribute(context, app);
    app.use(
      createPromptAssistantRouter({
        readProjectImage: media.readReference,
        generateText: ({ systemPrompt, message, ...input }) =>
          generate({
            ...input,
            model: process.env.GLM_PROMPT_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
          }),
      }),
    );
    app.use(
      createPromptPresetRouter({
        store: context.services.get('agent.persistence').createPromptPresetStore(),
      }),
    );
  },
});
