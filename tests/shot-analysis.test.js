import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { analysis, source, extracted } from './fixtures/shot-analysis.js';
import { analysisChoices, parseShotAnalysis } from '../modules/contracts/shotAnalysis.js';
import { createShotAnalysisProcessor } from '../plugins/media/ffmpeg-sharp/shotAnalysis.js';
import { executeIsolatedNode } from '../modules/desktop-shell-observability/nodeSandbox.js';
import { createNodeCapabilities } from '../modules/desktop-shell-observability/nodeCapabilities.js';
import { createNodeDirectoryLoader } from '../modules/desktop-shell-observability/serverNodeDirectory.js';
import { NodeRegistry } from '../modules/kernel/nodeRegistry.js';
import { createNodeRunService } from '../modules/kernel/nodeRunService.js';
import { NODE_CAPABILITIES } from '../modules/contracts/nodeExecution.js';

describe('shot analysis protocol', () => {
  it('accepts fenced JSON and removes unsupported audio descriptions without mutating input', () => {
    const value = analysis();
    expect(parseShotAnalysis('```json\n' + JSON.stringify(value) + '\n```', 4)).toEqual(value);
    expect(parseShotAnalysis(value, 4, false)).toMatchObject({ audioStatus: 'silent', shots: [{ dialogue: '', music: '', soundEffects: '' }, { dialogue: '', music: '', soundEffects: '' }] });
    expect(value.shots[0].dialogue).toBe('你好');
    value.audioStatus = 'unavailable';
    expect(parseShotAnalysis(value, 4).shots[0].dialogue).toBe('');
  });
  it.each([
    value => { value.shots[1].id = 's1'; }, value => { value.shots[1].start = 1; },
    value => { value.shots[0].keyframes = [2]; }, value => { value.shots[0].keyframes = [1, 1]; },
    value => { value.shots[1].end = 5; }, value => { value.shots[0].start = -1; },
    value => { value.shots[0].end = 0; }, value => { value.shots = []; },
  ])('rejects invalid ranges, duplicate IDs and invalid frames', change => {
    const value = analysis(); change(value);
    expect(() => parseShotAnalysis(value, 4)).toThrow();
  });
  it('rejects invalid JSON, long videos and empty selections with domain errors', () => {
    for (const operation of [() => parseShotAnalysis('{', 4), () => parseShotAnalysis(analysis(), 1201), () => analysisChoices({ storyboard: false, motion: false, sound: false })]) {
      try { operation(); expect.fail('must reject'); } catch (error) {
        expect(error).toMatchObject({ code: 'INVALID_MEDIA_ASSET', status: 400, context: { moduleId: 'asset-media', operation: 'validateAnalysis' } });
      }
    }
  });
});

