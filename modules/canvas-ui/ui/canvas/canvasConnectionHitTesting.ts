import type { CanvasViewport } from './canvasNavigation';
import type { ConnectionRuntime, ConnectionNode, ConnectionDragState } from './canvasConnectionHooks';
import { canConnectPackage, packageDefinition, packagePortY } from '../nodes/nodeConnectionPorts';

export function createConnectionHitTesting(runtime: ConnectionRuntime) {
  const template = (node: ConnectionNode) =>
    runtime.templates.find(item => item.id === node.comfyMode) ?? runtime.templates[0];
  const compatible = (
    nodes: ConnectionNode[], source: ConnectionNode, target: ConnectionNode,
    targetPort: number, sourcePort: number,
  ) => {
    const packageAllowed = canConnectPackage(source, target, nodes, targetPort, sourcePort);
    if (packageAllowed !== undefined) return packageAllowed ? 'default' : false;
    const workflow = runtime.workflow(), minimax = runtime.minimax();
    if (target.kind === 'workflow' && (!workflow || !workflow.canConnect(target, source, targetPort, sourcePort)))
      return false;
    if (target.comfyMode === 'minimax-h3-t2va' && minimax && !minimax.isConnectionAllowed(target, source, targetPort))
      return false;
    return runtime.canConnect({ ...source, __nakoSourcePort: sourcePort }, target, nodes, targetPort);
  };
  const hover = (
    value: ConnectionDragState, point: { x: number; y: number },
    nodes: ConnectionNode[], viewport: CanvasViewport,
  ): ConnectionDragState => {
    const start = value.connectionStart;
    const next = {
      ...value,
      tempConnectionEnd: point,
      hoveredNodeId: null,
      hoveredSide: null,
      hoveredPortIndex: null,
      isInvalidHover: false,
    } as ConnectionDragState;
    if (!start || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return next;
    const x = (point.x - viewport.x) / viewport.zoom,
      y = (point.y - viewport.y) / viewport.zoom;
    const node = nodes.find(
      item => item.id !== start.nodeId && x >= item.x && x <= item.x + runtime.getWidth(item) &&
        y >= item.y && y <= item.y + runtime.getHeight(item),
    );
    if (!node) return next;
    const side = start.handle === 'right' ? 'left' : 'right';
    let port = 0;
    const origin = nodes.find(item => item.id === start.nodeId);
    const registered = packageDefinition(node);
    if (registered) {
      const ports = side === 'left' ? registered.inputs : registered.outputs;
      port = ports.length ? Math.max(0, Math.min(ports.length - 1, Math.round((y - node.y - packagePortY(0)) / 26))) : -1;
    }
    if (node.type === 'ComfyUI') {
      const ports = side === 'left' ? template(node)?.inputs : template(node)?.outputs;
      if (node.kind === 'workflow') {
        // An input slot is chosen only when dragging into the workflow. When
        // dragging from an input, the hovered workflow supplies an output.
        if (side === 'left')
          port = origin
            ? (runtime.workflow()?.resolveAvailableInputSlot(node, origin, start.portIndex ?? 0) ?? -1)
            : -1;
        else {
          const outputs = Array.isArray(node.outputPorts) ? node.outputPorts : [];
          port = -1;
          let closest = Infinity;
          outputs.forEach((_, index) => {
            const center = runtime.workflow()?.getOutputPortY?.(node, index) ??
              runtime.getPortTop() + runtime.portHeight / 2 + index * (runtime.portHeight + runtime.portGap);
            const distance = Math.abs(y - node.y - center);
            if (distance < closest) {
              closest = distance;
              port = index;
            }
          });
        }
      } else if (node.comfyMode === 'minimax-h3-t2va' && side === 'left') {
        port = runtime.minimax()?.resolvePortIndex(node, y - node.y, origin) ?? 0;
      } else if (ports && ports.length > 1) {
        port = Math.max(
          0,
          Math.min(
            ports.length - 1,
            Math.round((y - node.y - runtime.getPortTop() - runtime.portHeight / 2) /
              (runtime.portHeight + runtime.portGap)),
          ),
        );
      }
    }
    next.hoveredNodeId = node.id;
    next.hoveredSide = side;
    next.hoveredPortIndex = port;
    if (origin)
      next.isInvalidHover = port < 0 || !compatible(
        nodes,
        start.handle === 'right' ? origin : node,
        start.handle === 'right' ? node : origin,
        start.handle === 'right' ? port : (start.portIndex ?? 0),
        start.handle === 'right' ? (start.portIndex ?? 0) : port,
      );
    return next;
  };
  return { compatible, hover };
}
