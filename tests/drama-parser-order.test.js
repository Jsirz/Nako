import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { RouteContributions } from '../modules/kernel/application.js';
import { createDramaPlanRouter } from '../modules/agent/server/agent/drama/dramaPlanRouter.js';

let server;
afterEach(async () => {
  if (server)
    await new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => (error ? reject(error) : resolve()));
    });
  server = undefined;
});

describe('Drama parser before the general Agent parser', () => {
  it('parses POST bodies at order 20, rejects invalid/oversize JSON, and revokes routes', async () => {
    const disposers = [];
    const routes = new RouteContributions();
    const context = { pluginId: 'module.agent.drama', onDispose: (fn) => disposers.push(fn) };
    const withPlanningRequest = vi.fn(async (input) => ({
      id: 'plan-fixture',
      script: input.script,
      projectId: input.projectId,
    }));
    const generatePlan = vi.fn();
    const limited = express.Router();
    limited.use(
      '/api/agent/drama',
      createDramaPlanRouter({
        store: { withPlanningRequest },
        generatePlan,
      }),
    );
    routes.contribute(context, limited, { phase: 10, order: 20 });
    const parser = express.Router();
    parser.use('/api/agent', express.json({ limit: '32mb' }));
    routes.contribute({ pluginId: 'module.agent', onDispose() {} }, parser, {
      phase: 10,
      order: 30,
    });
    const app = express();
    routes.mount(app, 10);
    app.use((error, _request, response, _next) =>
      response.status(error.status || 500).json({ type: error.type }),
    );
    server = await new Promise((resolve) => {
      const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    });
    const url = `http://127.0.0.1:${server.address().port}/api/agent/drama/plans`;
    const post = (body) =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const input = {
      projectId: 'parser-test',
      script: { name: '剧本.txt', text: '清晨，人物走进房间。' },
      model: 'stub-model',
      requestId: 'test-request',
      confirmPaidExecution: true,
      maxPlanningCalls: 1,
    };
    const response = await post(JSON.stringify(input));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      plan: { projectId: input.projectId, script: input.script },
    });
    expect(withPlanningRequest).toHaveBeenCalledTimes(1);
    const malformed = await post('{');
    expect(malformed.status).toBe(400);
    const oversized = await post(JSON.stringify({ text: 'x'.repeat(32 * 1024 * 1024) }));
    expect(oversized.status).toBe(413);
    expect(withPlanningRequest).toHaveBeenCalledTimes(1);
    expect(generatePlan).not.toHaveBeenCalled();
    for (const dispose of disposers) dispose();
    expect((await post(JSON.stringify(input))).status).toBe(404);
  });
});
