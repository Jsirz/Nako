import type { Project } from './index.js';
import type { ShowcaseVideoContentType } from './showcaseVideo.js';

export interface ProjectArchiveEntry { path: string; type: string; size: number }
export interface ProjectArchiveRequest extends AsyncIterable<Uint8Array> {
  headers: { 'content-length'?: string };
}
export interface ProjectFileCopyOptions {
  recursive?: boolean;
  force?: boolean;
  errorOnExist?: boolean;
  filter?(source: string, target: string): boolean;
}
export interface ProjectArchiveCreateOptions {
  cwd: string;
  file: string;
  gzip: boolean;
  portable: boolean;
}
export interface ProjectArchiveExtractOptions {
  cwd: string;
  file: string;
  preservePaths: boolean;
  strict: boolean;
  filter(path: string, entry: ProjectArchiveEntry): boolean;
}
export interface ProjectArchiveValidation {
  isAllowedEntry(path: string): boolean;
  requiredEntries: string[];
  label: string;
}
/** A platform adapter owns all archive and snapshot filesystem operations. */
export interface ProjectFileStore {
  exists(filename: string): boolean;
  ensureDirectory(directory: string): void;
  createTemporaryDirectory(prefix: string, parentDirectory?: string): Promise<string>;
  mkdir(directory: string, options: { recursive: boolean }): Promise<string | undefined>;
  copy(source: string, target: string, options: ProjectFileCopyOptions): Promise<void>;
  move(source: string, target: string): Promise<void>;
  remove(filename: string, options: { recursive?: boolean; force: boolean }): Promise<void>;
  readText(filename: string): Promise<string>;
  writeText(filename: string, text: string): Promise<void>;
  size(filename: string): Promise<number>;
  readable(filename: string): Promise<void>;
  createArchive(options: ProjectArchiveCreateOptions, entries: string[]): Promise<void>;
  extractArchive(options: ProjectArchiveExtractOptions): Promise<void>;
  copyNewTree(source: string, target: string, createdPaths: string[]): Promise<void>;
  removeCreatedPaths(paths: string[]): Promise<void>;
  receiveArchive(request: ProjectArchiveRequest, archivePath: string, limit: number): Promise<void>;
  downloadArchive(url: string, archivePath: string, limit: number): Promise<void>;
  downloadVideo(url: string, filename: string, limit: number): Promise<ShowcaseVideoContentType>;
  statLocalArchive(value: unknown, limit: number): Promise<string>;
  validateArchive(archivePath: string, limit: number, options: ProjectArchiveValidation): Promise<void>;
  writeSnapshot(filename: string, project: Project): string;
}
