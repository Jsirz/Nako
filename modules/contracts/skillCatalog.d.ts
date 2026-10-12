export const SKILL_CATEGORIES: readonly string[];
export const SKILL_DESCRIPTION_MAX_LENGTH: number;
export const SKILL_CATALOG_CHANGED: string;
export const SKILL_PREVIEW_EVENT: string;
/** Kernel browser events: create a canvas, then select a skill in its Agent conversation. */
export const SKILL_NEW_CANVAS_EVENT: string;
export const SKILL_SELECT_EVENT: string;
export interface NewSkillCanvasRequest { slug: string }
export interface AgentSkillSelectionRequest extends NewSkillCanvasRequest { projectId: string }
export function skillCategory(value?: unknown): string;
export interface AgentSkill {
  slug: string;
  name: string;
  description: string;
  coverUrl?: string;
  fileCount: number;
  updatedAt: string;
  category?: string;
  source?: 'official' | 'local';
  /** True for an official preset read directly from the installed application. */
  preset?: boolean;
  openness?: 'open' | 'closed';
  version?: string;
  bundleId?: string;
}
