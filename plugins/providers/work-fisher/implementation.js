import { submitOpenAiChatWithLogs } from '../../../modules/generation-providers/api/server/providers/providerKit.js';
import { createClient, defaultFetcher } from './client.js';
import { connection, invalid } from './connection.js';
import { inputs, uploadInput } from './media.js';
import { recoveryMethods, runTask } from './tasks.js';
import { audioBody, imageBody, midjourneyBody, videoBody } from './requests.js';
import { prompt, validateInputs, parameters } from './validation.js';

async function assets(params, config, client, ctx) {
  const raw = inputs(params),
    roles = {};
  if (ctx.profileId === 'midjourney') {
    const requested = params.midjourneyReferences || {};
    for (const role of ['cref', 'sref', 'dref'])
      if (requested[role]) {
        roles[role] = await uploadInput(requested[role], 'image', params, config, client);
        raw.images = raw.images.filter((value) => value !== requested[role]);
      }
  }
  const uploaded = await Promise.all(
    ['image', 'video', 'audio'].map(async (kind) => [
      kind + 's',
      await Promise.all(
        raw[kind + 's'].map((value) =>
          uploadInput(value, kind, params, config, client, ctx.mode.referenceVideoDuration),
        ),
      ),
    ]),
  );
  return { ...Object.fromEntries(uploaded), roles };
}
async function generateImages(params, config, runtime) {
  const ctx = connection('image', params, config);
  validateInputs('image', params, ctx);
  const count = Number(params.generateCount ?? 1),
    isMj = ctx.profileId === 'midjourney';
  if (!Number.isInteger(count) || count < 1 || count > (isMj ? 4 : 10))
    throw invalid('生成数量超出模型限制。');
  const media = await assets(params, config, runtime.client, ctx);
  const body = (isMj ? midjourneyBody : imageBody)(params, ctx, media);
  const results = [],
    urls = new Set();
  for (let slot = 0; slot < (isMj ? 1 : count) && results.length < count; slot++) {
    const task = await runTask({
      ...runtime,
      kind: 'image',
      body,
      params,
      config,
      connection: ctx,
      slot,
    });
    for (const result of task)
      if (!urls.has(result.url)) {
        urls.add(result.url);
        results.push({ buffer: result.buffer, format: result.format });
        if (results.length === count) break;
      }
  }
  return results.length === 1 ? results[0] : results;
}
export function createWorkFisherHandlers({
  fetcher = defaultFetcher,
  submitChat = submitOpenAiChatWithLogs,
  wait,
  now,
} = {}) {
  const client = createClient(fetcher),
    runtime = { client, fetcher, wait, now };
  return {
    WorkFisherTextProvider: {
      async generateText(params, config) {
        const ctx = connection('text', params, config);
        validateInputs('text', params, ctx);
        const media = await assets(params, config, client, ctx);
        const content = [
          { type: 'text', text: prompt(params.prompt) },
          ...media.images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ...media.videos.map((url) => ({ type: 'video_url', video_url: { url } })),
        ];
        return submitChat({
          url: ctx.submitUrl,
          headers: { Authorization: 'Bearer ' + ctx.apiKey },
          body: { model: ctx.modelId, stream: true, messages: [{ role: 'user', content }],
            ...(Number.isInteger(params.maxTokens) && params.maxTokens > 0 && params.maxTokens <= 32768 ? { max_tokens: params.maxTokens } : {}) },
          signal: params.signal,
          onToken: params.onToken,
          nodeId: params.nodeId,
          projectId: params.projectId,
          logsDir: config.LOGS_DIR,
          modelId: ctx.modelId,
          useProxy: params.useProxy,
        });
      },
    },
    WorkFisherImageProvider: {
      ...recoveryMethods('image', client, fetcher),
      generateImage: (params, config) => generateImages(params, config, runtime),
    },
    WorkFisherVideoProvider: {
      ...recoveryMethods('video', client, fetcher),
      async generateVideo(params, config) {
        const ctx = connection('video', params, config);
        validateInputs('video', params, ctx);
        parameters(params, ctx.definition);
        const media = await assets(params, config, client, ctx);
        const results = await runTask({
          ...runtime,
          kind: 'video',
          body: videoBody(params, ctx, media),
          params,
          config,
          connection: ctx,
        });
        return { buffer: results[0].buffer, format: results[0].format };
      },
    },
    WorkFisherAudioProvider: {
      async generateAudio(params, config) {
        const ctx = connection('audio', params, config);
        validateInputs('audio', params, ctx);
        parameters(params, ctx.definition);
        const media = await assets(params, config, client, ctx);
        const results = (
          await runTask({
            ...runtime,
            kind: 'audio',
            body: audioBody(params, ctx, media),
            params,
            config,
            connection: ctx,
          })
        ).map(({ buffer, format }) => ({ buffer, format }));
        return results.length === 1 ? results[0] : results;
      },
    },
  };
}
const handlers = createWorkFisherHandlers();
export const WorkFisherTextProvider = handlers.WorkFisherTextProvider;
export const WorkFisherImageProvider = handlers.WorkFisherImageProvider;
export const WorkFisherVideoProvider = handlers.WorkFisherVideoProvider;
export const WorkFisherAudioProvider = handlers.WorkFisherAudioProvider;
