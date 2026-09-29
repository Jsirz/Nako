import express from 'express';

function taskResponse(task) {
  if (!task) return null;
  if (task.status === 'loading' || task.status === 'queued') {
    return { status: 'pending', attemptId: task.attemptId };
  }
  const diagnostics = {
    attemptId: task.attemptId,
    providerName: task.providerName,
    estimatedCost: task.estimatedCost,
    durationMs: task.durationMs,
    diagnosticCode: task.diagnosticCode || task.code,
  };
  if (task.status === 'success') {
    return {
      status: 'success',
      type: task.type || task.kind,
      resultUrl: task.resultUrl,
      resultUrls: task.resultUrls,
      text: task.text,
      createdAt: task.createdAt,
      model: task.model || task.modelName,
      ...diagnostics,
    };
  }
  if (task.status === 'failed' || task.status === 'cancelled' || task.status === 'unknown') {
    return {
      status: task.status,
      code: task.code,
      error: task.error,
      retryable: Boolean(task.retryable),
      ...(task.recoveryPending ? { recoveryPending: true } : {}),
      ...(task.code === 'GENERATION_PARTIAL_RESULTS' ? {
        type: task.kind, resultUrl: task.resultUrl, resultUrls: task.resultUrls,
      } : {}),
      ...diagnostics,
    };
  }
  return null;
}

export function createGenerationRecoveryRouter({ applicationContext = {}, coordinator, findMediaResult, recoverTask }) {
  if (!coordinator || typeof coordinator.getTask !== 'function') {
    throw new Error('Generation recovery router requires a coordinator');
  }
  const router = express.Router();

  router.post('/generation-cancel/:nodeId', (req, res) => {
    // Agent cancellation binds to the observed attempt. A stale UI must never cancel a newer task.
    if (req.body?.attemptId !== undefined || req.body?.projectId !== undefined) {
      const task = coordinator.getTask(req.params.nodeId);
      if (!task || !req.body.attemptId || task.attemptId !== req.body.attemptId || task.projectId !== req.body.projectId)
        return res.status(409).json({ code: 'GENERATION_ATTEMPT_CONFLICT', status: 'unknown' });
    }
    const result = coordinator.cancel(req.params.nodeId);
    if (!result.ok) {
      return res.status(409).json({
        error: '该生成任务当前不可取消。',
        code: result.code,
        status: result.task?.status || 'missing',
      });
    }
    return res.json({
      success: true,
      status: 'cancelled',
      code: result.task.code,
      retryable: result.task.retryable,
      remoteMayContinue: result.task.remoteMayContinue !== false,
    });
  });

  router.get('/generation-status/:nodeId', async (req, res) => {
    try {
      const { nodeId } = req.params;
      const requestedAttemptId = String(req.query.attemptId || '').trim();
      let persistedTask = coordinator.getTask(nodeId);
      if (requestedAttemptId && persistedTask?.attemptId !== requestedAttemptId) {
        // A media file alone cannot prove the whole attempt completed (e.g. a partial batch).
        return res.json({ status: 'missing', attemptId: requestedAttemptId });
      }
      if (persistedTask && recoverTask) {
        persistedTask = await recoverTask(persistedTask, applicationContext);
        if (requestedAttemptId && persistedTask?.attemptId !== requestedAttemptId) {
          return res.json({ status: 'missing', attemptId: requestedAttemptId });
        }
      }
      const persistedTaskResponse = taskResponse(persistedTask);
      if (persistedTaskResponse) return res.json(persistedTaskResponse);
      if (requestedAttemptId) return res.json({ status: 'missing', attemptId: requestedAttemptId });

      const latestMedia = await findMediaResult(nodeId);
      if (latestMedia) return res.json(latestMedia);

      const cachedText = applicationContext.textResultCache?.get(nodeId);
      if (cachedText) {
        return res.json({
          status: 'success',
          type: 'text',
          text: cachedText.text,
          createdAt: cachedText.createdAt,
          model: cachedText.model,
        });
      }
      return res.json({ status: 'missing' });
    } catch (error) {
      console.error('Generation status recovery failed:', error);
      return res.status(500).json({
        error: '读取生成状态失败。',
        code: 'GENERATION_STATUS_READ_FAILED',
      });
    }
  });

  return router;
}
