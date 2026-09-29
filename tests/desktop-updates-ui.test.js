// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateModal, UpdateSettings } from '../modules/desktop-shell-observability/ui/desktop/updateSettings';
import { PREPARE_DESKTOP_RESTART } from '../modules/contracts/desktopUpdates';

afterEach(cleanup);
function setup(phase = 'idle') {
  let listener = () => {};
  const state = { version: '1.1.3', phase, message: '点击检查更新' };
  const bridge = {
    state: vi.fn(async () => state),
    check: vi.fn(async () => ({ ...state, phase: 'current', message: '当前已是最新版本' })),
    download: vi.fn(async () => ({ ...state, phase: 'downloaded', percent: 100, nextVersion: '1.1.4', message: '更新已就绪，重启后安装' })),
    install: vi.fn(async () => ({ ...state, phase: 'installing', message: '准备重启安装' })),
    subscribe: vi.fn((fn) => { listener = fn; return vi.fn(); }),
  };
  render(React.createElement(UpdateSettings, { bridge, version: '1.1.3' }));
  return { bridge, emit: (next) => listener(next) };
}

function setupModal(phase = 'available') {
  let listener = () => {};
  const state = { version: '1.1.3', phase, nextVersion: '1.1.4', message: phase === 'available' ? '发现新版本 1.1.4' : '更新已就绪，重启后安装' };
  const bridge = {
    state: vi.fn(async () => state),
    check: vi.fn(async () => ({ ...state, phase: 'available' })),
    download: vi.fn(async () => ({ ...state, phase: 'downloaded', percent: 100 })),
    install: vi.fn(async () => ({ ...state, phase: 'installing' })),
    subscribe: vi.fn((fn) => { listener = fn; return vi.fn(); }),
  };
  render(React.createElement(UpdateModal, { bridge, version: '1.1.3' }));
  return { bridge, emit: (next) => listener(next) };
}

it('shows current version and checks when clicked', async () => {
  const { bridge } = setup();
  fireEvent.click(screen.getByRole('button', { name: '当前版本 1.1.3，检查更新' }));
  await screen.findByText('当前已是最新版本');
  expect(bridge.check).toHaveBeenCalledOnce();
});

it('shows a browser-only message without claiming the version is latest', () => {
  render(React.createElement(UpdateSettings, { version: '1.1.3' }));
  expect(screen.getByRole('status').textContent).toBe('自动更新仅适用于桌面安装版');
  expect(screen.getByRole('button').disabled).toBe(true);
});

it('blocks restart if a canvas save fails', async () => {
  const { bridge } = setup('downloaded');
  const rejectSave = (event) => {
    event.detail.waitUntil(Promise.resolve(false));
  };
  window.addEventListener(PREPARE_DESKTOP_RESTART, rejectSave);
  try {
    fireEvent.click(await screen.findByRole('button', { name: '重启安装' }));
    await screen.findByText('无法准备重启，请确认画布已保存后重试');
    expect(bridge.install).not.toHaveBeenCalled();
  } finally { window.removeEventListener(PREPARE_DESKTOP_RESTART, rejectSave); }
});

it('waits for a canvas save before requesting restart', async () => {
  const { bridge } = setup('downloaded');
  let finish = () => {};
  const save = new Promise(resolve => { finish = resolve; });
  const onPrepare = (event) => event.detail.waitUntil(save);
  window.addEventListener(PREPARE_DESKTOP_RESTART, onPrepare);
  try {
    fireEvent.click(await screen.findByRole('button', { name: '重启安装' }));
    expect(bridge.install).not.toHaveBeenCalled();
    finish(true);
    await waitFor(() => expect(bridge.install).toHaveBeenCalledOnce());
  } finally { window.removeEventListener(PREPARE_DESKTOP_RESTART, onPrepare); }
});

it('offers download only after an update is available', async () => {
  const { bridge } = setupModal('available');
  const button = await screen.findByRole('button', { name: '立即更新' });
  fireEvent.click(button);
  await waitFor(() => expect(bridge.download).toHaveBeenCalledOnce());
});

it('offers restart after an update has downloaded', async () => {
  const { bridge } = setupModal('downloaded');
  expect(await screen.findByRole('button', { name: '立即更新并重启' })).toBeTruthy();
  const rejectSave = (event) => event.detail.waitUntil(Promise.resolve(true));
  window.addEventListener(PREPARE_DESKTOP_RESTART, rejectSave);
  try {
    fireEvent.click(screen.getByRole('button', { name: '立即更新并重启' }));
    await waitFor(() => expect(bridge.install).toHaveBeenCalledOnce());
  } finally { window.removeEventListener(PREPARE_DESKTOP_RESTART, rejectSave); }
});

it('can close the modal while a download continues', async () => {
  const { bridge, emit } = setupModal('available');
  let finish;
  bridge.download.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(await screen.findByRole('button', { name: '立即更新' }));
  act(() => emit({ version: '1.1.3', phase: 'downloading', percent: 24, message: '正在下载更新' }));
  expect(screen.getByRole('progressbar').value).toBe(24);
  fireEvent.click(await screen.findByRole('button', { name: '关闭更新提示' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => finish({ version: '1.1.3', phase: 'downloaded', message: '更新已就绪' }));
  expect(await screen.findByRole('button', { name: '立即更新并重启' })).toBeTruthy();
  expect(bridge.download).toHaveBeenCalledOnce();
  expect(bridge.install).not.toHaveBeenCalled();
});

it('allows deferred downloads from settings', async () => {
  const { bridge } = setup('available');
  fireEvent.click(await screen.findByRole('button', { name: '立即更新' }));
  await waitFor(() => expect(bridge.download).toHaveBeenCalledOnce());
});

it('blocks modal installation when saving fails', async () => {
  const { bridge } = setupModal('downloaded');
  const rejectSave = event => event.detail.waitUntil(Promise.resolve(false));
  window.addEventListener(PREPARE_DESKTOP_RESTART, rejectSave);
  try {
    fireEvent.click(await screen.findByRole('button', { name: '立即更新并重启' }));
    await screen.findByText('无法准备重启，请确认画布已保存后重试');
    expect(bridge.install).not.toHaveBeenCalled();
  } finally { window.removeEventListener(PREPARE_DESKTOP_RESTART, rejectSave); }
});
