import type * as ReactTypes from 'react';
import { agentDocumentAccept } from '../../../contracts/shared/agentDocumentFormats.js';
import { agentMessageWithDocuments } from './agentDocuments';
import type { AgentPanelState } from './useCanvasAgentPanelState';

export function agentPanelActions(state: AgentPanelState) {
  const {
    epoch, sending, workspace, chat, attachments, isLoading, modelId, prompt, references,
    effectiveModelParams, referencedNodes, nodes, composerRef, fileRef, scroll,
    setDragOver, setPrompt, setExcludedNodes, setShowHistory,
  } = state;
  const onDragEnter = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    if (
      !(event.relatedTarget instanceof Node) ||
      !event.currentTarget.contains(event.relatedTarget)
    )
      setDragOver(false);
  };
  const onDragOver = (event: ReactTypes.DragEvent) => event.preventDefault();
  const onDrop = (event: ReactTypes.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (isLoading) return;
    try {
      const value = JSON.parse(event.dataTransfer.getData('application/json'));
      if (
        ['image', 'video', 'audio'].includes(value?.type) &&
        typeof value.url === 'string' &&
        typeof value.nodeId === 'string'
      )
        attachments.add({ type: value.type, url: value.url, nodeId: value.nodeId });
    } catch {
      /* Unrelated browser drags do not contain a canvas reference. */
    }
  };
  const chooseFile = (accept = `image/*,video/*,audio/*,.mkv,.flac,${agentDocumentAccept}`) => {
    if (isLoading || !fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  };
  const onFileChange = (event: ReactTypes.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (!isLoading) void attachments.readFiles(files);
  };
  const submit = async () => {
    if (
      sending.current ||
      isLoading ||
      (!prompt.trim() && !attachments.documents.length && !references.length)
    )
      return;
    if (!modelId) {
      const status = state.availability.emptyLabel();
      window.alert(status === '连接模型服务'
        ? '当前没有可用的文本模型，请在设置中连接模型服务后重试。'
        : status === '正在读取模型…'
          ? '正在读取可用模型，请稍后重试。'
          : '读取可用模型失败，请在模型菜单中点击“连接模型服务”重试。');
      return;
    }
    sending.current = true;
    const owner = epoch.current;
    try {
      if (!(await workspace.flush()) || owner !== epoch.current) return;
      const media = await attachments.prepare();
      if (!media || owner !== epoch.current) return;
      const message = agentMessageWithDocuments(prompt, attachments.documents);
      setPrompt('');
      scroll.followLatest();
      attachments.clear();
      if (composerRef.current) composerRef.current.style.height = 'auto';
      // Only explicitly referenced or selected nodes belong in the model context.
      await chat.sendMessage(message, media, modelId, effectiveModelParams, referencedNodes);
    } finally {
      if (owner === epoch.current) sending.current = false;
    }
  };
  const newChat = () => {
    epoch.current++;
    sending.current = false;
    chat.startNewChat();
    setExcludedNodes(nodes.map((node) => node.id));
    attachments.clear();
    setPrompt('');
    setShowHistory(false);
  };
  const openHistory = async (id: string) => {
    epoch.current++;
    sending.current = false;
    const owner = epoch.current;
    attachments.cancel();
    await chat.loadSession(id);
    if (owner !== epoch.current) return;
    setShowHistory(false);
  };
  const removeHistory = (event: ReactTypes.MouseEvent, id: string) => {
    event.stopPropagation();
    epoch.current++;
    sending.current = false;
    attachments.cancel();
    void chat.deleteSession(id).then((deleted) => {
      if (deleted && workspace.value.apiSessionId === id) workspace.patch({ apiSessionId: '' });
    });
  };
  const stop = () => {
    epoch.current++;
    sending.current = false;
    chat.stop();
  };
  return { onDragEnter, onDragLeave, onDragOver, onDrop, chooseFile, onFileChange, submit, newChat, openHistory, removeHistory, stop };
}
export type AgentPanelActions = ReturnType<typeof agentPanelActions>;
