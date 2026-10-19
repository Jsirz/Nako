import type { ShotAnalysis, ShotAnalysisResult, AnalysisSource } from './shotAnalysis.js';
export interface ReplicaAsset { id: string; kind: 'character' | 'scene' | 'element'; name: string; description: string; shotIds: string[] }
export interface VideoReplicaAnalysis extends ShotAnalysis { assets: ReplicaAsset[] }
export interface VideoReplicaResult extends ShotAnalysisResult { assets: ReplicaAsset[] }
export interface ReplicaReplacement { url?: string; description: string }
export interface VideoReplicaSettings { requirements?: string; aspectRatio?: string; resolution?: string; replacements?: Record<string, ReplicaReplacement> }
export interface ReplicaPlanShot { shotId: string; prompt: string; duration: number; referenceUrl: string; images: Array<{ assetId: string; name: string; url: string }> }
export interface VideoReplicaPlan extends Required<VideoReplicaSettings> { id: string; resultId: string; inputKey: string; shots: ReplicaPlanShot[] }
export interface VideoReplicaInsertion { projectId: string; nodeId: string; resultId: string; planId: string; documentEpoch: number; generate: boolean }
export const VIDEO_REPLICA_MODEL: string;
export const VIDEO_REPLICA_RATIOS: readonly string[];
export const VIDEO_REPLICA_RESOLUTIONS: readonly string[];
export const VIDEO_REPLICA_DURATION: Readonly<{ min: number; max: number }>;
export const VIDEO_REPLICA_SCHEMA: Record<string, unknown>;
export function parseVideoReplicaAnalysis(value: unknown, duration: number, hasAudio?: boolean): VideoReplicaAnalysis;
export function parseVideoReplicaResult(value: unknown): VideoReplicaResult;
export function videoReplicaPrompt(source: AnalysisSource): string;
export function replicaMediaUrl(url: string, projectId: string, kind: 'image' | 'video'): string;
export function replicaSettings(result: VideoReplicaResult, settings?: VideoReplicaSettings): Required<VideoReplicaSettings>;
export function createVideoReplicaPlan(result: VideoReplicaResult, settings: VideoReplicaSettings, planId: string): VideoReplicaPlan;
export function validateVideoReplicaPlan(plan: unknown, result: VideoReplicaResult, settings: VideoReplicaSettings, projectId: string, draft?: boolean): VideoReplicaPlan;
