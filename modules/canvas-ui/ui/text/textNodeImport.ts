import { canvasError } from '../../../contracts/canvasErrors.js';
import { agentDocumentAccept, isAgentDocument } from '../../../contracts/shared/agentDocumentFormats.js';
import { readAgentDocument } from '../../../agent/api/ui/agent/agentDocuments';

export const TEXT_NODE_FILE_ACCEPT = agentDocumentAccept;

/** Extract complete text with the existing local parser. DOCX layout, embedded
 * objects and links are not imported; no model, saved file or source path is needed. */
export async function readTextNodeFile(
  file: File,
  signal: AbortSignal,
): Promise<{ name: string; text: string }> {
  if (signal.aborted) throw new DOMException('已取消', 'AbortError');
  if (!isAgentDocument(file.name)) {
    throw canvasError('支持 DOCX、TXT、Markdown、CSV、TSV、JSON、YAML、XML、LOG、SRT 和 VTT。旧版 DOC 请另存为 DOCX。', 'text-import.file-format');
  }
  if (!file.name.trim() || file.name.length > 160 || /[\\/\0\r\n]/.test(file.name)) {
    throw canvasError('文件名无效，请选择本机文档文件。', 'text-import.file-name');
  }
  if (!file.size) throw canvasError('文件为空，请选择有正文的文档。', 'text-import.empty-file');
  const document = await readAgentDocument(file, signal, { preserveWhitespace: true });
  if (signal.aborted) throw new DOMException('已取消', 'AbortError');
  if (!document.text.trim()) throw canvasError('文档中没有可导入的正文。', 'text-import.empty-document');
  return { name: document.name, text: document.text };
}
