export class DirectoryGrantError extends Error {
  constructor(message, code = 'DIRECTORY_GRANT_ERROR', status = 400) {
    super(message);
    this.name = 'DirectoryGrantError';
    this.code = code;
    this.status = status;
  }
}

