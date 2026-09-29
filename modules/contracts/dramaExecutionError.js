export class DramaExecutionError extends Error {
  constructor(message, code = 'DRAMA_EXECUTION_INVALID', status = 409) {
    super(message);
    this.name = 'DramaExecutionError';
    this.code = code;
    this.status = status;
  }
}
