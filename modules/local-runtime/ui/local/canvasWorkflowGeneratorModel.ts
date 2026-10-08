import { browserServices } from '../../../kernel/browser';
import { useWorkflowNodeSession } from './workflowNodeSession';
import type * as ReactTypes from 'react';
import type {
  WorkflowCanvasNodeRecord,
  WorkflowCanvasInputSlot,
  WorkflowCanvasNodesAdapter,
} from '../../../contracts/workflowCanvasNodeProtocol';
import type { WorkflowCanvasBlueprint } from './workflowManagerClient';

export type Runtime = Pick<
  typeof ReactTypes,
  | 'createElement'
  | 'Fragment'
  | 'useState'
  | 'useEffect'
  | 'useRef'
  | 'useCallback'
  | 'useLayoutEffect'
>;
export type Parameter = WorkflowCanvasBlueprint['parameterSchema'][number];
interface ConnectedNode extends Record<string, unknown> {
  id: string;
  type: string;
  url?: string;
  resultUrl?: string;
  lastFrame?: string;
  textContent?: string;
  resultText?: string;
  prompt?: string;
  text?: string;
}
export interface Props {
  data: WorkflowCanvasNodeRecord;
  selected: boolean;
  onUpdate(id: string, patch: Partial<WorkflowCanvasNodeRecord>): void;
  onNodePointerDown: unknown;
  onContextMenu: unknown;
  onConnectorDown(
    event: ReactTypes.PointerEvent,
    id: string,
    side: 'left' | 'right',
    index: number,
  ): void;
  zoom: number;
  isHoveredForConnection: boolean;
  isInvalidHover: boolean;
  onMouseEnter: unknown;
  onMouseLeave: unknown;
  connectedImageNodes?: ConnectedNode[];
  projectId: string;
}

export const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const isTextParameter = (parameter: Parameter) =>
  ['text', 'textarea', 'string', 'prompt', 'multiline'].includes(
    String(parameter.control?.kind || '').toLowerCase(),
  );

export function connectedNodeText(node: ConnectedNode | null | undefined) {
  const candidate = [node?.textContent, node?.resultText, node?.prompt, node?.text].find(
    (item) => typeof item === 'string',
  );
  return candidate ?? '';
}

export const workflowControlStyle = {
  width: '100%',
  height: '38px',
  padding: '0 11px',
  border: '1px solid var(--nk-border-control)',
  borderRadius: '8px',
  background: 'var(--nk-input)',
  color: 'var(--nk-text)',
  outline: 'none',
  fontSize: '12px',
};

function workflowGeneratorView(
  node: WorkflowCanvasNodeRecord,
  adapter: WorkflowCanvasNodesAdapter | undefined,
  connectedNodes: ConnectedNode[],
) {
  const slots = adapter?.getInputSlots(node) || [];
  const outputs = Array.isArray(node.outputPorts) ? node.outputPorts : [];
  const parameters = Array.isArray(node.parameterSchema) ? node.parameterSchema : [];
  const values = node.parameterValues || {};
  const cloud =
    node.executionTarget === 'cloud' ||
    (!node.executionTarget &&
      String(node.subtitle || '').toLowerCase().includes('runninghub'));
  const textParameters = parameters.filter(isTextParameter);
  const primaryTextParameter =
    textParameters.find((parameter) => /^prompt$/i.test(String(parameter.key || ''))) ||
    textParameters.find((parameter) => /提示词/.test(String(parameter.label || ''))) ||
    textParameters.find(
      (parameter) =>
        /^(text|description)$/i.test(String(parameter.key || '')) ||
        /描述/.test(String(parameter.label || '')),
    ) ||
    textParameters[0];
  const creativeTextParameters = primaryTextParameter ? [primaryTextParameter] : [];
  const settingsParameters = cloud
    ? parameters.filter((parameter) => parameter !== primaryTextParameter)
    : parameters;
  const settings = !!node.isWorkflowParametersOpen;
  const instanceType =
    String(node.runningHubInstanceType || '').toLowerCase() === 'default' ? 'default' : 'plus';
  const errorDetails = !!node.isWorkflowErrorDetailsOpen;
  const errorSummary = node.errorSummary || adapter?.getErrorSummary(node) || '工作流运行失败';
  const errorDetailsId = 'nako-workflow-error-details-' + node.id;
  const paused = node.executionState?.status === 'observing-paused';
  const loading = node.status === 'loading';
  const realtime = node.executionState?.realtimeChannel;
  const progress = asRecord(node.executionState?.progress);
  const progressValue = Number(progress?.value);
  const progressMaximum = Number(progress?.maximum);
  const nodeId = progress?.currentNodeId || node.executionState?.currentNodeId;
  const hasProgress =
    Number.isFinite(progressValue) && Number.isFinite(progressMaximum) && progressMaximum > 0;
  const progressPercent = hasProgress
    ? Math.min(100, Math.max(0, Math.round((progressValue / progressMaximum) * 100)))
    : null;
  const progressLabel = hasProgress
    ? (nodeId ? '节点 ' + nodeId + ' · ' : '') +
      '当前步骤 ' +
      progressValue +
      '/' +
      progressMaximum +
      ' · ' +
      progressPercent +
      '%'
    : nodeId
      ? '正在执行节点 ' + nodeId
      : cloud
        ? '任务已提交，正在等待 RunningHub 返回进度'
        : realtime === 'history-fallback'
          ? '实时通道已断开，正在轮询 ComfyUI'
          : '等待 ComfyUI 返回节点进度';
  const connectedSlots = slots.filter((slot) => (node.parentIds || [])[slot.slotIndex]);
  const connectedCount = connectedSlots.length;
  const requiredConnectionsReady = slots
    .filter((slot) => slot.required)
    .every((slot) => (node.parentIds || [])[slot.slotIndex]);
  const limitNotice = adapter?.getInputLimitNotice(node);
  const linkedNode = (slot: WorkflowCanvasInputSlot) => {
    const parentId = (node.parentIds || [])[slot.slotIndex];
    return connectedNodes.find((node) => node.id === parentId);
  };
  const cardSlots = connectedSlots.filter((slot) => linkedNode(slot));
  const openSlots = slots.filter((slot) => !(node.parentIds || [])[slot.slotIndex]);
  const openAssetSlots = openSlots.filter((slot) => slot.source === 'input-port');
  const parameterSlot = (parameter: Parameter) =>
    slots.find((slot) => slot.source === 'parameter' && slot.bindingKey === parameter.key);
  const parameterNode = (parameter: Parameter) => {
    const slot = parameterSlot(parameter);
    return slot ? linkedNode(slot) : null;
  };
  const outputHint = loading
    ? progressLabel
    : node.status === 'success'
      ? '结果已生成到画布右侧，并与当前工作流连接'
      : '运行后会自动创建外部结果节点并连线';
  return {
    node,
    slots,
    outputs,
    values,
    cloud,
    creativeTextParameters,
    settingsParameters,
    settings,
    instanceType,
    errorDetails,
    errorSummary,
    errorDetailsId,
    paused,
    loading,
    nodeId,
    hasProgress,
    progressPercent,
    progressLabel,
    connectedCount,
    requiredConnectionsReady,
    limitNotice,
    linkedNode,
    cardSlots,
    openSlots,
    openAssetSlots,
    parameterNode,
    outputHint,
  };
}

