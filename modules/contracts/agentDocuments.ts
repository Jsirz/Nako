export interface AgentDocument { id: string; name: string; text: string }

export interface AgentDocumentService {
  read(file: File, signal: AbortSignal, options?: { preserveWhitespace?: boolean }): Promise<AgentDocument>;
}
