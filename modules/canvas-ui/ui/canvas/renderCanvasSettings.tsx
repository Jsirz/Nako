import './canvasWorkspace.css';
import type { useCanvasDocumentEffects } from './useCanvasDocumentEffects';
export function renderCanvasSettings(
  context: ReturnType<typeof useCanvasDocumentEffects> & { batchSourceNodeIds: string[] },
) {
  const {
    React,
    Settings,
    settingsOpen,
    setSettingsOpen,
    localUserId,
    localUserNo,
    localUserName,
    setLocalUserName,
  } = context;
  return React.createElement(Settings, {
    key: 'settings',
    isOpen: settingsOpen,
    onClose: () => setSettingsOpen(false),
    localUserName,
    setLocalUserName,
    localUserId,
    localUserNo,
  });
}
