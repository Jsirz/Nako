import { createModuleLogger } from '../../../kernel/logger.js';
import { AgentOperationError } from '../../../contracts/agentErrors.js';
const logger = createModuleLogger('module.agent.storyboard');
import crypto from 'node:crypto';
import express from 'express';
import { classifyGenerationError } from '../../../contracts/generationFailure.js';

const REFERENCE_CATEGORIES = new Set(['Character', 'Scene', 'Item', 'Style', 'Other']);

class StoryboardError extends AgentOperationError {
  constructor(message, status = 400, code = 'INVALID_STORYBOARD_REQUEST') {
    super(message, { operation: 'storyboard-request' }, code, status);
    this.name = 'StoryboardError';
  }
}

function boundedText(value, label, maximumLength, fallback = '') {
  const text = String(value ?? '').trim() || fallback;
  if (!text || text.length > maximumLength) {
    throw new StoryboardError(`${label}无效`);
  }
  return text;
}

function projectId(value) {
  const id = String(value || 'storyboard').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id)) {
    throw new StoryboardError('项目标识无效');
  }
  return id;
}

function normalizeCharacters(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new StoryboardError('角色信息无效');
  }
  return value.map((character) => ({
    name: boundedText(character?.name, '角色名称', 100),
    description: String(character?.description || '')
      .trim()
      .slice(0, 2_000),
  }));
}

function normalizeCharacterNames(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new StoryboardError('角色名称无效');
  }
  return value.map((name) => boundedText(name, '角色名称', 100));
}

function normalizeSceneCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new StoryboardError('分镜数量必须是 1 到 10 的整数');
  }
  return count;
}

async function readReferenceImages(readReference, currentProjectId, value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 12) throw new StoryboardError('参考图片无效');
  const results = [];
  for (const reference of value) {
    const name = boundedText(reference?.name, '参考图片名称', 100);
    const category = REFERENCE_CATEGORIES.has(reference?.category) ? reference.category : 'Other';
    results.push({
      name,
      category,
      url: reference.url,
      ...(await readReference({ projectId: currentProjectId, url: reference.url })),
    });
  }
  return results;
}

function referenceLines(references) {
  const labels = {
    Character: '角色参考',
    Scene: '场景参考',
    Item: '道具参考',
    Style: '风格参考',
    Other: '其他参考',
  };
  return references.map((reference) => `- ${labels[reference.category]}：@${reference.name}`);
}

function normalizeProviderText(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 20_000) {
    throw new StoryboardError('AI 服务未返回有效内容', 502, 'AI_INVALID_RESPONSE');
  }
  return text;
}

function sendError(response, error) {
  if (error instanceof StoryboardError || error?.name === 'DramaPlanError' || error?.code === 'AGENT_OPERATION_EXISTS') {
    response.status(error.status).json({
      error: error.message,
      code: error.code,
      retryable: false,
    });
    return;
  }
  const classified = classifyGenerationError(error);
  logger.error('Storyboard request failed', { code: classified.code, status: classified.status });
  response.status(classified.status).json({
    error: classified.message,
    code: classified.code,
    retryable: classified.retryable,
  });
}

function buildBrainstormPrompt({ characters, genre, references }) {
  const characterLines = characters.length
    ? characters
        .map(
          (character) =>
            `- @${character.name}: ${character.description || '请根据故事需要补充视觉特征'}`,
        )
        .join('\n')
    : '- 可以按故事需要创建原创角色';
  return [
    '你是专业的视觉故事策划师。',
    `类型偏好：${genre}`,
    '角色：',
    characterLines,
    ...(references.length ? ['参考素材：', ...referenceLines(references)] : []),
    '创作一个适合分镜生成的中文故事梗概，3 至 5 句，包含明确的开端、发展、高潮和结尾。',
    '突出可以被画面表现的动作、环境与情绪。已命名角色必须使用 @角色名。',
    '只输出故事正文，不添加标题或解释。',
  ].join('\n');
}

function buildOptimizePrompt({ story, characterNames }) {
  const names = characterNames.length
    ? characterNames.map((name) => `@${name}`).join('、')
    : '无指定角色';
  return [
    '你是专业的分镜编剧。请重写并优化下面的故事，使其适合 AI 分镜与画面生成。',
    `原始故事：${story}`,
    `指定角色：${names}`,
    '保留核心叙事、角色与关键事件；增强动作、环境、光线、情绪和视觉转折。',
    '语言简洁、电影化，控制在 500 个汉字以内。指定角色出现时必须使用 @角色名。',
    '只输出优化后的故事正文，不添加解释。',
  ].join('\n');
}

