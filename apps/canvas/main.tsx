import { browserHost } from '../../modules/kernel/browser';
import { ERRORS, PluginError } from '../../modules/contracts/errors.js';
import './bootstrap';
const element=document.getElementById('root');
if(!element)throw new PluginError(ERRORS.invalidCanvas, 'Canvas root element missing',
  { context: { moduleId: 'canvas-ui', operation: 'mount', elementId: 'root' } });
browserHost.services.get<{mount(element:HTMLElement):void}>('ui.root').mount(element);
