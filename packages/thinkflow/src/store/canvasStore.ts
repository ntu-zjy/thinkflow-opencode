import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { persist } from "zustand/middleware"
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react"
import { v4 as uuid } from "uuid"
import type { Canvas, ThinkFlowNode, ThinkFlowEdge, InputNodeData, AgentNodeData, OutputNodeData, NodeStatus, InputNodeType, AgentNodeType, OutputNodeType } from "@/types/canvas"

interface CanvasState {
  canvases: Canvas[]
  activeCanvasId: string | null
  selectedNodeIds: string[]

  // Canvas management
  createCanvas: (title?: string) => string
  deleteCanvas: (id: string) => void
  setActiveCanvas: (id: string) => void
  renameCanvas: (id: string, title: string) => void

  // Node & edge operations
  onNodesChange: (changes: NodeChange<ThinkFlowNode>[]) => void
  onEdgesChange: (changes: EdgeChange<ThinkFlowEdge>[]) => void
  onConnect: (connection: Connection) => void
  addInputNode: (position?: { x: number; y: number }) => void
  addAgentNode: (position?: { x: number; y: number }) => void
  addOutputNode: (position?: { x: number; y: number }) => void
  deleteNode: (nodeId: string) => void
  updateNodeData: (nodeId: string, data: Partial<ThinkFlowNode["data"]>) => void
  setNodeStatus: (nodeId: string, status: NodeStatus) => void
  setSelectedNodes: (ids: string[]) => void

  // Computed
  activeCanvas: () => Canvas | undefined
  getNode: (nodeId: string) => ThinkFlowNode | undefined
  getConnectedInputs: (agentNodeId: string) => ThinkFlowNode[]
  getConnectedOutputs: (agentNodeId: string) => ThinkFlowNode[]
}

const defaultInputData = (): InputNodeData => ({
  label: "输入",
  inputType: "text",
  value: "",
})

const defaultAgentData = (): AgentNodeData => ({
  label: "Agent",
  idea: "",
  model: "moonshotai/kimi-k2:free",
  pluginIds: [],
  status: "idle",
  messages: [],
})

const defaultOutputData = (): OutputNodeData => ({
  label: "输出",
  platform: "xiaohongshu",
  content: "",
  status: "idle",
  previewOpen: false,
})

function createDefaultCanvas(title = "新画布"): Canvas {
  const agentId = uuid()
  const inputId = uuid()
  const outputId = uuid()
  return {
    id: uuid(),
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [
      {
        id: inputId,
        type: "inputNode" as const,
        position: { x: 80, y: 200 },
        data: defaultInputData(),
      } satisfies InputNodeType,
      {
        id: agentId,
        type: "agentNode" as const,
        position: { x: 440, y: 180 },
        data: defaultAgentData(),
      } satisfies AgentNodeType,
      {
        id: outputId,
        type: "outputNode" as const,
        position: { x: 820, y: 200 },
        data: defaultOutputData(),
      } satisfies OutputNodeType,
    ],
    edges: [
      {
        id: uuid(),
        source: inputId,
        target: agentId,
        type: "smoothstep",
        animated: false,
      },
      {
        id: uuid(),
        source: agentId,
        target: outputId,
        type: "smoothstep",
        animated: false,
      },
    ],
  }
}