describe('local shot media processing', () => {
  let directory;
  afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });
  async function setup(hasAudio = true, output) {
    directory = await mkdtemp(path.join(os.tmpdir(), 'nako-shots-'));
    await mkdir(path.join(directory, 'media/p/videos'), { recursive: true });
    await writeFile(path.join(directory, 'media/p/videos/input.mp4'), 'video');
    const run = vi.fn(async (binary, args, options) => {
      if (path.basename(binary).startsWith('ffprobe')) return { stdout: JSON.stringify({ format: { duration: '4' }, streams: [
        { codec_type: 'video', width: 1280, height: 720, avg_frame_rate: '25/1' }, ...(hasAudio ? [{ codec_type: 'audio' }] : []),
      ] }) };
      expect(options.windowsHide).toBe(true);
      expect(args).toContain('-nostdin'); expect(args).toContain('file,pipe');
      await writeFile(args.at(-1), 'output');
      if (output) await output(options);
      return { stdout: '' };
    });
    return { run, processor: createShotAnalysisProcessor({ libraryDirectory: directory, binDirectory: path.join(directory, 'bin'), run }) };
  }
  const input = () => ({ projectId: 'p', url: source().url });
  it('normalizes one bounded proxy and reuses generated media by source and timestamps', async () => {
    const { run, processor } = await setup();
    const prepared = await processor.prepareAnalysis(input());
    expect(prepared.video.type).toBe('video'); expect(prepared.source.duration).toBe(4);
    expect(run.mock.calls[1][1]).toEqual(expect.arrayContaining(['libx264', 'aac', '+faststart']));
    await processor.prepareAnalysis(input());
    const first = await processor.extractAnalysis({ ...input(), analysis: analysis(), fingerprint: prepared.source.fingerprint });
    const count = run.mock.calls.filter(([bin]) => path.basename(bin).startsWith('ffmpeg')).length;
    const second = await processor.extractAnalysis({ ...input(), analysis: analysis() });
    expect(first.shots[0]).toMatchObject({ frames: [{ time: 1, type: 'image' }], clip: { type: 'video' }, audio: { type: 'audio' } });
    expect(second.shots).toEqual(first.shots);
    expect(run.mock.calls.filter(([bin]) => path.basename(bin).startsWith('ffmpeg'))).toHaveLength(count);
    expect(count).toBe(7);
    await expect(processor.extractAnalysis({ ...input(), analysis: analysis(), fingerprint: 'changed' })).rejects.toThrow('已经变化');
  });
  it('skips proxy encoding for re-extraction and skips audio for silent sources', async () => {
    const { run, processor } = await setup(false);
    const prepared = await processor.prepareAnalysis({ ...input(), includeProxy: false });
    expect(prepared.video).toBeUndefined(); expect(run).toHaveBeenCalledTimes(1);
    const result = await processor.extractAnalysis({ ...input(), analysis: analysis(), choices: { storyboard: false, motion: false, sound: true } });
    expect(result.analysis.audioStatus).toBe('silent'); expect(result.shots[0].audio).toBeUndefined();
    expect(run.mock.calls.every(([bin]) => path.basename(bin).startsWith('ffprobe'))).toBe(true);
  });
  it.each([false, true])('cleans partial files after failure or cancellation (%s)', async cancelled => {
    const controller = new AbortController();
    const { processor } = await setup(true, async () => { if (cancelled) controller.abort(); throw new Error('ffmpeg failed'); });
    await expect(processor.prepareAnalysis({ ...input(), signal: controller.signal })).rejects.toMatchObject({ code: cancelled ? 'NODE_EXECUTION_CANCELLED' : 'MEDIA_STORAGE_FAILED' });
    expect(await readdir(path.join(directory, 'media/p/videos'))).toEqual(['input.mp4']);
  });
  it('rejects non-project paths before invoking media tools', async () => {
    const { processor, run } = await setup();
    for (const url of ['/library/media/other/videos/input.mp4', '/library/media/p/videos/%2e%2e%2fsecret.mp4', 'https://example.test/input.mp4'])
      await expect(processor.prepareAnalysis({ ...input(), url })).rejects.toMatchObject({ status: 403 });
    expect(run).not.toHaveBeenCalled();
  });
  it('passes the no-proxy flag through the scoped host capability', async () => {
    const prepareAnalysis = vi.fn(async () => ({}));
    const capabilities = createNodeCapabilities({ mediaProcessor: { prepareAnalysis } });
    await capabilities['media.prepareAnalysis']({ video: source().url, includeProxy: false }, { projectId: 'p', signal: new AbortController().signal });
    expect(prepareAnalysis).toHaveBeenCalledWith(expect.objectContaining({ includeProxy: false, projectId: 'p', url: source().url }));
  });
});

