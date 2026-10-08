'use strict';

const CONTROLLER_ERRORS = Object.freeze({
  processId: 'CONTROLLER_PROCESS_ID_INVALID',
  interval: 'CONTROLLER_GUARD_INTERVAL_INVALID',
});

class ControllerGuardError extends Error {
  constructor(code, operation) {
    super(code);
    this.name = 'ControllerGuardError';
    this.code = code;
    this.context = Object.freeze({ moduleId: 'local-runtime', operation });
  }
}

module.exports = { CONTROLLER_ERRORS, ControllerGuardError };
