export interface AgentCardReference {
  kind: 'generation' | 'project' | 'product' | 'budget' | 'node';
  id: string;
}
export interface AgentActivity {
  id: string;
  name: string;
  action?: string;
  status: string;
  cards: AgentCardReference[];
}
export function agentActivity(input: {
  id: string;
  name: string;
  action?: string;
  status: string;
  result?: unknown;
}): AgentActivity;
