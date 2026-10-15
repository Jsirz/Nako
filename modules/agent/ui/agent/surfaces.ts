import * as Icons from 'lucide-react';
import * as React from 'react';
import { canvasPresentation, modelCatalog } from '../../../kernel/browser';
import { CanvasAgentLauncher, CanvasAgentMessage } from './canvasAgentChrome';
import { CanvasAgentPanel } from './canvasAgentPanel';
import { canvasAgentModels } from './canvasAgentModels';
import type { CatalogParameter } from '../../../contracts/modelCatalog';
import { SkillShowcase } from '../skills/skillShowcase';

const Tooltip = (props: Parameters<ReturnType<typeof canvasPresentation>['tooltip']>[0]) =>
  canvasPresentation().tooltip(props) as React.ReactNode;
const Message = (props: Parameters<typeof CanvasAgentMessage>[1]) => CanvasAgentMessage(React, props);
export const agentSurfaces = {
  Home: SkillShowcase,
  Launcher: (props: Parameters<typeof CanvasAgentLauncher>[1]) => CanvasAgentLauncher(React, props, { Tooltip }),
  Panel: (props: Parameters<typeof CanvasAgentPanel>[1]) => CanvasAgentPanel(React, props,
    {
      Tooltip,
      Message,
      ImageIcon: Icons.Sparkles,
      BackIcon: Icons.ChevronLeft,
      Spinner: Icons.LoaderCircle,
      HistoryIcon: Icons.History,
      DeleteIcon: Icons.Trash2,
      AddIcon: Icons.Plus,
      CloseIcon: Icons.Minus,
      UploadIcon: Icons.Paperclip,
      ChatIcon: Icons.MessageSquare,
      SettingsIcon: Icons.SlidersHorizontal,
      ChevronIcon: Icons.ChevronDown,
      SendIcon: Icons.ArrowUp,
    },
    canvasAgentModels<CatalogParameter>(modelCatalog().list('text')),
  ),
};
