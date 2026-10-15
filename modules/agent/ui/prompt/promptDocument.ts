import { parsePromptTags, type PromptPresetType } from './promptPresets';

import { promptAssetIndex, promptAssetLabel } from '../../../contracts/promptAssets';
import type { PromptAsset, PromptDocumentNode } from '../../../contracts/promptAssets';
export * from '../../../contracts/promptAssets';

/** Build document nodes directly. User text and URLs are never interpolated into HTML attributes. */
export function promptToDocument(
  value: string,
  assets: readonly PromptAsset[],
): PromptDocumentNode {
  const index = promptAssetIndex(assets),
    paragraphs: PromptDocumentNode[] = [{ type: 'paragraph', content: [] }];
  const append = (node: PromptDocumentNode) =>
    paragraphs[paragraphs.length - 1].content!.push(node);
  const text = (value: string) => {
    if (value) append({ type: 'text', text: value });
  };
  const appendText = (value: string) => {
    let cursor = 0;
    for (const match of value.matchAll(/\{(image|video|text|audio)(\d+)\}|\n/g)) {
      const at = match.index ?? 0;
      text(value.slice(cursor, at));
      cursor = at + match[0].length;
      if (match[0] === '\n') {
        paragraphs.push({ type: 'paragraph', content: [] });
        continue;
      }
      const number = Number(match[2]),
        asset = number > 0 ? index.byType[match[1] as PromptPresetType][number - 1] : undefined;
      if (!asset) {
        text(match[0]);
        continue;
      }
      const position = index.byId.get(asset.id)!;
      append({
        type: 'mention',
        attrs: {
          id: asset.id,
          label: promptAssetLabel(position.type, position.number),
          assetType: position.type,
          url: asset.url || '',
        },
      });
    }
    text(value.slice(cursor));
  };
  let cursor = 0;
  for (const tag of parsePromptTags(value)) {
    appendText(value.slice(cursor, tag.start));
    append({ type: 'promptTag', attrs: { label: tag.label, prompt: tag.prompt } });
    cursor = tag.end;
  }
  appendText(value.slice(cursor));
  return { type: 'doc', content: paragraphs };
}

export function documentToPrompt(
  document: PromptDocumentNode,
  assets: readonly PromptAsset[],
): string {
  const index = promptAssetIndex(assets);
  const read = (node: PromptDocumentNode): string => {
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'mention') {
      const found = index.byId.get(String(node.attrs?.id || ''));
      return found ? `{${found.type}${found.number}}` : String(node.attrs?.label || '');
    }
    if (node.type === 'promptTag')
      return `[[${String(node.attrs?.label || '')}|${String(node.attrs?.prompt || '')}]]`;
    return (node.content || []).map(read).join(node.type === 'doc' ? '\n' : '');
  };
  return read(document);
}