function buildScriptsPrompt({ story, sceneCount, characters, references }) {
  const characterLines = characters.length
    ? characters
        .map((character) => `- @${character.name}: ${character.description || '保持外观一致'}`)
        .join('\n')
    : '- 没有预设角色';
  return [
    '你是专业的电影分镜师与摄影指导。',
    `故事：${story}`,
    '角色：',
    characterLines,
    ...(references.length ? ['参考素材：', ...referenceLines(references)] : []),
    `生成恰好 ${sceneCount} 个连续分镜，形成开端、发展、高潮和结尾。`,
    '每个分镜必须包含 sceneNumber、description、cameraAngle、cameraMovement、lighting、mood。',
    '已命名角色在 description 中使用 @角色名；动作、环境、光线和情绪必须可被画面直接表现。',
    '只返回 JSON：{"styleAnchor":"...","characterDNA":{"角色":"..."},"scenes":[...]}。',
  ].join('\n');
}

function parseProviderJson(value) {
  const text = normalizeProviderText(value);
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  try {
    return JSON.parse((fenced?.[1] || text).trim());
  } catch {
    throw new StoryboardError('AI 服务返回的分镜格式无效', 502, 'AI_INVALID_RESPONSE');
  }
}

function normalizeScriptsOutput(value, expectedCount) {
  const parsed = parseProviderJson(value);
  const rawScenes = Array.isArray(parsed?.scenes)
    ? parsed.scenes
    : Array.isArray(parsed?.scripts)
      ? parsed.scripts
      : Array.isArray(parsed)
        ? parsed
        : null;
  if (!rawScenes || rawScenes.length !== expectedCount) {
    throw new StoryboardError('AI 服务返回的分镜数量无效', 502, 'AI_INVALID_RESPONSE');
  }
  const scripts = rawScenes.map((scene, index) => ({
    sceneNumber: index + 1,
    description: boundedText(scene?.description, '分镜描述', 4_000),
    cameraAngle: boundedText(scene?.cameraAngle, '镜头景别', 500),
    cameraMovement: boundedText(scene?.cameraMovement, '镜头运动', 500, '静止'),
    lighting: boundedText(scene?.lighting, '分镜光线', 1_000),
    mood: boundedText(scene?.mood, '分镜情绪', 500),
  }));
  const rawDna = parsed?.characterDNA;
  const characterDNA =
    rawDna && typeof rawDna === 'object' && !Array.isArray(rawDna)
      ? Object.fromEntries(
          Object.entries(rawDna)
            .slice(0, 20)
            .map(([name, description]) => [
              boundedText(name, '角色名称', 100),
              boundedText(description, '角色设定', 2_000),
            ]),
        )
      : {};
  return {
    scripts,
    styleAnchor: String(parsed?.styleAnchor || '电影感光线，高细节，统一色彩')
      .trim()
      .slice(0, 2_000),
    characterDNA,
  };
}

function normalizeCompositeScripts(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    throw new StoryboardError('组合图分镜必须包含 1 到 10 项');
  }
  return value.map((scene, index) => ({
    sceneNumber: index + 1,
    description: boundedText(scene?.description, '分镜描述', 4_000),
    cameraAngle: boundedText(scene?.cameraAngle, '镜头景别', 500),
    cameraMovement: boundedText(scene?.cameraMovement, '镜头运动', 500, '静止'),
    lighting: boundedText(scene?.lighting, '分镜光线', 1_000),
    mood: boundedText(scene?.mood, '分镜情绪', 500),
  }));
}

function normalizeCharacterDna(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length > 20) {
    throw new StoryboardError('角色设定无效');
  }
  return Object.fromEntries(
    Object.entries(value).map(([name, description]) => [
      boundedText(name, '角色名称', 100),
      boundedText(description, '角色设定', 2_000),
    ]),
  );
}

function compositeLayout(count) {
  if (count <= 3) return `1x${count}`;
  if (count === 4) return '2x2';
  if (count <= 6) return '2x3';
  if (count <= 9) return '3x3';
  return '2x5';
}

