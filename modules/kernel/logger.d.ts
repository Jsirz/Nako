import type { Logger } from '../contracts/index.js';
export function createModuleLogger(moduleId: string, output?: Pick<Console, 'info' | 'warn' | 'error'>): Logger;
