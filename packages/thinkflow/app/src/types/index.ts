import type { Node, Edge } from "@xyflow/react"

// ─── 输入节点 ───────────────────────────────────────────────────────────────

export type InputType = "text" | "url" | "file" | "memory" | "feed"

export type McpTool = "fetch" | "github"

export interface InputNodeData extends Record<string, unknown> {
  inputType: InputType
  value: string
  label: string
  mcpTool?: McpTool
  memoryEntryId?: string
  fileConverted?: boolean
}

// ─── Agent 节点 ─────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "done" | "error"

export interface AgentLog {
  id: string
  timestamp: number
  text: string
  type: "info" | "tool" | "output" | "error"
}

export interface MatrixSlot {
  id: string
  folderId: string           // 选择的记忆分类，"custom" 表示自定义
  memoryEntryId?: string
  customPersona?: string
}

export interface AgentNodeData extends Record<string, unknown> {
  idea: string
  model: string
  status: AgentStatus
  logs: AgentLog[]
  sessionId?: string
  dryRun: boolean
  scheduleEnabled: boolean
  scheduleTime: string       // "HH:MM"，每天固定时间执行
  matrixMode: boolean
  matrixSlots: MatrixSlot[]
}

// ─── 输出节点 ────────────────────────────────────────────────────────────────

export type OutputPlatform = "zhihu" | "wechat" | "diary" | "note" | "xiaohongshu" | "video"

export type ContentFormat = "text" | "image_text" | "auto"

// ─── 视频脚本 ─────────────────────────────────────────────────────────────────

export interface VideoSlide {
  title: string
  voiceover: string
  background: string
  duration?: number
}

export interface VideoScript {
  title: string
  slides: VideoSlide[]
}

export interface ImageAsset {
  id: string
  url: string
  title?: string
  generatedAt?: number
}

export interface MatrixResult {
  slotIndex: number
  personaLabel: string
  content: string
  images?: ImageAsset[]
  contentType?: "text" | "image"
}

export interface OutputNodeData extends Record<string, unknown> {
  platform: OutputPlatform
  content: string
  label: string
  images?: ImageAsset[]
  contentType?: "text" | "image"
  contentFormat?: ContentFormat
  matrixResults?: MatrixResult[]   // 矩阵模式下各人设的输出结果
}

// ─── 节点联合类型 ─────────────────────────────────────────────────────────────

export type InputNodeType = Node<InputNodeData, "input">
export type AgentNodeType = Node<AgentNodeData, "agent">
export type OutputNodeType = Node<OutputNodeData, "output">
export type FlowNode = InputNodeType | AgentNodeType | OutputNodeType
export type FlowEdge = Edge

// ─── 记忆库 ──────────────────────────────────────────────────────────────────

export type MemoryFolderType = "persona" | "material" | "preference" | "output" | "other" | string

export interface MemoryFolder {
  id: string
  type: MemoryFolderType
  name: string
  createdAt: number
  isDefault?: boolean
}

export interface MemoryEntry {
  id: string
  folderId: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

// ─── OpenCode 事件 ────────────────────────────────────────────────────────────

export interface OpenCodeEvent {
  directory: string
  payload: {
    type: string
    properties: Record<string, unknown>
  }
}

// message.part.updated: properties.part 是 Part 对象，delta 是文本增量
export interface MessagePartUpdatedEvent {
  directory: string
  payload: {
    type: "message.part.updated"
    properties: {
      part: {
        id: string
        sessionID: string
        messageID: string
        type: string
        text?: string
        state?: Record<string, unknown>
      }
      delta?: string
    }
  }
}

// session.idle: 当前 session 空闲（生成完毕）
export interface SessionIdleEvent {
  directory: string
  payload: {
    type: "session.idle"
    properties: {
      sessionID: string
    }
  }
}

export interface SessionErrorEvent {
  directory: string
  payload: {
    type: "session.error"
    properties: {
      sessionID: string
      error: string
    }
  }
}
