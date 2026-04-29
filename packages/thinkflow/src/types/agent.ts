export interface AgentPlugin {
  id: string
  name: string
  description: string
  icon?: string
  enabled: boolean
}

export interface AgentConfig {
  model: string
  plugins: AgentPlugin[]
  temperature?: number
  maxTokens?: number
}

export interface RunContext {
  canvasId: string
  agentNodeId: string
  inputs: RunInput[]
  idea: string
  config: AgentConfig
}

export interface RunInput {
  nodeId: string
  type: string
  value: string
}
