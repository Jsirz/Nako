export interface WorkspacePaths {
  LIBRARY_DIR: string;
  LIBRARY_MEDIA_DIR: string;
  WORKFLOWS_DIR: string;
  LIBRARY_ASSETS_DIR: string;
  FOLDERS_JSON_PATH: string;
}
export interface PlatformPathsService {
  readonly runtime: Readonly<Record<string, string | null>>;
  workspace(): WorkspacePaths;
  publicLibraryPrefix(): string;
}
