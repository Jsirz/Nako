import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'nako-server-smoke-'));
const withoutAgent = process.argv.includes('--without-agent');
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const instance = randomUUID();
const environment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) =>
      !/^(?:NAKO_|SERVER_PORT|NODE_ENV)/.test(key) &&
      !/(?:API_KEY|ACCESS_KEY|SECRET_KEY|TOKEN|PASSWORD)$/.test(key),
  ),
);
Object.assign(environment, {
  NODE_ENV: 'production',
  SERVER_PORT: String(port),
  NAKO_DATA_DIR: temporaryRoot,
  NAKO_NODE_DIR: path.join(temporaryRoot, 'nodes'),
  NAKO_ACTIVE_USER_ID: randomUUID(),
});
const pluginConfiguration = path.join(temporaryRoot, 'plugins.json');
await writeFile(
  pluginConfiguration,
  JSON.stringify({ disabled: withoutAgent ? ['module.agent', 'module.agent.drama', 'module.agent.storyboard'] : [], options: {} }),
);
environment.NAKO_PLUGIN_CONFIG = pluginConfiguration;
// Stale installation settings must not restore removed cloud clients or pricing requests.
environment.NAKO_IDENTITY_ORIGIN = 'https://identity.work-fisher.com';
environment.RELAY_BASE_URL = 'https://api.work-fisher.com';
environment.RELAY_API_KEY = 'fixture-stale-key';
const child = spawn(
  process.execPath,
  [
    '--import',
    './tests/fixtures/no-outbound.mjs',
    'apps/backend/main.mjs',
    `--nako-instance=${instance}`,
  ],
  { cwd: process.cwd(), env: environment, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
);
let logs = '';
for (const stream of [child.stdout, child.stderr])
  stream.on('data', (value) => {
    logs = (logs + value).slice(-40_000);
  });
const exited = once(child, 'exit');
const origin = `http://127.0.0.1:${port}`;
async function json(url, options) {
  const response = await fetch(origin + url, { signal: AbortSignal.timeout(10_000), ...options });
  assert.ok(response.ok, `${url}: HTTP ${response.status}: ${await response.clone().text()}`);
  return response.json();
}
try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(`Backend exited: ${logs}`);
    try {
      ready = (await json('/readyz')).ready;
    } catch {
      /* Wait for the private runtime to listen. */
    }
    if (ready) break;
    await delay(100);
  }
  assert.ok(ready, `Backend did not become ready: ${logs}`);
  const manifest = await json('/api/plugins');
  assert.equal(manifest.plugins.filter((p) => p.state === 'active').length, withoutAgent ? 36 : 39);
  assert.ok(!manifest.plugins.some((plugin) => plugin.id === 'module.observability'));
  for (const endpoint of ['/diagnostics', '/api/diagnostics/health', '/api/diagnostics/export']) {
    assert.equal((await fetch(origin + endpoint)).status, 404, `Removed diagnostic route: ${endpoint}`);
  }
  assert.ok(!manifest.plugins.some((plugin) => plugin.id === 'provider.relay'));
  assert.ok(
    !manifest.services.some((service) => ['account.relay', 'telemetry.calls'].includes(service.id)),
  );
  for (const endpoint of ['/api/auth/profile', '/api/auth/admin/overview', '/api/account/relay']) {
    assert.equal(
      (await fetch(origin + endpoint)).status,
      404,
      `Removed cloud route is still mounted: ${endpoint}`,
    );
  }
  assert.equal(
    (
      await fetch(origin + '/api/auth/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
    ).status,
    404,
  );
  const sources = await json('/api/generation/sources');
  assert.ok(sources.blocks.length > 0);
  assert.ok(!sources.blocks.some((block) => block.source === 'relay'));
  assert.ok((await json('/api/generation/model-availability')).groups.length > 0);
  assert.ok(!logs.includes('UNEXPECTED_OUTBOUND_REQUEST'), logs);
  const saved = await json('/api/workflows', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      id: 'smoke-project',
      title: 'Plugin smoke project',
      nodes: [],
      edges: [],
      revision: 0,
    }),
  });
  assert.equal((await json(`/api/workflows/${saved.id}`)).title, 'Plugin smoke project');
  const nodeCatalog = await json('/api/node-packages');
  assert.ok(nodeCatalog.packages.some(item => item.manifest.id === 'nako.canvas-core'));
  assert.ok(!nodeCatalog.packages.some(item => ['shot-analysis', 'text-replace'].includes(item.manifest.id)));
  assert.equal(nodeCatalog.errors.length, 0);
  // Install the execution fixture only into this test's isolated directory.
  await cp(path.resolve('tests/fixtures/nodes/text-replace'), path.join(temporaryRoot, 'nodes', 'text-replace'), { recursive: true });
  await json('/api/node-packages/reload', { method: 'POST' });
  const runInput = { requestId: 'smoke-node', projectId: saved.id,
    nodes: [{ id: 'replace', type: 'text-replace.replace', pluginId: 'text-replace', parameters: { from: 'old', to: 'new' } }],
    initialInputs: { replace: [{ targetPortId: 'text', value: 'old canvas' }] } };
  const submitted = await json('/api/node-runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(runInput) });
  let nodeRun = submitted;
  for (let i = 0; nodeRun.status === 'running' && i < 50; i++) { await delay(100); nodeRun = await json('/api/node-runs/' + nodeRun.id); }
  assert.equal(nodeRun.status, 'success', JSON.stringify(nodeRun));
  assert.equal(nodeRun.results.replace.result, 'new canvas');
  assert.equal((await json('/api/node-runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(runInput) })).id, nodeRun.id);
  assert.equal((await fetch(origin + '/api/node-graph/execute', { method: 'POST' })).status, 404);
  if (withoutAgent) {
    for (const endpoint of ['/api/agent/v2/sessions', '/api/agent-skills', '/api/agent/drama/bundle']) {
      assert.equal(
        (await fetch(origin + endpoint)).status,
        404,
        `Disabled Agent route remains mounted: ${endpoint}`,
      );
    }
    assert.equal(
      manifest.plugins.find((plugin) => plugin.id === 'module.agent').state,
      'registered',
    );
  } else {
    assert.ok(Array.isArray(await json('/api/agent/v2/sessions')));
    assert.equal((await fetch(origin + '/api/chat/sessions')).status,404);
    assert.equal((await fetch(origin + '/api/agent/codex/status')).status, 404);
    assert.equal((await fetch(origin + '/api/agent/external/pair', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    })).status, 404);
    assert.ok(!manifest.plugins.some(plugin => plugin.id === 'platform.codex'));
    assert.ok(!manifest.services.some(service => ['agent.codex', 'local.codex', 'agent.external'].includes(service.id)));
    assert.ok(await json('/api/agent-skills'));
    assert.equal((await json('/api/agent/drama/bundle')).bundle.id, 'minimax-drama');
  }
  assert.ok(await json('/api/prompts'));
  assert.ok(Array.isArray(await json('/api/assets/images?projectId=smoke-project')));
  assert.equal((await fetch(origin + '/library/private/secret.txt')).status, 404);
  assert.equal((await json('/api/generation-status/never-submitted')).status, 'missing');
  await json('/api/plugins/provider.openai/disable', { method: 'POST' });
  let active = await json('/api/plugins/capabilities/generation.image');
  assert.ok(!active.some((p) => p.id === 'provider.openai'));
  await json('/api/plugins/provider.openai/enable', { method: 'POST' });
  active = await json('/api/plugins/capabilities/generation.image');
  assert.ok(active.some((p) => p.id === 'provider.openai'));
  assert.equal((await fetch(origin + '/')).status, 200);
  console.log(
    JSON.stringify(
      {
        ready: true,
        scenario: withoutAgent ? 'without-agent' : 'complete',
        activePlugins: manifest.plugins.filter((p) => p.state === 'active').length,
        services: manifest.services.length,
        checks: [
          'removed cloud routes/services absent',
          'source discovery without outbound requests',
          'project save/read',
          'media listing/private-path guard',
          withoutAgent ? 'Agent routes and services absent' : 'Agent sessions/skills/drama',
          'generation recovery',
          'provider disable/enable',
          'frontend HTTP',
        ],
      },
      null,
      2,
    ),
  );
  await json('/internal/runtime/shutdown', {
    method: 'POST',
    headers: { 'x-nako-runtime-instance': instance },
  });
  const result = await Promise.race([exited, delay(10_000).then(() => null)]);
  assert.ok(result && result[0] === 0, `Backend shutdown failed: ${logs}`);
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (child.exitCode === null) {
    child.kill();
    await exited;
  }
  await rm(temporaryRoot, { recursive: true, force: true });
}
