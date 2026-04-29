import type { Node, Edge } from "@xyflow/react"

// ── Input Node ──────────────────────────────────────────────────────────────

export type InputType = "text" | "url" | "file" | "memory" | "feed"

export type InputNodeData = {
  inputType: InputType
  value: string
  label?: string
  memoryId?: string
  mcpTool?: "fetch" | "github"
}

export type InputNodeType = Node<InputNodeData, "input">

// ── Agent Node ───────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "done" | "error"

export type AgentNodeData = {
  idea: string
  model: string
  status: AgentStatus
  sessionId?: string
  logs: LogEntry[]
}

export type AgentNodeType = Node<AgentNodeData, "agent">

export type LogEntry = {
  id: string
  text: string
  role: "user" | "assistant" | "system"
  timestamp: number
}

// ── Output Node ───────────────────────────────────────────────────────────────

export type OutputPlatform = "zhihu" | "wechat" | "diary"

export type OutputNodeData = {
  platform: OutputPlatform
  content: string
  label?: string
}

export type OutputNodeType = Node<OutputNodeData, "output">

// ── Canvas ────────────────────────────────────────────────────────────────────

export type ThinkFlowNode = InputNodeType | AgentNodeType | OutputNodeType

export type ThinkFlowEdge = Edge

// ── Memory ────────────────────────────────────────────────────────────────────

export type MemoryFolderType = "persona" | "material" | "preference" | "output"

export type MemoryFolder = {
  id: string
  type: MemoryFolderType
  name: string
}

export type MemoryEntry = {
  id: string
  folderId: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

// ── Canvas Store ──────────────────────────────────────────────────────────────

export type WorkflowRunPayload = {
  agentNodeId: string
  inputs: { nodeId: string; type: InputType; value: string }[]
  idea: string
  model: string
  outputNodeIds: string[]
}
