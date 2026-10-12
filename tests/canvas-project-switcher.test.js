// @vitest-environment jsdom
import * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CanvasHeader } from '../modules/canvas-ui/ui/dialogs/canvasHeader';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(overrides = {}) {
  const onSave = vi.fn(async () => ({ unchanged: true }));
  const onSwitchProject = vi.fn(async () => {});
  const props = {
    canvasTitle: '当前画布', isEditingTitle: false, editingTitleValue: '当前画布',
    canvasTitleInputRef: { current: null }, setCanvasTitle: vi.fn(),
    setIsEditingTitle: vi.fn(), setEditingTitleValue: vi.fn(),
    onSave, onSwitchProject, currentProjectId: 'current',
    onImportWorkflow: vi.fn(), onExportWorkflow: vi.fn(async () => {}),
    hasUnsavedChanges: false, ...overrides,
  };
  const Icon = () => React.createElement('span');
  const components = { Tooltip: ({ children }) => children, SaveIcon: Icon, BackIcon: Icon };
  const view = render(React.createElement(() => CanvasHeader(React, props, components)));
  fireEvent.click(screen.getByRole('button', { name: '项目菜单' }));
  return { view, onSave, onSwitchProject };
}

it('switches to another project in the canvas after saving', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([
    { id: 'current', title: '当前画布' }, { id: 'other', title: '另一画布' },
  ])));
  const { onSave, onSwitchProject } = mount();
  const projectList = screen.getByLabelText('切换项目');
  expect((await within(projectList).findByRole('button', { name: /当前画布/ })).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '另一画布' }));
  await waitFor(() => expect(onSwitchProject).toHaveBeenCalledWith('other'));
  expect(onSave).toHaveBeenCalledOnce();
});

it('keeps the current canvas when saving is unconfirmed', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([{ id: 'other', title: '另一画布' }])));
  const onSwitchProject = vi.fn();
  mount({ onSave: async () => null, onSwitchProject });
  fireEvent.click(await screen.findByRole('button', { name: '另一画布' }));
  await screen.findByText('当前项目尚未保存完成，请保存后再切换');
  expect(onSwitchProject).not.toHaveBeenCalled();
});

it('saves the current canvas before leaving for the dashboard', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
  const onBack = vi.fn();
  const { onSave } = mount({ onBack });
  fireEvent.click(screen.getByRole('button', { name: '退出画布' }));
  await waitFor(() => expect(onBack).toHaveBeenCalledOnce());
  expect(onSave).toHaveBeenCalledOnce();
});

it('keeps the canvas open if its exit save is unconfirmed', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json([])));
  const onBack = vi.fn();
  mount({ onSave: async () => null, onBack });
  fireEvent.click(screen.getByRole('button', { name: '退出画布' }));
  await screen.findByRole('alert');
  expect(onBack).not.toHaveBeenCalled();
});
