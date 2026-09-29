export const SKILL_CATEGORIES: readonly string[];
export const SKILL_CATALOG_CHANGED: string;
export const SKILL_PREVIEW_EVENT: string;
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
  /** True for an application preset copied into this user's private Skill directory. */
  preset?: boolean;
  openness?: 'open' | 'closed';
  version?: string;
  bundleId?: string;
}
