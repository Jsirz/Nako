// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, afterAll, expect, it, vi } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/react';
import { SkillShowcase } from '../modules/agent/ui/skills/skillShowcase';
import { ProjectDashboardHome } from '../modules/project/ui/navigation/projectDashboardHome';
import { DashboardCover } from '../modules/project/ui/navigation/dashboardCover';
import { ProjectDashboardHeader } from '../modules/project/ui/navigation/projectDashboardHeader';
import { SKILL_CATALOG_CHANGED, SKILL_PREVIEW_EVENT } from '../modules/contracts/skillCatalog.js';
import { CARD_PLACEHOLDER_IMAGE } from '../modules/contracts/presentationAssets.js';
import { ShareShowcase } from '../modules/project/ui/navigation/shareShowcase';
import { previewShowcaseArchive, restoreShowcaseArchive } from '../modules/project/ui/navigation/shareShowcaseImport';
import { DashboardBrowserHeader } from '../modules/project/ui/navigation/dashboardBrowserHeader';
import { DashboardCollection } from '../modules/project/ui/navigation/dashboardCollection';
import { browserHost } from '../modules/kernel/browser.ts';
import { activateModal } from '../modules/canvas-ui/ui/design/modalFocus';
const releaseProjectUi = browserHost.services.register('ui.canvas.project', { activateModal });
afterAll(releaseProjectUi);
const records = () => [
  {
    slug: 'visual',
    source: 'official',
    name: '角色设计',
    category: '图像设计',
    description: '画面设计指引',
    fileCount: 2,
  },
  {
    slug: 'script',
    source: 'official',
    name: '故事脚本',
    category: '文本创作',
    description: '剧本创作指引',
    fileCount: 1,
  },
];
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('shows real skills, filters them, previews without generation, and refreshes after deletion', async () => {
  let skills = records();
  const fetcher = vi.fn(async () => Response.json({ skills }));
  vi.stubGlobal('fetch', fetcher);
  const view = render(React.createElement(SkillShowcase));
  await screen.findByText('角色设计');
  expect(screen.queryByRole('button', { name: /管理技能/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '文本创作', exact: true }));
  expect(screen.queryByText('角色设计')).toBeNull();
  const card = view.container.querySelector('.nako-showcase-card');
  card.focus();
  fireEvent.click(card);
  expect(screen.getByRole('dialog', { name: '故事脚本' })).toBeTruthy();
  expect(view.container.querySelector('.nako-skill-preview-sections').textContent).toContain('剧本创作指引');
  expect(screen.queryByText('/script')).toBeNull();
  expect(screen.queryByText('Skill 指令')).toBeNull();
  expect(screen.queryByText('包含内容')).toBeNull();
  expect(screen.queryByRole('button', { name: '复制技能指令' })).toBeNull();
  fireEvent.click(screen.getByLabelText('关闭技能详情'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(card);
  skills = [records()[0]];
  window.dispatchEvent(new Event(SKILL_CATALOG_CHANGED));
  await screen.findByText('角色设计');
  expect(screen.queryByText('故事脚本')).toBeNull();
  const skillCalls = fetcher.mock.calls.filter(([url]) => url === '/api/agent-skills');
  expect(skillCalls.length).toBeGreaterThan(1);
  expect(skillCalls.every(([, options]) => !options?.method)).toBe(true);
  expect(view.container.querySelector('img').getAttribute('src')).toBe(CARD_PLACEHOLDER_IMAGE);
});
it('recovers from a skill list failure and shows an official empty state', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ error: '暂时不可用' }, { status: 503 }))
    .mockResolvedValue(Response.json({ skills: [] }));
  vi.stubGlobal('fetch', fetcher);
  render(React.createElement(SkillShowcase));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByText('重新加载'));
  await screen.findByText('暂无官方预设技能。');
  expect(screen.queryByText('导入技能')).toBeNull();
});
it('shows only official skills and categories, including after catalog refresh or preview events', async () => {
  const local = { ...records()[1], source: 'local', category: '用户分类' };
  let skills = [records()[0], local, { ...local, slug: 'unknown', source: undefined }];
  const fetcher = vi.fn(async () => Response.json({ skills }));
  vi.stubGlobal('fetch', fetcher);
  const view = render(React.createElement(SkillShowcase));
  await screen.findByText('角色设计');
  expect(view.container.querySelectorAll('.nako-showcase-card')).toHaveLength(1);
  expect(screen.queryByText('故事脚本')).toBeNull();
  expect(screen.queryByRole('button', { name: '用户分类' })).toBeNull();
  fireEvent(window, new CustomEvent(SKILL_PREVIEW_EVENT, { detail: local }));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(view.container.querySelector('.nako-showcase-card'));
  expect(screen.queryByRole('button', { name: '编辑技能' })).toBeNull();
  fireEvent.click(screen.getByLabelText('关闭技能详情'));
  skills = [local];
  fireEvent(window, new Event(SKILL_CATALOG_CHANGED));
  await screen.findByText('暂无官方预设技能。');
  expect(view.container.querySelectorAll('.nako-showcase-card')).toHaveLength(0);
  expect(screen.queryByText('故事脚本')).toBeNull();
});
it('orders recent projects and opens the all-project browser without carousel controls', () => {
  const onNewProject = vi.fn(),
    onOpenProject = vi.fn(),
    onBrowseProjects = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json([])),
  );
  const view = render(
    React.createElement(ProjectDashboardHome, {
      projects: [
        { id: 'old', title: '旧项目', updatedAt: '2026-09-01' },
        { id: 'nested', title: '文件夹中的项目', folderId: 'folder', updatedAt: '2026-09-23' },
        { id: 'third', title: '第三个项目', updatedAt: '2026-09-22' },
        { id: 'fourth', title: '第四个项目', updatedAt: '2026-09-21' },
      ],
      loading: false,
      onNewProject,
      onOpenProject,
      onBrowseProjects,
      onPreviewShowcase: vi.fn(),
    }),
  );
  const recent = view.container.querySelectorAll('.nako-recent-card');
  expect(
    view.container.querySelector('.nako-home-recent-grid').firstElementChild.textContent,
  ).toContain('新建画布');
  expect(view.container.querySelector('.nako-home-hero button')).toBeNull();
  expect(recent[0].textContent).toContain('文件夹中的项目');
  fireEvent.click(recent[0]);
  expect(onOpenProject).toHaveBeenCalledWith('nested');
  fireEvent.click(screen.getByRole('button', { name: /新建画布/ }));
  expect(onNewProject).toHaveBeenCalledTimes(1);
  expect(recent).toHaveLength(4);
  expect(screen.queryByRole('button', { name: /浏览最近项目/ })).toBeNull();
  expect(screen.getByRole('button', { name: /全部项目/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /全部项目/ }));
  expect(onBrowseProjects).toHaveBeenCalledTimes(1);
  expect(screen.getByText('作品展示')).toBeTruthy();
});
it('renders the project browser toolbar and a create card without a recycle bin', () => {
  const onBack = vi.fn(),
    onQueryChange = vi.fn(),
    onCreateFolder = vi.fn(),
    onNewProject = vi.fn();
  const view = render(
    React.createElement(
      'div',
      null,
      React.createElement(DashboardBrowserHeader, {
        title: '全部项目',
        query: '',
        busy: false,
        onBack,
        onQueryChange,
        onCreateFolder,
      }),
      React.createElement(DashboardCollection, {
        projects: [],
        folders: [],
        allProjects: [],
        loading: false,
        onNewProject,
        cardProps: () => ({}),
        ProjectCard: () => null,
        FolderCard: () => null,
      }),
    ),
  );
  expect(screen.getByRole('heading', { name: '全部项目' })).toBeTruthy();
  expect(view.container.querySelector('[aria-label="搜索项目"]')).toBeTruthy();
  expect(screen.getByRole('button', { name: /新建文件夹/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /回收站/ })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /创建新画布/ }));
  expect(onNewProject).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /返回上一级/ }));
  expect(onBack).toHaveBeenCalledTimes(1);
  fireEvent.change(view.container.querySelector('[aria-label="搜索项目"]'), {
    target: { value: '测试' },
  });
  expect(onQueryChange).toHaveBeenCalledWith('测试');
  fireEvent.click(screen.getByRole('button', { name: /新建文件夹/ }));
  expect(onCreateFolder).toHaveBeenCalledTimes(1);
});
it.each(['/share/test1.nako', 'https://example.oss-cn-hangzhou.aliyuncs.com/test1.nako?signature=demo'])(
  'enlarges showcase cards and opens the process for %s without a node count', async (archive) => {
  const onPreview = vi.fn(async () => {});
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json([
        {
          id: 'sample',
          title: '晚风邮局',
          description: '剧本和分镜创作案例。',
          category: '短片创作',
          cover: '/share/Default_cover.png',
          archive,
          nodeCount: 6,
        },
      ]),
    ),
  );
  const view = render(React.createElement(ShareShowcase, { onPreview }));
  await screen.findByText('晚风邮局');
  expect(view.container.querySelector('.nako-share-grid')).toBeTruthy();
  expect(view.container.querySelector('.nako-share-rail')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /晚风邮局/ }));
  expect(screen.getByRole('dialog', { name: '晚风邮局' })).toBeTruthy();
  expect(onPreview).not.toHaveBeenCalled();
  expect(screen.queryByText(/个画布节点/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /查看制作过程/ }));
  await waitFor(() => expect(onPreview).toHaveBeenCalledWith(archive));
});
it('requests a non-persistent archive preview', async () => {
  const workflow = { title: 'preview', nodes: [], groups: [] };
  const fetcher = vi.fn()
    .mockResolvedValueOnce(Response.json({ workflow }));
  vi.stubGlobal('fetch', fetcher);
  await expect(previewShowcaseArchive('/share/test1.nako')).resolves.toEqual(workflow);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toEqual(['/api/workflows/preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archive: '/share/test1.nako' }),
  }]);
});
it.each(['/share/sample.mp4', 'https://example.oss-cn-hangzhou.aliyuncs.com/sample.mp4?signature=demo'])(
  'plays the cached showcase video %s only in details and releases it on close', async video => {
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const cachedUrl = `/api/showcase/videos/${'a'.repeat(64)}`;
  const fetcher = vi.fn(async url => url === '/api/showcase/videos' ? Response.json({ url: cachedUrl })
    : Response.json([{ id: 'sample', title: '示例作品', cover: '/share/Default_cover.png', archive: '/share/sample.nako', video }]));
  vi.stubGlobal('fetch', fetcher);
  const preview = vi.fn(), view = render(React.createElement(ShareShowcase, { onPreview: preview }));
  await screen.findByText('示例作品');
  expect(view.container.querySelector('video')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /示例作品/ }));
  const player = await screen.findByLabelText('示例作品视频');
  expect(player.getAttribute('src')).toBe(cachedUrl);
  expect(player.poster).toContain('/share/Default_cover.png');
  expect(player.controls).toBe(true); expect(player.preload).toBe('none'); expect(player.autoplay).toBe(false);
  expect(fetcher).toHaveBeenCalledTimes(2); expect(preview).not.toHaveBeenCalled();
  expect(fetcher.mock.calls[1][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ video }) });
  fireEvent.click(screen.getByLabelText('关闭案例'));
  expect(pause).toHaveBeenCalledOnce(); expect(load).toHaveBeenCalledOnce();
  expect(player.hasAttribute('src')).toBe(false); expect(screen.queryByRole('dialog')).toBeNull();
});
it('falls back to the cover after a video failure and permits retry without opening the canvas', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const cachedUrl = `/api/showcase/videos/${'b'.repeat(64)}`;
  vi.stubGlobal('fetch', vi.fn(async url => url === '/api/showcase/videos' ? Response.json({ url: cachedUrl })
    : Response.json([{ id: 'sample', title: '示例作品', cover: '/share/Default_cover.png', archive: '/share/sample.nako', video: '/share/sample.webm' }])));
  const preview = vi.fn(), view = render(React.createElement(ShareShowcase, { onPreview: preview }));
  await screen.findByText('示例作品'); fireEvent.click(screen.getByRole('button', { name: /示例作品/ }));
  fireEvent.error(await screen.findByLabelText('示例作品视频'));
  expect(view.container.querySelector('.nako-share-detail-cover img').getAttribute('src')).toBe('/share/Default_cover.png');
  expect(screen.getByRole('alert').textContent).toContain('视频暂时无法播放');
  fireEvent.click(screen.getByRole('button', { name: '重试播放' }));
  expect((await screen.findByLabelText('示例作品视频')).getAttribute('src')).toBe(cachedUrl);
  expect(screen.queryByRole('alert')).toBeNull(); expect(preview).not.toHaveBeenCalled();
});
it('shows caching status, retries failed downloads and ignores completed requests after closing details', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  let finish;
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json([{ id: 'sample', title: '示例作品', cover: '/share/Default_cover.png', archive: '/share/sample.nako', video: '/share/sample.mp4' }]))
    .mockResolvedValueOnce(Response.json({ error: '视频下载中断' }, { status: 502 }))
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', fetcher);
  const view = render(React.createElement(ShareShowcase, { onPreview: vi.fn() }));
  await screen.findByText('示例作品'); fireEvent.click(screen.getByRole('button', { name: /示例作品/ }));
  expect(screen.getByRole('status', { name: '视频加载中' }).textContent).toBe('');
  await screen.findByText('视频下载中断');
  expect(view.container.querySelector('video')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '重试播放' }));
  expect(screen.getByRole('status', { name: '视频加载中' }).textContent).toBe('');
  fireEvent.click(screen.getByLabelText('关闭案例'));
  expect(fetcher.mock.calls[2][1].signal.aborted).toBe(true);
  finish(Response.json({ url: `/api/showcase/videos/${'c'.repeat(64)}` }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(view.container.querySelector('video')).toBeNull();
});
it.each(['javascript:alert(1)', 'https://name:password@example.com/video.mp4', '/share/%2e%2e/video.mp4'])(
  'rejects the unsupported video source %s while keeping the showcase usable', async video => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ id: 'sample', title: '示例作品', cover: '/share/Default_cover.png', archive: '/share/sample.nako', video }])));
  const view = render(React.createElement(ShareShowcase, { onPreview: vi.fn() }));
  await screen.findByText('示例作品'); fireEvent.click(screen.getByRole('button', { name: /示例作品/ }));
  expect(view.container.querySelector('video')).toBeNull();
  expect(view.container.querySelector('.nako-share-detail-cover img')).toBeTruthy();
});
it('restores showcase archives as independent project copies', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: 'restored-copy' }, { status: 201 }));
  vi.stubGlobal('fetch', fetcher);
  await expect(restoreShowcaseArchive('/share/test1.nako')).resolves.toBe('restored-copy');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]).toEqual(['/api/workflows/restore?copy=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ archive: '/share/test1.nako' }),
  }]);
});
it('keeps settings in the header without the removed creation, search and view controls', () => {
  const settings = vi.fn(),
    onNewProject = vi.fn();
  window.addEventListener('nako:open-settings', settings);
  try {
    const Icon = () => null;
    const view = render(
      ProjectDashboardHeader(React, { onNewProject }, { SettingsIcon: Icon, AddIcon: Icon }),
    );
    expect(view.container.querySelector('input')).toBeNull();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '设置',
    ]);
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    expect(settings).toHaveBeenCalledTimes(1);
  } finally {
    window.removeEventListener('nako:open-settings', settings);
  }
});
it('falls back on broken project covers and retries when the cover changes', async () => {
  const view = render(
    React.createElement(DashboardCover, { url: '/library/a.png', title: '封面' }),
  );
  const image = screen.getByAltText('封面');
  expect(image.getAttribute('src')).toContain('/api/media/thumbnail?');
  fireEvent.error(image);
  await waitFor(() => expect(image.getAttribute('src')).toBe(CARD_PLACEHOLDER_IMAGE));
  view.rerender(React.createElement(DashboardCover, { url: '/library/b.png', title: '封面' }));
  expect(image.getAttribute('src')).toContain('b.png');
});
