export interface StoredDramaAsset {
  id: string;
  kind: 'character' | 'scene';
  name: string;
  prompt: string;
  width: number;
  height: number;
  questions: string[];
  englishName?: string;
  voice?: string;
}
export interface StoredDramaSegment {
  id: string;
  title: string;
  duration: number;
  characterIds: string[];
  sceneId: string;
  blocking: string;
  shots: Array<{
    action: string;
    dialogue: Array<{ characterId: string; text: string; voiceover: boolean }>;
  }>;
  endState: string;
}
export interface StoredDramaPlan {
  schemaVersion: 1;
  id: string;
  revision: number;
  projectId: string;
  bundleId: string;
  bundleVersion: string;
  title: string;
  script: { name: string; text: string };
  assets: StoredDramaAsset[];
  segments: StoredDramaSegment[];
  questions: string[];
  createdAt: string;
  updatedAt: string;
  approvedRevision?: number;
}
/** Agent owns plan validation; storage obtains it as a public kernel capability. */
export interface DramaPlanValidation {
  assertDramaObject(value: unknown, keys: string[], label?: string): object;
  assertDramaPlanReviewable(plan: StoredDramaPlan): void;
  requireDramaPlanId(value: unknown): string;
  requireDramaProjectId(value: unknown): string;
  requireDramaRevision(value: unknown): number;
  validateDramaPlan(value: unknown): StoredDramaPlan;
}
