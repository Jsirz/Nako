import express from 'express';
import { AgentSkillError } from '../../../contracts/agentSkillError.js';

export function createAgentSkillRouter({ skillLibrary }) {
  const router = express.Router();
  router.use('/api/agent-skills', express.json({ limit: Infinity }));
  router.get('/api/agent-skills', async (_request, response) => {
    try {
      response.json({ skills: await skillLibrary.list() });
    } catch {
      response.status(500).json({ error: '读取 SKILL 社区失败', code: 'AGENT_SKILL_LIST_FAILED' });
    }
  });
  router.post('/api/agent-skills/import', async (request, response) => {
    try {
      const skills = await skillLibrary.importFolders(request.body?.files, request.body?.category);
      response.status(201).json({ skills, skill: skills[0] });
    } catch (error) {
      if (error instanceof AgentSkillError) {
        response.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      response.status(500).json({ error: '导入 SKILL 失败', code: 'AGENT_SKILL_IMPORT_FAILED' });
    }
  });
  router.get('/api/agent-skills/:slug/cover', async (request, response) => {
    try {
      const cover = await skillLibrary.readCover(request.params.slug);
      response.set('Content-Type', cover.contentType).set('X-Content-Type-Options', 'nosniff').send(cover.content);
    } catch {
      response.status(404).end();
    }
  });
  const execute = action => async (request, response) => {
    try { response.json(await action(request)); }
    catch (error) {
      response.status(error instanceof AgentSkillError ? error.status : 500).json({
        error: error instanceof AgentSkillError ? error.message : '更新 SKILL 失败',
        code: error instanceof AgentSkillError ? error.code : 'AGENT_SKILL_UPDATE_FAILED',
      });
    }
  };
  router.patch('/api/agent-skills/:slug', execute(async req => ({ skill: await skillLibrary.updateCategory(req.params.slug, req.body?.category) })));
  router.delete('/api/agent-skills/:slug', execute(async req => {
    await skillLibrary.remove(req.params.slug);
    return { success: true };
  }));
  return router;
}
