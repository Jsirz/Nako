import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Image, Mic, MousePointer2, Upload, Video } from 'lucide-react';
import { agentDocumentAccept } from '../../../contracts/shared/agentDocumentFormats.js';
import type { AgentPanelState } from './useCanvasAgentPanelState';
import type { AgentPanelActions } from './agentPanelActions';

const sources = [
  { id: 'text', label: '从文字灵感开始', icon: FileText, accept: agentDocumentAccept },
  { id: 'image', label: '从图片灵感开始', icon: Image, accept: 'image/*' },
  { id: 'video', label: '从视频灵感开始', icon: Video, accept: 'video/*,.mkv' },
  { id: 'audio', label: '从声音灵感开始', icon: Mic, accept: 'audio/*,.flac' },
] as const;
type Source = (typeof sources)[number]['id'];
const tasks: Record<Source, { label: string; output: string; prompt: string }[]> = {
  text: [
    { label: '扩写灵感', output: '创意与提示词', prompt: '根据文字灵感扩写创意，整理主题、风格和可编辑的图像提示词。' },
    { label: '分拆脚本', output: '脚本与分镜', prompt: '根据文字灵感或文档分拆脚本，按场景整理人物、动作、台词与分镜。' },
  ],
  image: [
    { label: '描述图片内容', output: '图像描述', prompt: '理解参考图片，描述主体、场景、构图、光线和风格，区分可见事实与推测。' },
    { label: '提取图像提示词', output: '图像提示词', prompt: '分析参考图片，提取便于复现其主体、构图、光线和风格的可编辑图像提示词。' },
    { label: '图生视频', output: '视频生成计划', prompt: '根据参考图片规划图生视频，先给出动作、运镜、时长和视频提示词，保留图片作为参考。' },
    { label: '整理为技能', output: '技能草稿', prompt: '分析参考图片中的创作方法，整理为可复用的技能草稿，包含输入、步骤、输出和适用范围，不安装技能。' },
  ],
  video: [
    { label: '提取视频要素', output: '要素与分镜', prompt: '分析参考视频，按时间顺序提取主体、场景、动作、运镜、节奏和分镜，区分观察与推测。' },
    { label: '整理为技能', output: '技能草稿', prompt: '分析参考视频中的创作方法，整理为可复用的技能草稿，包含输入、步骤、输出和适用范围，不安装技能。' },
  ],
  audio: [
    { label: '音频转写', output: '转写文本', prompt: '转写参考音频中的语音，尽可能标注说话人和时间；若转写能力不可用，请明确说明，不编造内容。' },
    { label: '根据音频规划图片', output: '图像提示词与计划', prompt: '先转写或分析参考音频，再根据内容、情绪和节奏整理可编辑的图像提示词与生成计划；若无法分析音频，请说明。' },
    { label: '根据音频规划视频', output: '分镜与视频计划', prompt: '先转写或分析参考音频，再根据内容、情绪和节奏整理分镜、运镜、时长与视频提示词；若无法分析音频，请说明。' },
  ],
};

