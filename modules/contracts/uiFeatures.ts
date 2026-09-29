/** Presentation switches only; never use these to disable backend plugins or erase data. */
export const UI_FEATURES: Readonly<{ runningHub: boolean }> = Object.freeze({
  runningHub: false,
});

export function isGenerationSourceVisible(source?: string) {
  return UI_FEATURES.runningHub || !['runninghub', 'runninghub_global'].includes(source || '');
}
