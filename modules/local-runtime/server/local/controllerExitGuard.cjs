'use strict';

const { CONTROLLER_ERRORS, ControllerGuardError } = require('../../../contracts/controllerGuardErrors.cjs');

const DEFAULT_INTERVAL_MILLISECONDS = 1000;

function requireControllerProcessId(value) {
  if (typeof value === 'string' && !/^[1-9][0-9]*$/u.test(value)) {
    throw new ControllerGuardError(CONTROLLER_ERRORS.processId, 'requireControllerProcessId');
  }
  const processId = Number(value);
  if (!Number.isSafeInteger(processId) || processId <= 0) {
    throw new ControllerGuardError(CONTROLLER_ERRORS.processId, 'requireControllerProcessId');
  }
  return processId;
}

function parseControllerProcessId(environment = process.env) {
  const value = String(environment.NAKO_CONTROLLER_PID || '').trim();
  return value ? requireControllerProcessId(value) : null;
}

function isProcessAlive(processId, signalProcess = process.kill) {
  try {
    signalProcess(processId, 0);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return false;
    if (error?.code === 'EPERM') return true;
    throw error;
  }
}

function startControllerExitGuard({
  environment = process.env,
  controllerProcessId = parseControllerProcessId(environment),
  intervalMilliseconds = DEFAULT_INTERVAL_MILLISECONDS,
  isProcessAlive: inspectProcess = isProcessAlive,
  onControllerExit = () => {
    if (!process.emit('SIGTERM')) process.exit(0);
  },
} = {}) {
  if (controllerProcessId === null) return null;
  const ownedProcessId = requireControllerProcessId(controllerProcessId);
  if (!Number.isSafeInteger(intervalMilliseconds) || intervalMilliseconds <= 0) {
    throw new ControllerGuardError(CONTROLLER_ERRORS.interval, 'startControllerExitGuard');
  }

  let stopped = false;
  const timer = setInterval(() => {
    if (stopped) return;
    let alive;
    try {
      alive = inspectProcess(ownedProcessId);
    } catch {
      return;
    }
    if (alive) return;
    stopped = true;
    clearInterval(timer);
    onControllerExit();
  }, intervalMilliseconds);
  timer.unref?.();

  return () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
  };
}

module.exports = {
  isProcessAlive,
  parseControllerProcessId,
  startControllerExitGuard,
};