function buildCompositePrompt({ scripts, layout, styleAnchor, characterDNA, references }) {
  const panels = scripts
    .map((scene) =>
      [
        `Panel ${scene.sceneNumber}: ${scene.description}`,
        `Camera: ${scene.cameraAngle}; Movement: ${scene.cameraMovement}; Lighting: ${scene.lighting}; Mood: ${scene.mood}.`,
      ].join(' '),
    )
    .join('\n');
  const dna = Object.entries(characterDNA).map(
    ([name, description]) => `- @${name}: ${description}`,
  );
  return [
    `Create one professional cinematic storyboard sheet in a strict ${layout} grid with ${scripts.length} equal-size panels.`,
    'Draw clear borders and a high-contrast scene number in the top-left of every panel.',
    'Keep character identity, clothing, environment, art style and color grading consistent across all panels.',
    `Art style: ${styleAnchor}`,
    ...(dna.length ? ['Character consistency:', ...dna] : []),
    ...(references.length ? ['Reference bindings:', ...referenceLines(references)] : []),
    'Panel instructions:',
    panels,
    'Return a single image only.',
  ].join('\n');
}

export function createStoryboardRouter({ readReference, generateText, generateImage }) {
  const router = express.Router();
  router.post('/brainstorm-story', async (request, response) => {
    try {
      const currentProjectId = projectId(request.body?.projectId);
      const characters = normalizeCharacters(request.body?.characterDescriptions);
      const genre = boundedText(request.body?.genre, '故事类型', 200, '电影感剧情');
      const references = await readReferenceImages(
        readReference,
        currentProjectId,
        request.body?.referenceImages,
      );
      const story = normalizeProviderText(
        await generateText({
          purpose: 'brainstorm-story',
          projectId: currentProjectId,
          prompt: buildBrainstormPrompt({ characters, genre, references }),
          images: references.map((reference) => reference.dataUrl),
        }),
      );
      response.json({ story });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post('/optimize-story', async (request, response) => {
    try {
      const currentProjectId = projectId(request.body?.projectId);
      const story = boundedText(request.body?.story, '故事内容', 20_000);
      const characterNames = normalizeCharacterNames(request.body?.characterNames);
      const optimizedStory = normalizeProviderText(
        await generateText({
          purpose: 'optimize-story',
          projectId: currentProjectId,
          prompt: buildOptimizePrompt({ story, characterNames }),
          images: [],
        }),
      );
      response.json({ optimizedStory });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post('/generate-scripts', async (request, response) => {
    try {
      const currentProjectId = projectId(request.body?.projectId);
      const story = boundedText(request.body?.story, '故事内容', 20_000);
      const sceneCount = normalizeSceneCount(request.body?.sceneCount);
      const characters = normalizeCharacters(request.body?.characterDescriptions);
      const references = await readReferenceImages(
        readReference,
        currentProjectId,
        request.body?.referenceImages,
      );
      const result = normalizeScriptsOutput(
        await generateText({
          purpose: 'generate-scripts',
          projectId: currentProjectId,
          prompt: buildScriptsPrompt({ story, sceneCount, characters, references }),
          images: references.map((reference) => reference.dataUrl),
        }),
        sceneCount,
      );
      response.json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post('/generate-composite', async (request, response) => {
    try {
      const currentProjectId = projectId(request.body?.projectId);
      const scripts = normalizeCompositeScripts(request.body?.scripts);
      const layout = compositeLayout(scripts.length);
      const styleAnchor = boundedText(
        request.body?.styleAnchor,
        '视觉风格',
        2_000,
        '电影感光线，高细节，统一色彩',
      );
      const characterDNA = normalizeCharacterDna(request.body?.characterDNA);
      const references = await readReferenceImages(
        readReference,
        currentProjectId,
        request.body?.referenceImages,
      );
      const prompt = buildCompositePrompt({
        scripts,
        layout,
        styleAnchor,
        characterDNA,
        references,
      });
      const generated = await generateImage({
        projectId: currentProjectId,
        prompt,
        images: references.map((reference) => reference.dataUrl),
        operationId: request.body.operationId || crypto.randomUUID(),
      });
      const saved = { imageUrl: generated.resultUrl, layout };
      response.json(saved);
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}
