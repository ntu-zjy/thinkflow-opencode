import { create } from "zustand"
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react"
import type { NodeChange, EdgeChange, Connection } from "@xyflow/react"
import { nanoid } from "nanoid"
import { opencodeClient } from "../services/opencodeClient"
import type {
  ThinkFlowNode,
  ThinkFlowEdge,
  InputNodeData,
  AgentNodeData,
  OutputNodeData,
  AgentNodeType,
  InputNodeType,
  OutputNodeType,
  LogEntry,
} from "../types"

type CanvasState = {
  nodes: ThinkFlowNode[]
  edges: ThinkFlowEdge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setNodes: (nodes: ThinkFlowNode[]) => void
  setEdges: (edges: ThinkFlowEdge[]) => void
  addNode: (type: "input" | "agent" | "output", position: { x: number; y: number }) => void
  updateNodeData: (id: string, patch: Partial<InputNodeData | AgentNodeData | OutputNodeData>) => void
  runWorkflow: (agentNodeId: string) => Promise<void>
  abortWorkflow: (agentNodeId: string) => void
}

const DEFAULT_INPUT_DATA: InputNodeData = { inputType: "text", value: "", label: "输入" }
const DEFAULT_AGENT_DATA: AgentNodeData = { idea: "", model: "moonshotai/kimi-k2.6", status: "idle", logs: [] }
const DEFAULT_OUTPUT_DATA: OutputNodeData = { platform: "zhihu", content: "", label: "输出" }

const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) as ThinkFlowNode[] }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge({ ...connection, animated: true }, get().edges) }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (type, position) => {
    const id = nanoid()
    const base = { id, position, selected: false }

    const node: ThinkFlowNode =
      type === "input"
        ? ({ ...base, type: "input", data: { ...DEFAULT_INPUT_DATA } } as InputNodeType)
        : type === "agent"
        ? ({ ...base, type: "agent", data: { ...DEFAULT_AGENT_DATA, logs: [] } } as AgentNodeType)
        : ({ ...base, type: "output", data: { ...DEFAULT_OUTPUT_DATA } } as OutputNodeType)

    set({ nodes: [...get().nodes, node] })
  },

  updateNodeData: (id, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, ...patch } } as ThinkFlowNode) : n
      ),
    })
  },

  runWorkflow: async (agentNodeId) => {
    const { nodes, edges, updateNodeData } = get()

    const agentNode = nodes.find((n) => n.id === agentNodeId && n.type === "agent") as
      | AgentNodeType
      | undefined
    if (!agentNode) return

    // Collect upstream InputNodes
    const inputNodeIds = edges
      .filter((e) => e.target === agentNodeId)
      .map((e) => e.source)

    const inputNodes = nodes.filter(
      (n): n is InputNodeType => n.type === "input" && inputNodeIds.includes(n.id)
    )

    // Build prompt
    const inputLines = inputNodes
      .map((n) => `[${n.data.inputType}] ${n.data.value}`)
      .join("\n")
    const fullPrompt = [inputLines, agentNode.data.idea].filter(Boolean).join("\n\n---\n\n")

    // Find downstream OutputNodes
    const outputNodeIds = edges
      .filter((e) => e.source === agentNodeId)
      .map((e) => e.target)

    const addLog = (text: string, role: LogEntry["role"] = "assistant") => {
      const entry: LogEntry = { id: nanoid(), text, role, timestamp: Date.now() }
      const current = get().nodes.find((n) => n.id === agentNodeId) as AgentNodeType | undefined
      if (!current) return
      updateNodeData(agentNodeId, { logs: [...current.data.logs, entry] })
    }

    // Mark as running
    updateNodeData(agentNodeId, { status: "running", logs: [] })
    addLog(fullPrompt, "user")

    let sessionId: string
    try {
      sessionId = await opencodeClient.createSession()
    } catch (err) {
      updateNodeData(agentNodeId, { status: "error" })
      addLog(String(err), "system")
      return
    }

    updateNodeData(agentNodeId, { sessionId })

    let accumulated = ""

    const unsub = opencodeClient.subscribeEvents({
      onMessagePartUpdated: (sid, text, delta) => {
        if (sid !== sessionId && sid !== "") return
        accumulated = text
        addLog(delta ?? text, "assistant")
      },
      onSessionStatus: (sid, status) => {
        if (sid !== sessionId && sid !== "") return
        if (status === "idle") {
          unsub()
          updateNodeData(agentNodeId, { status: "done" })
          // Write to downstream output nodes
          outputNodeIds.forEach((oid) => {
            updateNodeData(oid, { content: accumulated })
          })
        }
      },
      onSessionError: (sid, error) => {
        if (sid !== sessionId && sid !== "") return
        unsub()
        updateNodeData(agentNodeId, { status: "error" })
        addLog(error, "system")
      },
    })

    try {
      await opencodeClient.sendPrompt(sessionId, fullPrompt)
    } catch (err) {
      unsub()
      updateNodeData(agentNodeId, { status: "error" })
      addLog(String(err), "system")
    }
  },

  abortWorkflow: (agentNodeId) => {
    const { nodes, updateNodeData } = get()
    const agentNode = nodes.find((n) => n.id === agentNodeId && n.type === "agent") as
      | AgentNodeType
      | undefined
    if (!agentNode) return

    if (agentNode.data.sessionId) {
      opencodeClient.abortSession(agentNode.data.sessionId).catch(() => null)
    }
    updateNodeData(agentNodeId, { status: "idle" })
  },
}))

export default useCanvasStore
