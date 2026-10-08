/** Read-only platform capability. No process controllers, installers or credentials escape. */
export interface LocalProviderConfiguration {
  LibTvCliImageProvider: boolean;
  LibTvCliVideoProvider: boolean;
  DreaminaCliImageProvider: boolean;
  DreaminaCliVideoProvider: boolean;
}
export interface LocalRuntimeService {
  providerConfiguration(options?: { waitForFresh?: boolean }): Promise<LocalProviderConfiguration>;
}