export function useWorkflowGeneratorModel(React: Runtime, props: Props) {
  const {
    data: node,
    onUpdate,
    onConnectorDown,
    connectedImageNodes: connectedNodes = [],
    projectId,
  } = props;
  const adapter = browserServices.__NAKO_WORKFLOW_NODES__;
  const view = workflowGeneratorView(node, adapter, connectedNodes);
  const [hover, setHover] = React.useState(!1);
  const [uploadingSlot, setUploadingSlot] = React.useState<number | null>(null);
  const [numberDrafts, setNumberDrafts] = React.useState<Record<string, string>>({});
  const patch = React.useCallback(
    (next: Partial<WorkflowCanvasNodeRecord>) => onUpdate(node.id, next),
    [node.id, onUpdate],
  );
  const stop = (event: ReactTypes.SyntheticEvent) => event.stopPropagation();
  const input = (event: ReactTypes.PointerEvent, index: number) => {
    event.stopPropagation();
    onConnectorDown(event, node.id, 'left', index);
  };
  const output = (event: ReactTypes.PointerEvent, index: number) => {
    event.stopPropagation();
    onConnectorDown(event, node.id, 'right', index);
  };
  const set = (key: string, value: unknown) =>
    patch({ parameterValues: { ...view.values, [key]: value } });
  const invalidConnection = props.isHoveredForConnection && props.isInvalidHover;
  const connectionSignature = [...(node.parentIds || []), '::', ...(node.sourcePortIndices || [])].join(
    '|',
  );
  const previousConnectionSignature = React.useRef(connectionSignature);
  const session = useWorkflowNodeSession(
    React,
    adapter,
    {
      node,
      connectedNodes,
      projectId: projectId || String(node.projectId || ''),
    },
    onUpdate,
    setUploadingSlot,
  );
  React.useEffect(() => {
    if (
      node.executionState?.status === 'validation-error' &&
      view.requiredConnectionsReady &&
      node.executionState?.status === 'validation-error' &&
      /尚未连接素材/.test(String(node.errorMessage || ''))
    )
      patch({
        status: 'idle',
        executionState: { status: 'idle' },
        errorMessage: void 0,
        errorSummary: void 0,
        isWorkflowErrorDetailsOpen: !1,
      });
  }, [view.requiredConnectionsReady, node.errorMessage, node.executionState?.status, patch]);
  React.useEffect(() => {
    if (previousConnectionSignature.current === connectionSignature) return;
    previousConnectionSignature.current = connectionSignature;
    if (node.executionState?.status === 'validation-error')
      patch({
        status: 'idle',
        executionState: { status: 'idle' },
        errorMessage: void 0,
        errorSummary: void 0,
        isWorkflowErrorDetailsOpen: !1,
      });
  }, [connectionSignature, node.executionState?.status, patch]);
  const editBindings = (event: ReactTypes.SyntheticEvent) => {
    event.stopPropagation();
    const definitionId = node.workflowRef?.definitionId;
    if (definitionId)
      window.dispatchEvent(
        new CustomEvent('nako:edit-workflow-parameters', {
          detail: {
            definitionId,
            nodeId: node.id,
            title: node.title,
          },
        }),
      );
  };
  return {
    ...view,
    ...session,
    hover,
    setHover,
    uploadingSlot,
    numberDrafts,
    setNumberDrafts,
    patch,
    stop,
    input,
    output,
    set,
    onUpdate,
    invalidConnection,
    editBindings,
    adapter,
    isHoveredForConnection: props.isHoveredForConnection,
    isInvalidHover: props.isInvalidHover,
  };
}

export type WorkflowGeneratorModel = ReturnType<typeof useWorkflowGeneratorModel>;
