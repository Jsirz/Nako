import type { CanvasComponent } from '../../../canvas-ui/api/ui/app/canvasComponentType';
import { useWorkflowGeneratorModel, type Runtime, type Props } from './canvasWorkflowGeneratorModel';
import {
  renderWorkflowHeader,
  renderWorkflowPrompt,
  renderWorkflowPrimaryProgress,
  renderWorkflowError,
  renderWorkflowFooter,
} from './canvasWorkflowChromeRender';
import { renderWorkflowSettings } from './canvasWorkflowSettingsRender';
import { renderWorkflowInputPorts, renderWorkflowOutputPorts } from './canvasWorkflowPortsRender';

export function CanvasWorkflowGenerator(React: Runtime, props: Props, Frame: CanvasComponent) {
  const model = useWorkflowGeneratorModel(React, props);
  const { node, cloud, settings, loading, setHover } = model;
  return (
    <Frame
      data={node}
      selected={props.selected}
      isBareCard={!0}
      onNodePointerDown={props.onNodePointerDown}
      onContextMenu={props.onContextMenu}
      onConnectorDown={props.onConnectorDown}
      zoom={props.zoom}
      isHoveredForConnection={props.isHoveredForConnection}
      isInvalidHover={props.isInvalidHover}
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <div
        data-nako-workflow-node={'true'}
        data-nako-workflow-surface={cloud ? 'cloud' : 'local'}
        onMouseEnter={() => setHover(!0)}
        onMouseLeave={() => setHover(!1)}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          background: cloud ? 'var(--nk-info-bg)' : 'var(--nk-input)',
          border:
            '1px solid ' +
            (props.selected ? 'var(--nk-info)' : cloud ? 'var(--nk-border)' : 'var(--nk-border)'),
          boxShadow: props.selected ? '0 0 0 2px rgba(96,165,250,.18)' : '0 22px 70px rgba(0,0,0,.34)',
          borderRadius: '12px',
          color: 'var(--nk-text)',
          fontFamily: "Inter, 'Microsoft YaHei UI', system-ui, sans-serif",
        }}
      >
        <div
          data-nako-workflow-parameters="true"
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            minHeight: 0,
            flexDirection: 'column',
            background: 'var(--nk-surface)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {renderWorkflowHeader(React, model)}
          {!settings || cloud ? renderWorkflowPrompt(React, model) : null}
          {settings ? renderWorkflowSettings(React, model) : null}
          {!settings && loading ? renderWorkflowPrimaryProgress(React, model) : null}
          {node.errorMessage ? renderWorkflowError(React, model) : null}
          {renderWorkflowFooter(React, model)}
        </div>
        {renderWorkflowInputPorts(React, model)}
        {renderWorkflowOutputPorts(React, model)}
      </div>
    </Frame>
  );
}
