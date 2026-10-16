import type { PluginError } from './errors.js';
export interface AnalysisChoices { storyboard: boolean; motion: boolean; sound: boolean }
export interface Shot { id: string; start: number; end: number; keyframes: number[]; description: string; framing: string; camera: string; motion: string; dialogue: string; music: string; soundEffects: string }
export interface ShotAnalysis { version: 1; summary: string; audioStatus: 'analyzed' | 'unavailable' | 'silent'; shots: Shot[] }
export interface AnalysisMedia { assetId: string; type: 'image' | 'video' | 'audio'; url: string; projectId: string; time?: number }
export interface AnalysisSource { url: string; type: 'video'; duration: number; width: number; height: number; fps: number; hasAudio: boolean; fingerprint: string }
export interface PreparedAnalysis { source: AnalysisSource; video?: AnalysisMedia; prompt: string }
export interface ShotAnalysisResult { id: string; source: AnalysisSource; choices: AnalysisChoices; analysis: ShotAnalysis; shots: Array<Shot & { frames: AnalysisMedia[]; clip?: AnalysisMedia; audio?: AnalysisMedia }> }
export interface AnalysisPrepareInput { projectId: string; url: string; choices?: Partial<AnalysisChoices>; includeProxy?: boolean; signal?: AbortSignal }
export interface AnalysisExtractInput extends AnalysisPrepareInput { analysis: string | ShotAnalysis; fingerprint?: string }
export interface ShotAnalysisInsertion { projectId: string; nodeId: string; resultId: string; documentEpoch: number }
export const SHOT_ANALYSIS_MODEL: string;
export const SHOT_ANALYSIS_LIMITS: Readonly<{ duration: number; shots: number; uploadBytes: number }>;
export const SHOT_ANALYSIS_SCHEMA: Record<string, unknown>;
export function shotAnalysisError(message: string, options?: { code?: string; status?: number; operation?: string; projectId?: string; cause?: unknown }): PluginError;
export function analysisChoices(value?: Partial<AnalysisChoices>): AnalysisChoices;
export function parseShotAnalysis(value: unknown, duration: number, hasAudio?: boolean): ShotAnalysis;
export function parseShotAnalysisResult(value: unknown): ShotAnalysisResult;
export function shotAnalysisPrompt(source: AnalysisSource, choices?: Partial<AnalysisChoices>): string;
