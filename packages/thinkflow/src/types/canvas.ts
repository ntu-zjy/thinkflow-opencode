import type { Node, Edge } from "@xyflow/react"

export type NodeStatus = "idle" | "running" | "done" | "error"

export type InputType = "text" | "file" | "url" | "memory" | "feed"

export interface InputNodeData extends Record<string, unknown> {
  label: string
  inputType: InputType
  value: string
  fileInfo?: { name: string; path: string; mimeType: string }
  feedConfig?: { source: string; url: string }
  memoryRef?: string
}

export interface AgentNodeData extends Record<string, unknown> {
  label: string
  idea: string
  model: string
  pluginIds: string[]
  status: NodeStatus
  sessionId?: string
  messages?: AgentMessage[]
}

export interface AgentMessage {
  id: string
  role: "user" | "assistant" | "tool"
  content: string
  time: number
}

export interface OutputNodeData extends Record<string, unknown> {
  label: string
  platform: PlatformType
  content: string
  status: NodeStatus
  previewOpen: boolean
}

export type PlatformType = "xiaohongshu" | "zhihu" | "wechat" | "manhua" | "raw"

// v12 node types: Node<Data, NodeType>
export type InputNodeType = Node<InputNodeData, "inputNode">
export type AgentNodeType = Node<AgentNodeData, "agentNode">
export type OutputNodeType = Node<OutputNodeData, "outputNode">

export type ThinkFlowNode = InputNodeType | AgentNodeType | OutputNodeType
export type ThinkFlowEdge = Edge

export interface Canvas {
  id: string
  title: string
  nodes: ThinkFlowNode[]
  edges: ThinkFlowEdge[]
  createdAt: number
  updatedAt: number
}
