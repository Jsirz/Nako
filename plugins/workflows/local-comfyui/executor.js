import { LocalComfyClient } from './client.js';
import { createModuleLogger } from '../../../modules/kernel/logger.js';

import {
  cleanupInputs,
  markInputsOrphaned,
  markRecoveryInputsOrphaned,
  retryInputCleanup,
} from './inputCleanup.js';
import { createSnapshotAssetSession } from './inputSnapshot.js';
import { stageInputs } from './inputStaging.js';
import { execute } from './runExecution.js';
import {
  cancelRemote,
  handleRealtimeEvent,
  pauseObservation,
  waitForHistory,
} from './runObservation.js';
import { resume } from './runRecovery.js';

export class LocalComfyExecutor {
  #ports;
  constructor({
    definitionStore,
    configurationStore,
    deploymentService,
    assetResolver,
    runStore,
    coordinator,
    directoryGrantStore = null,
    libraryDirectory,
    clientFactory = (options) => new LocalComfyClient(options),
    wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    now = () => Date.now(),
    logger = createModuleLogger('workflow.local-comfyui'),
  }) {
    const ports = {
      definitionStore,
      configurationStore,
      deploymentService,
      assetResolver,
      runStore,
      coordinator,
      directoryGrantStore,
      libraryDirectory,
      clientFactory,
      wait,
      now,
      logger,
    };
    Object.assign(ports, {
      createSnapshotAssetSession: (...args) => createSnapshotAssetSession(ports, ...args),
      stageInputs: (...args) => stageInputs(ports, ...args),
      cleanupInputs: (...args) => cleanupInputs(ports, ...args),
      markInputsOrphaned: (...args) => markInputsOrphaned(ports, ...args),
      markRecoveryInputsOrphaned: (...args) => markRecoveryInputsOrphaned(ports, ...args),
      handleRealtimeEvent: (...args) => handleRealtimeEvent(ports, ...args),
      retryInputCleanup: (...args) => retryInputCleanup(ports, ...args),
      waitForHistory: (...args) => waitForHistory(ports, ...args),
      pauseObservation: (...args) => pauseObservation(ports, ...args),
      cancelRemote: (...args) => cancelRemote(ports, ...args),
      resume: (...args) => resume(ports, ...args),
      execute: (...args) => execute(ports, ...args),
    });
    this.#ports = ports;
  }
  execute(input) {
    return this.#ports.execute(input);
  }
  resume(input) {
    return this.#ports.resume(input);
  }
  retryInputCleanup(input) {
    return this.#ports.retryInputCleanup(input);
  }
  markInputsOrphaned(input) {
    return this.#ports.markInputsOrphaned(input);
  }
  cleanupInputs(input) {
    return this.#ports.cleanupInputs(input);
  }
}
