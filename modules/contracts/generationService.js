/** Only these coordination methods may cross the generation module boundary. */
export const GENERATION_COORDINATION_METHODS = Object.freeze([
  'begin', 'getTask', 'isActive', 'getConcurrency', 'adopt', 'reacquireObservation',
  'update', 'heartbeat', 'complete', 'completeIfActive', 'fail', 'cancel',
  'requestCancel', 'finalizeCancel', 'finalizeUnknown', 'reconcileRemoteTask',
  'recordRemoteTask', 'pauseObservation',
]);
