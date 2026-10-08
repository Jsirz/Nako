import type * as ReactTypes from 'react';
import './canvasWorkspace.css';
import { renderCanvasControls } from './renderCanvasControls';
import { renderCanvasHeader } from './renderCanvasHeader';
import { renderCanvasImportInput } from './renderCanvasImportInput';
import { renderCanvasMergeInput } from './renderCanvasMergeInput';
import { renderCanvasAnnotation } from './renderCanvasAnnotation';
import { renderCanvasImageEditor } from './renderCanvasImageEditor';
import { renderCanvasResize } from './renderCanvasResize';
import { renderCanvasSelectionBox } from './renderCanvasSelectionBox';
import { renderCanvasEmptyState } from './renderCanvasEmptyState';
import { renderCanvasContextOverlays } from './renderCanvasContextOverlays';
import { renderCanvasScene } from './renderCanvasScene';
import { renderCanvasSettings } from './renderCanvasSettings';
import { renderCanvasSidebar } from './renderCanvasSidebar';
import { renderCanvasSidePanels } from './renderCanvasSidePanels';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
import { ReadOnlyBanner } from './readOnlyBanner';
export function renderCanvasWorkspace(context: ReturnType<typeof useCanvasDocumentEffects>) {
  const {
    React,
    Projects,
    Settings,
    view,
    folderId,
    chatPanelWidth,
    settingsOpen,
    setSettingsOpen,
    isChatOpen,
    batchConnecting,
    selectedNodeIds,
    connectionStart,
    pendingBatchSourceNodeIds,
    localUserId,
    localUserNo,
    localUserName,
    setLocalUserName,
    openProject,
    newProject,
    readOnly,
    copyShowcaseProject,
  } = context;

  if (view === 'dashboard')
    return React.createElement(React.Fragment, {
      children: [
        React.createElement(Projects, {
          key: 'projects',
          onOpenProject: openProject,
          onOpenShowcasePreview: context.openShowcasePreview,
          onNewProject: newProject,
          initialFolderId: folderId,
        }),
        React.createElement(Settings, {
          key: 'settings',
          isOpen: settingsOpen,
          onClose: () => setSettingsOpen(false),
          localUserName,
          setLocalUserName,
          localUserId,
          localUserNo,
        }),
      ],
    });
  const batchSourceNodeIds =
    batchConnecting && connectionStart
      ? Array.from(new Set(selectedNodeIds))
      : pendingBatchSourceNodeIds;
  return React.createElement('div', {
    key: 'div',
    'data-nako-workspace': 'true',
    style: {
      '--nako-panel-space': !readOnly && isChatOpen ? `${chatPanelWidth}px` : '0px',
    } as ReactTypes.CSSProperties,
    className:
      'w-screen h-screen bg-[var(--nk-input)] text-[var(--nk-text)] overflow-hidden select-none font-sans transition-colors duration-300',
    children: [
      renderCanvasHeader({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasImportInput({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasMergeInput({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasSidebar({ ...context, batchSourceNodeIds }),
      renderCanvasScene({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasEmptyState({ ...context, batchSourceNodeIds }),
      renderCanvasControls({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasSidePanels({ ...context, batchSourceNodeIds }),
      renderCanvasContextOverlays({ ...context, batchSourceNodeIds }),
      renderCanvasSettings({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasAnnotation({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasImageEditor({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasResize({ ...context, batchSourceNodeIds }),
      !readOnly && renderCanvasSelectionBox({ ...context, batchSourceNodeIds }),
      readOnly && React.createElement(ReadOnlyBanner, { key: 'banner', onCopy: copyShowcaseProject }),
    ],
  });
}
