/** @jsxRuntime classic */
/** @jsx React.createElement */
import type { Icons, Runtime } from './canvasAgentPanelTypes';
import type { AgentPanelState } from './useCanvasAgentPanelState';
import type { AgentPanelActions } from './agentPanelActions';
import { AgentModelMenu } from './AgentModelMenu';
import { AgentConversationOptions } from './AgentConversationOptions';
import { agentDocumentAccept } from '../../../contracts/shared/agentDocumentFormats.js';
import { agentVisionHints } from './agentVision';
import { renderAgentPanelAttachments } from './renderAgentPanelConversation';

function renderAdvancedParams(React: Runtime, state: AgentPanelState) {
  const { advancedParams, modelParams, setModelParams } = state;
  return (
    <div className="absolute bottom-full right-0 mb-2 w-64 max-w-[min(calc(100vw-112px),calc(100cqw-112px))] max-h-64 overflow-y-auto bg-[var(--nk-surface)] border border-[var(--nk-border-control)] rounded-lg shadow-2xl p-2.5 z-50 space-y-2">
      <div className="text-[9px] text-[var(--nk-text-muted)] font-bold uppercase tracking-wider border-b border-[var(--nk-border-control)] pb-1">
        高级参数
      </div>
      {advancedParams.map((parameter) => {
        const value = modelParams[parameter.key] ?? parameter.default;
        return (
          <div className="space-y-1" key={parameter.key}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--nk-text-secondary)]">{parameter.label}</span>
              {parameter.type === 'slider' && (
                <span className="text-[10px] text-[var(--nk-text-secondary)]">
                  {String(value ?? '')}{parameter.unit || ''}
                </span>
              )}
            </div>
            {parameter.type === 'toggle' ? (
              <button
                type="button"
                onClick={() =>
                  setModelParams((current) => ({
                    ...current,
                    [parameter.key]: !(current[parameter.key] ?? parameter.default),
                  }))
                }
                className={`relative w-8 h-4 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-[var(--nk-hover)]'}`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 bg-[var(--nk-primary)] rounded-full transition-transform ${value ? 'left-4' : 'left-0.5'}`}
                />
              </button>
            ) : parameter.type === 'select' ? (
              <div className="flex flex-wrap gap-1">
                {parameter.options?.map((option) => (
                  <button
                    type="button"
                    onClick={() =>
                      setModelParams((current) => ({ ...current, [parameter.key]: option.value }))
                    }
                    className={`px-2 py-1 text-[10px] rounded-md ${value === option.value ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[var(--nk-hover)] text-[var(--nk-text-secondary)]'}`}
                    key={option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : parameter.type === 'slider' ? (
              <input
                type="range"
                min={parameter.min}
                max={parameter.max}
                value={Number(value ?? 0)}
                step={parameter.step ?? 'any'}
                onChange={(event) =>
                  setModelParams((current) => ({
                    ...current,
                    [parameter.key]: Number(event.target.value),
                  }))
                }
                className="w-full h-1 bg-[var(--nk-hover)] rounded-full appearance-none cursor-pointer accent-blue-500"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function renderAgentPanelComposer(
  React: Runtime,
  state: AgentPanelState,
  actions: AgentPanelActions,
  { AddIcon, SettingsIcon, ChevronIcon, SendIcon, Spinner }: Icons,
) {
  const {
    props, workspace, attachments, isLoading, prompt, references, selectedVision, modelId,
    selectedModelId, activeModel, availableModels, showModelMenu, setShowModelMenu,
    showParams, setShowParams, modelMenuRef, paramsRef, advancedParams,
    composerRef, fileRef, chat, thinking,
  } = state;
  const { chooseFile, onFileChange, submit, stop } = actions;
  const canSend = !isLoading &&
    Boolean(prompt.trim() || attachments.documents.length || references.length);
  return (
    <div className="nako-agent-compose-area p-3 shrink-0">
      <div data-nako-agent-skills-slot="true" />
      {workspace.error && (
        <p role="alert" className="text-xs text-[var(--nk-warning)] mb-2">
          {workspace.error}
          <button className="ml-2 underline" onClick={() => void workspace.retry()}>重试保存与恢复</button>
        </p>
      )}
      {!workspace.ready && !workspace.error && (
        <p role="status" className="text-xs text-[var(--nk-text-muted)] mb-2">正在恢复助手草稿…</p>
      )}
      {chat.error && (
        <div role="alert" className="text-xs text-[var(--nk-warning)] mb-2 leading-5">{chat.error}</div>
      )}
      {attachments.error && (
        <p role="alert" className="text-sm text-red-400 mb-2">{attachments.error}</p>
      )}
      {modelId && selectedVision !== 'supported' && (
        <p
          role="note"
          aria-live="polite"
          data-nako-agent-vision={selectedVision}
          className="mb-2 text-xs leading-relaxed text-[var(--nk-text-secondary)]"
        >
          {agentVisionHints[selectedVision]}
        </p>
      )}
      <div className="nako-agent-compose-box rounded-2xl p-3 bg-[var(--nk-surface)]">
        {renderAgentPanelAttachments(React, state)}
        <div data-nako-agent-context-slot="true" />
        <textarea
          data-nako-agent-composer="true"
          ref={composerRef}
          value={prompt}
          onChange={(event) => state.setPrompt(event.target.value)}
          placeholder="描述目标，或输入 / 调用技能"
          className="w-full bg-transparent text-sm outline-none mb-2 resize-none min-h-[48px] max-h-[160px] text-[var(--nk-text)] placeholder:text-[var(--nk-text-muted)]"
          rows={2}
          style={{ scrollbarWidth: 'none' }}
          disabled={isLoading}
          onInput={(event) => {
            const textarea = event.currentTarget;
            textarea.style.height = 'auto';
            const height = Math.min(textarea.scrollHeight, 160);
            textarea.style.height = height + 'px';
            textarea.style.overflowY = textarea.scrollHeight > 160 ? 'auto' : 'hidden';
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing &&
              event.keyCode !== 229
            ) {
              event.preventDefault();
              void submit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <input
              ref={fileRef}
              type="file"
              accept={`image/*,video/*,audio/*,.mkv,.flac,${agentDocumentAccept}`}
              multiple
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              aria-label="上传附件（图片、音视频、Word、文本）"
              onClick={() => chooseFile()}
              disabled={isLoading}
              className="nako-agent-composer-tool border border-[var(--nk-border-control)]"
              title="添加附件"
            >
              <AddIcon size={18} />
            </button>
            <AgentConversationOptions
              value={workspace.value}
              patch={workspace.patch}
              thinking={thinking}
              disabled={isLoading}
              generation={Boolean(props.canvasCreation)}
            />
            <div className="relative ml-auto min-w-0 flex-1 flex justify-end" ref={modelMenuRef}>
              <button
                type="button"
                aria-label="选择模型"
                aria-expanded={showModelMenu}
                disabled={isLoading}
                onClick={() => setShowModelMenu(!showModelMenu)}
                className="flex min-w-0 max-w-full h-8 items-center gap-1 text-[var(--nk-text-secondary)] text-xs rounded-md px-1.5 hover:bg-[var(--nk-hover)] transition-colors disabled:opacity-50"
              >
                <span
                  className="truncate"
                  title={`${activeModel?.label || modelId || 'AUTO'} · ${agentVisionHints[selectedVision]}`}
                >
                  {selectedModelId ? (activeModel?.label || selectedModelId).split(' · ')[0] : 'AUTO'}
                </span>
                <ChevronIcon
                  size={12}
                  className={`shrink-0 text-[var(--nk-text-muted)] transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`}
                />
              </button>
              {showModelMenu && (
                <AgentModelMenu
                  models={[{ id: '', label: 'AUTO', advancedParams: [], vision: 'unknown' }, ...availableModels]}
                  selected={selectedModelId}
                  onSelect={(id) => {
                    state.setModelId(id);
                    setShowModelMenu(false);
                  }}
                  onServices={() => {
                    setShowModelMenu(false);
                    state.availability.openConnection();
                  }}
                />
              )}
            </div>
            {advancedParams.length > 0 && (
              <div className="relative shrink-0" ref={paramsRef}>
                <button
                  type="button"
                  aria-label="高级参数"
                  title="高级参数"
                  aria-expanded={showParams}
                  disabled={isLoading}
                  onClick={() => setShowParams((value) => !value)}
                  className="nako-agent-composer-tool"
                >
                  <SettingsIcon size={16} />
                </button>
                {showParams && renderAdvancedParams(React, state)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {chat.isStreaming ? (
              <button
                type="button"
                aria-label="停止回答"
                onClick={stop}
                className="w-8 h-8 rounded-full bg-[var(--nk-hover)] text-[var(--nk-text)] flex items-center justify-center"
              >
                <span className="w-3 h-3 bg-current rounded-sm" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="发送给 Nako Agent"
                onClick={submit}
                disabled={!canSend}
                className={`aspect-square w-8 h-8 rounded-full flex items-center justify-center transition-colors text-[var(--nk-text)] ${canSend ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-[var(--nk-hover)] cursor-not-allowed'}`}
              >
                {isLoading ? <Spinner size={16} className="animate-spin" /> : <SendIcon size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