export function AgentInspirationNavigator({ state, actions }: {
  state: AgentPanelState;
  actions: AgentPanelActions;
}) {
  const { inspirationSource: source, setInspirationSource: setSource } = state;
  const [step, setStep] = useState<'input' | 'task'>('input');
  const [showNodes, setShowNodes] = useState(false);
  const [prepared, setPrepared] = useState('');
  const selected = sources.find((item) => item.id === source);
  const focusComposer = () => state.composerRef.current?.focus();
  const nodes = source ? state.nodes.filter((node) => node.type.toLowerCase().includes(source)) : [];
  const hasInput = source === 'text'
    ? Boolean(state.prompt.trim() || state.attachments.documents.length || state.referencedNodes.some((node) =>
      node.type.toLowerCase().includes('text') && (node.textContent?.trim() || node.prompt?.trim())))
    : state.references.some((reference) => reference.type === source);
  const ready = !state.isLoading && hasInput;
  const chooseTask = (task: (typeof tasks)[Source][number]) => {
    if (!ready) return;
    state.setPrompt([
      state.prompt.trim(), task.prompt,
      '先在对话中给出可检查、可编辑的结果；缺少信息时先询问。不要立即生成媒体或执行工作流，等我确认后再执行。',
    ].filter(Boolean).join('\n\n'));
    state.workspace.patch({ generationApproval: 'confirm' });
    setPrepared(`${task.label} · ${task.output}`);
    setSource(null);
    setStep('input');
    setShowNodes(false);
    focusComposer();
  };
  return <section className="nako-agent-inspiration" aria-label="灵感导航">
    {selected ? <>
      <nav className="nako-agent-inspiration-path" aria-label="灵感步骤">
        <button type="button" title="返回选择来源" aria-label="返回选择来源" disabled={state.isLoading}
          onClick={() => { setSource(null); setStep('input'); setShowNodes(false); }}>
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <span>{selected.label}</span><ArrowRight size={14} aria-hidden="true" />
        {step === 'task' ? <button type="button" disabled={state.isLoading} onClick={() => setStep('input')}>提供输入</button>
          : <span aria-current="step">提供输入</span>}
        {step === 'task' && <><ArrowRight size={14} aria-hidden="true" /><span aria-current="step">选择任务</span></>}
      </nav>
      {step === 'input' ? <>
        <div className="nako-agent-inspiration-inputs">
          <button type="button" disabled={state.isLoading} onClick={focusComposer}>
            <FileText size={16} aria-hidden="true" />输入描述
          </button>
          <button type="button" disabled={state.isLoading} onClick={() => actions.chooseFile(selected.accept)}>
            <Upload size={16} aria-hidden="true" />{source === 'text' ? '上传文档' : '上传文件'}
          </button>
          <button type="button" disabled={state.isLoading || !state.props.onLocateNode}
            aria-expanded={showNodes} onClick={() => setShowNodes(!showNodes)}>
            <MousePointer2 size={16} aria-hidden="true" />从画布选择
          </button>
        </div>
        {showNodes && <div className="nako-agent-inspiration-nodes" aria-label="画布输入">
          {nodes.length ? nodes.map((node) => {
            const included = source === 'text'
              ? state.referencedNodes.some((item) => item.id === node.id)
              : state.references.some((item) => item.nodeId === node.id);
            return <button type="button" key={node.id} disabled={state.isLoading}
              onClick={() => {
                state.setExcludedNodes((current) => current.filter((id) => id !== node.id));
                const reference = state.props.selectedReferenceNodes?.find((item) => item.nodeId === node.id);
                if (reference) state.attachments.add({ ...reference, type: reference.type || 'image' });
                state.props.onLocateNode?.(node.id);
              }}>
              <selected.icon size={16} aria-hidden="true" />
              <span>{node.title || node.textContent?.slice(0, 40) || node.type}</span>
              {included && <Check size={14} aria-hidden="true" />}
            </button>;
          }) : <p>当前画布没有{source === 'text' ? '文字' : source === 'image' ? '图片' : source === 'video' ? '视频' : '音频'}节点</p>}
        </div>}
        <div className="nako-agent-inspiration-next">
          <span role="status">{hasInput ? '输入已就绪' : source === 'text' ? '待添加文字或文档' : '待添加参考素材'}</span>
          <button type="button" disabled={!ready} onClick={() => setStep('task')}>
            选择任务<ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </> : <div className="nako-agent-suggestions" aria-label="可选任务">
        {tasks[source!].map((task) => <button type="button" key={task.label} disabled={!ready} onClick={() => chooseTask(task)}>
          <span><strong>{task.label}</strong><small>{task.output}</small></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>)}
      </div>}
    </> : <>
      <div className="nako-agent-suggestions" aria-label="选择灵感来源">
        {sources.map(({ id, label, icon: Icon }) => <button type="button" key={id} disabled={state.isLoading}
          onClick={() => { setSource(id); setStep('input'); setShowNodes(false); setPrepared(''); }}>
          <Icon size={18} aria-hidden="true" /><span><strong>{label}</strong></span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>)}
      </div>
      {prepared && <p className="nako-agent-inspiration-prepared" role="status"><Check size={14} aria-hidden="true" />{prepared}</p>}
    </>}
  </section>;
}
