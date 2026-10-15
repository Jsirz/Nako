import { createModuleLogger } from '../../../kernel/logger.js';
import { AgentOperationError } from '../../../contracts/agentErrors.js';
const logger = createModuleLogger('module.prompt');
import express from 'express';
import { classifyGenerationError } from '../../../contracts/generationFailure.js';

const DESCRIBE_IMAGE_INSTRUCTION = [
  '你是专业的视觉描述与生成提示词助手。',
  '准确描述主体、动作、环境、构图、镜头、光线、色彩、材质、风格和氛围。',
  '输出可以直接用于图片或视频生成的中文提示词，不添加分析过程或标题。',
].join('');
const OPTIMIZE_PROMPT_INSTRUCTION = [
  '你是专业的 AI 视觉提示词工程师。',
  '保留用户原意，补全主体、动作、环境、构图、镜头、光线、色彩、材质、风格和氛围。',
  '输出一段可直接用于图片或视频生成的中文提示词，不添加解释、标题或引号。',
].join('');

class PromptAssistantError extends AgentOperationError {
  constructor(message, status = 400, code = 'INVALID_PROMPT_ASSISTANT_REQUEST') {
    super(message, { operation: 'prompt-assistant-request' }, code, status);
    this.name = 'PromptAssistantError';
  }
}

function assertSafeSegment(value, label) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 255 ||
    value === '.' ||
    value === '..' ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('\0')
  ) {
    throw new PromptAssistantError(`${label}无效`);
  }
  return value;
}

function normalizeText(value, label, maximumLength, fallback = '') {
  const text = String(value ?? '').trim() || fallback;
  if (!text || text.length > maximumLength) {
    throw new PromptAssistantError(`${label}无效`);
  }
  return text;
}

function normalizeOutput(value) {
  const text = String(value ?? '').trim();
  if (!text || text.length > 20000) {
    throw new PromptAssistantError('AI 服务未返回有效内容', 502, 'AI_INVALID_RESPONSE');
  }
  return text;
}

function sendError(response, error) {
  if (error instanceof PromptAssistantError || error?.name === 'DramaPlanError') {
    response.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  const classified = classifyGenerationError(error);
  logger.error('Prompt assistant request failed', { code: classified.code, status: classified.status });
  response.status(classified.status).json({
    error: classified.message,
    code: classified.code,
    retryable: classified.retryable,
  });
}

function removeWrapperQuotes(value) {
  const text = String(value || '').trim();
  for (const [opening, closing] of [
    ['"', '"'],
    ["'", "'"],
    ['“', '”'],
    ['‘', '’'],
  ]) {
    if (text.startsWith(opening) && text.endsWith(closing)) {
      return text.slice(opening.length, -closing.length).trim();
    }
  }
  return text;
}

export function createPromptAssistantRouter({ readProjectImage, generateText }) {
  const router = express.Router();
  const generateContent = ({ purpose, text, media, projectId }) =>
    generateText({
      systemPrompt:
        purpose === 'describe-image' ? DESCRIBE_IMAGE_INSTRUCTION : OPTIMIZE_PROMPT_INSTRUCTION,
      message: text,
      media: media
        ? [{ type: 'image', url: 'data:' + media.mimeType + ';base64,' + media.data }]
        : [],
      projectId: projectId || 'prompt-assistant',
    });
  router.post('/api/prompt-assistant/describe-image', async (request, response) => {
    try {
      const projectId = assertSafeSegment(request.body?.projectId, '项目标识');
      const media = await readProjectImage({ projectId, url: request.body?.imageUrl });
      const text = normalizeText(
        request.body?.prompt,
        '描述要求',
        4000,
        '请详细描述这张图片的主体、构图、光线、色彩、材质、风格和氛围。',
      );
      const description = normalizeOutput(
        await generateContent({ purpose: 'describe-image', text, media, projectId }),
      );
      response.json({ description });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post('/api/prompt-assistant/optimize-prompt', async (request, response) => {
    try {
      const text = normalizeText(request.body?.prompt, '提示词', 8000);
      const optimizedPrompt = normalizeOutput(
        removeWrapperQuotes(
          await generateContent({
            purpose: 'optimize-prompt',
            text,
            projectId: request.body?.projectId,
          }),
        ),
      );
      response.json({ optimizedPrompt });
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}
