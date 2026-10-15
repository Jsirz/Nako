/** Read-only platform capability. No process controllers, installers or credentials escape. */
export interface LocalProviderConfiguration {
  LibTvCliImageProvider: boolean;
  LibTvCliVideoProvider: boolean;
  DreaminaCliImageProvider: boolean;
  DreaminaCliVideoProvider: boolean;
}
export interface DirectoryPickerService {
  selectDirectory(options?: { description?: string }): Promise<string>;
}
export interface LocalRuntimeService extends DirectoryPickerService {
  providerConfiguration(options?: { waitForFresh?: boolean }): Promise<LocalProviderConfiguration>;
}
