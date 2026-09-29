import { browserHost } from '../../modules/kernel/browser';
import './bootstrap';
const element=document.getElementById('root');
if(!element)throw new Error('Canvas root element missing');
browserHost.services.get<{mount(element:HTMLElement):void}>('ui.root').mount(element);
