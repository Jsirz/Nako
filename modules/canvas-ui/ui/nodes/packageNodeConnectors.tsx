import type { PointerEvent } from 'react';
import { packageDefinition, packagePortY } from './nodeConnectionPorts';
export function PackageNodeConnectors({ data, onConnectorDown }: {
  data: { id: string; type: string; [key: string]: unknown };
  onConnectorDown(event: PointerEvent, id: string, side: 'left' | 'right', index?: number): void;
}) {
  const definition = packageDefinition(data);
  return <>{(['left', 'right'] as const).flatMap(side => (side === 'left' ? definition?.inputs : definition?.outputs)?.map((port, index) =>
    <button key={side + port.id} type="button" aria-label={`${side === 'left' ? '输入' : '输出'} ${port.id}`} title={`${port.id} · ${port.media.join('/')}`}
      data-nako-connector-node-id={data.id} data-nako-connector-side={side} data-nako-connector-port-index={index}
      className="absolute z-20 w-4 h-4 rounded-full border-2 border-[var(--nk-focus)] bg-[var(--nk-panel)] cursor-crosshair"
      style={{ [side]: -8, top: packagePortY(index) - 8 }} onPointerDown={event => { event.stopPropagation(); onConnectorDown(event, data.id, side, index); }} />) || [])}</>;
}
