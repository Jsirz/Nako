import * as Icons from 'lucide-react';
import { bind } from '../../../canvas-ui/api/ui/app/presentation';
import { CanvasTooltip } from '../../../canvas-ui/api/ui/dialogs/canvasTooltip';
import { TEXT_MODELS } from '../../../generation-core/api/models/catalog';
import { CanvasAgentLauncher, CanvasAgentMessage } from './canvasAgentChrome';
import { CanvasAgentPanel } from './canvasAgentPanel';
import { canvasAgentModels } from './canvasAgentModels';
import type { CatalogParameter } from '../../../contracts/modelCatalog';
import { SkillShowcase } from '../skills/skillShowcase';

const Tooltip = bind(CanvasTooltip)(() => []);
const Message = bind(CanvasAgentMessage)(() => []);
const modelChoices = canvasAgentModels<CatalogParameter>(TEXT_MODELS);
export const agentSurfaces = {
  Home: SkillShowcase,
  Launcher: bind(CanvasAgentLauncher)(() => [{ Tooltip }]),
  Panel: bind(CanvasAgentPanel)(() => [
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
    modelChoices,
  ]),
};
