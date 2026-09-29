import type { WorkflowManagerSession } from './workflowManagerTypes';
import { ManagerState } from './workflowManagerTypes';

export function bindWorkflowFileInputs(
  fileInput: HTMLInputElement,
  importFiles: (files: File[]) => void,
  session: WorkflowManagerSession,
  host: HTMLElement,
  panel: HTMLDivElement,
  setNotice: (text: string, tone?: '' | 'error' | 'success') => void,
  directoryInput: HTMLInputElement,
  state: ManagerState,
  render: () => void,
) {
  fileInput.addEventListener('change', () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = '';
    importFiles(files);
  });
  const canDropWorkflow = () =>
    session.managerView === 'library' &&
    session.librarySection === 'mine' &&
    session.libraryRunnerScope === 'local' &&
    host.dataset.busy !== 'true';
  panel.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = canDropWorkflow() ? 'copy' : 'none';
    if (canDropWorkflow()) panel.style.outline = '1px dashed var(--nk-focus)';
  });
  panel.addEventListener('dragleave', (event) => {
    if (!(event.relatedTarget instanceof Node) || !panel.contains(event.relatedTarget)) {
      panel.style.outline = '';
    }
  });
  panel.addEventListener('drop', (event) => {
    panel.style.outline = '';
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    event.stopPropagation();
    if (!canDropWorkflow()) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.some((file) => !file.name.toLowerCase().endsWith('.json'))) {
      setNotice('请拖入 ComfyUI 工作流 JSON 文件。', 'error');
      return;
    }
    session.uploadMode = 'quick';
    importFiles(files);
  });

  directoryInput.addEventListener('change', () => {
    const selectedFiles = [...(directoryInput.files || [])];
    directoryInput.value = '';
    if (!selectedFiles.length) return;
    const maximumFiles = 500;
    const maximumFileBytes = 20 * 1024 * 1024;
    const candidates = selectedFiles
      .filter((file) => file.name.toLowerCase().endsWith('.json'))
      .filter((file) => file.size > 0 && file.size <= maximumFileBytes)
      .slice(0, maximumFiles)
      .map((file) => ({
        file,
        relativePath: file.webkitRelativePath || file.name,
        byteLength: file.size,
      }));
    if (!candidates.length) {
      state.discovered = undefined;
      setNotice('所选目录中没有可导入的 JSON 工作流，或文件超过 20 MiB。', 'error');
      render();
      return;
    }
    const rootLabel = candidates[0].relativePath.split('/')[0] || '所选目录';
    state.discovered = { label: rootLabel, candidates };
    const omitted = selectedFiles.length - candidates.length;
    setNotice(
      `已读取“${rootLabel}”，找到 ${candidates.length} 个 JSON 工作流${omitted > 0 ? `，忽略 ${omitted} 个非 JSON、空文件、超限文件或超出数量上限的文件` : ''}。`,
      'success',
    );
    render();
  });
}