describe('isolated built-in shot executor', () => {
  it('loads the installed package and runs through real host authorization, budgets and scoped cache', async () => {
    const registry = new NodeRegistry(), directory = path.resolve('nodes');
    const loader = createNodeDirectoryLoader({ directory, builtinDirectory: path.join(directory, 'canvas-core'), registry, logger: { info() {} } });
    expect((await loader.reload()).errors).toEqual([]);
    expect(registry.resolveNode('shot-analysis', 'nako.canvas-core').definition.agent.exposed).toBe(false);
    const records = new Map(), values = new Map();
    const store = { createId: randomUUID, list: async () => [], save: async record => records.set(record.id, structuredClone(record)),
      value: async (scope, pluginId, key, value) => { const id = [scope, pluginId, key].join(':'); if (value === undefined) return values.get(id); values.set(id, value); return null; } };
    const generateNode = vi.fn(async () => ({ text: JSON.stringify(analysis()) }));
    const prepareAnalysis = vi.fn(async () => ({ source: source(), video: { type: 'video', url: '/library/media/p/videos/proxy.mp4' }, prompt: 'analyze' }));
    const extractAnalysis = vi.fn(async () => extracted());
    const capabilities = createNodeCapabilities({ generation: { generateNode }, mediaProcessor: { prepareAnalysis, extractAnalysis }, store });
    const runs = await createNodeRunService({ registry, store, capabilities, policy: NODE_CAPABILITIES, readProject: async () => ({ id: 'p', nodes: [] }) });
    const graph = (requestId, parameters = {}, maxModelCalls = 1) => ({ requestId, projectId: 'p', maxModelCalls,
      nodes: [{ id: 'n', type: 'shot-analysis', pluginId: 'nako.canvas-core', parameters: { video: source().url, ...parameters } }] });
    try {
      const prepared = await runs.prepare(graph('first'), { scope: 'user' });
      expect(prepared.status).toBe('awaiting_approval'); expect(generateNode).not.toHaveBeenCalled(); expect(prepareAnalysis).not.toHaveBeenCalled();
      await runs.approve(prepared.id, 'user', prepared.capabilities);
      expect((await runs.wait(prepared.id, 'user')).status).toBe('success');
      const next = await runs.prepare(graph('second', { reuseRunId: prepared.id }, 0), { scope: 'user' });
      await runs.approve(next.id, 'user', next.capabilities);
      expect(await runs.wait(next.id, 'user')).toMatchObject({ status: 'success', modelCalls: 0 });
      expect(generateNode).toHaveBeenCalledTimes(1); expect(extractAnalysis).toHaveBeenCalledTimes(2);
      expect(prepareAnalysis.mock.calls.at(-1)[0].includeProxy).toBe(false);
    } finally { await runs.close(); }
  });
  it('calls the model once, persists analysis and re-extracts with zero model calls', async () => {
    const code = await readFile(new URL('../nodes/canvas-core/shotAnalysis.mjs', import.meta.url), 'utf8');
    const saved = new Map(), currentSource = source(), extracts = vi.fn(async input => ({ analysis: input.analysis }));
    const call = vi.fn(async (capability, input) => {
      if (capability === 'media.prepareAnalysis') return { source: currentSource, video: { url: '/library/media/p/videos/proxy.mp4', type: 'video' }, prompt: 'analyze' };
      if (capability === 'models.generate') return { text: JSON.stringify(analysis()) };
      if (capability === 'media.validateAnalysis') return parseShotAnalysis(input.analysis, input.duration, input.hasAudio);
      if (capability === 'media.extractAnalysis') return extracts(input);
      if (capability === 'storage.set') { saved.set(input.key, input.value); return null; }
      if (capability === 'storage.get') return saved.get(input.key);
      throw new Error('unexpected capability');
    });
    const execute = (parameters, runId = 'first', nodeId = 'n') => executeIsolatedNode({ sources: { 'index.mjs': "import {shotAnalysis} from './shotAnalysis.mjs'; export const executors={run:shotAnalysis};", 'shotAnalysis.mjs': code }, entry: 'index.mjs', method: 'run' },
      { inputs: { video: source().url }, parameters }, { runId, nodeId, call });
    await execute({});
    expect(call.mock.calls.filter(([name]) => name === 'models.generate')).toHaveLength(1);
    const edited = analysis(); edited.shots[0].keyframes = [0.5];
    await execute({ reuseRunId: 'first', analysis: JSON.stringify(edited) }, 'second');
    expect(call.mock.calls.filter(([name]) => name === 'models.generate')).toHaveLength(1);
    expect(extracts.mock.calls.at(-1)[0].analysis.shots[0].keyframes).toEqual([0.5]);
    expect(call.mock.calls.filter(([name]) => name === 'media.prepareAnalysis').at(-1)[1].includeProxy).toBe(false);
    await expect(execute({ reuseRunId: 'first' }, 'third', 'different-node')).rejects.toMatchObject({ code: 'INVALID_MEDIA_ASSET' });
    currentSource.fingerprint = 'changed';
    await expect(execute({ reuseRunId: 'first' }, 'fourth')).rejects.toMatchObject({ code: 'INVALID_MEDIA_ASSET' });
    expect(extracts).toHaveBeenCalledTimes(2);
  });
});