export const useCanvasStore = create<CanvasState>()(
  persist(
    immer((set, get) => ({
      canvases: [createDefaultCanvas("欢迎使用 ThinkFlow")],
      activeCanvasId: null,
      selectedNodeIds: [],

      createCanvas(title) {
        const canvas = createDefaultCanvas(title)
        set((s) => {
          s.canvases.push(canvas)
          s.activeCanvasId = canvas.id
        })
        return canvas.id
      },

      deleteCanvas(id) {
        set((s) => {
          s.canvases = s.canvases.filter((c) => c.id !== id)
          if (s.activeCanvasId === id) {
            s.activeCanvasId = s.canvases[0]?.id ?? null
          }
        })
      },

      setActiveCanvas(id) {
        set((s) => {
          s.activeCanvasId = id
        })
      },

      renameCanvas(id, title) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === id)
          if (c) { c.title = title; c.updatedAt = Date.now() }
        })
      },

      onNodesChange(changes) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (c) c.nodes = applyNodeChanges(changes, c.nodes) as ThinkFlowNode[]
        })
      },

      onEdgesChange(changes) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (c) c.edges = applyEdgeChanges(changes, c.edges) as ThinkFlowEdge[]
        })
      },

      onConnect(connection) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          // Prevent output→agent backward connections
          const sourceNode = c.nodes.find((n) => n.id === connection.source)
          const targetNode = c.nodes.find((n) => n.id === connection.target)
          if (sourceNode?.type === "outputNode" && targetNode?.type === "agentNode") return
          if (sourceNode?.type === "outputNode" && targetNode?.type === "inputNode") return
          c.edges = addEdge(
            { ...connection, type: "smoothstep", animated: false },
            c.edges,
          ) as ThinkFlowEdge[]
          c.updatedAt = Date.now()
        })
      },

      addInputNode(position = { x: 80, y: 200 }) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          c.nodes.push({ id: uuid(), type: "inputNode" as const, position, data: defaultInputData() } satisfies InputNodeType)
          c.updatedAt = Date.now()
        })
      },

      addAgentNode(position = { x: 440, y: 200 }) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          c.nodes.push({ id: uuid(), type: "agentNode" as const, position, data: defaultAgentData() } satisfies AgentNodeType)
          c.updatedAt = Date.now()
        })
      },

      addOutputNode(position = { x: 820, y: 200 }) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          c.nodes.push({ id: uuid(), type: "outputNode" as const, position, data: defaultOutputData() } satisfies OutputNodeType)
          c.updatedAt = Date.now()
        })
      },

      deleteNode(nodeId) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          c.nodes = c.nodes.filter((n) => n.id !== nodeId)
          c.edges = c.edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
          c.updatedAt = Date.now()
        })
      },

      updateNodeData(nodeId, data) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          const node = c.nodes.find((n) => n.id === nodeId)
          if (node) {
            Object.assign(node.data, data)
            c.updatedAt = Date.now()
          }
        })
      },

      setNodeStatus(nodeId, status) {
        set((s) => {
          const c = s.canvases.find((c) => c.id === s.activeCanvasId)
          if (!c) return
          const node = c.nodes.find((n) => n.id === nodeId)
          if (node && "status" in node.data) {
            (node.data as AgentNodeData | OutputNodeData).status = status
          }
        })
      },

      setSelectedNodes(ids) {
        set((s) => { s.selectedNodeIds = ids })
      },

      activeCanvas() {
        const s = get()
        const id = s.activeCanvasId ?? s.canvases[0]?.id
        return s.canvases.find((c) => c.id === id)
      },

      getNode(nodeId) {
        return get().activeCanvas()?.nodes.find((n) => n.id === nodeId)
      },

      getConnectedInputs(agentNodeId) {
        const canvas = get().activeCanvas()
        if (!canvas) return []
        const inputEdges = canvas.edges.filter((e) => e.target === agentNodeId)
        return canvas.nodes.filter(
          (n) => n.type === "inputNode" && inputEdges.some((e) => e.source === n.id),
        )
      },

      getConnectedOutputs(agentNodeId) {
        const canvas = get().activeCanvas()
        if (!canvas) return []
        const outputEdges = canvas.edges.filter((e) => e.source === agentNodeId)
        return canvas.nodes.filter(
          (n) => n.type === "outputNode" && outputEdges.some((e) => e.target === n.id),
        )
      },
    })),
    {
      name: "thinkflow-canvases",
      partialize: (state) => ({ canvases: state.canvases, activeCanvasId: state.activeCanvasId }),
    },
  ),
)
