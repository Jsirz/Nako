export class AgentSkillError extends Error {
  constructor(message, status = 400, code = 'INVALID_AGENT_SKILL') {
    super(message); this.name = 'AgentSkillError'; this.status = status; this.code = code;
  }
}
