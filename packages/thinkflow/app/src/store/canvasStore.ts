import { create } from "zustand"
import { addEdge, applyNodeChanges, applyEdgeChanges } from "@xyflow/react"
import type {
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react"
import { nanoid } from "nanoid"
import type {
  FlowNode,
  FlowEdge,
  InputNodeType,
  AgentNodeType,
  OutputNodeType,
  InputNodeData,
  AgentNodeData,
  OutputNodeData,
  AgentLog,
} from "../types"
import {
  createSession,
  sendPrompt,
  abortSession,
  subscribeEvents,
  isServerAvailable,
  runMockWorkflow,
} from "../services/opencodeClient"

// ─── 初始示例节点（扇形布局） ───────────────────────────────────────────────

const initialInput: InputNodeType = {
  id: "input-1",
  type: "input",
  position: { x: 80, y: 200 },
  data: { inputType: "text", value: "", label: "输入" },
}

const initialAgent: AgentNodeType = {
  id: "agent-1",
  type: "agent",
  position: { x: 420, y: 200 },
  data: { idea: "", model: "moonshotai/kimi-k2.6", status: "idle", logs: [], dryRun: false },
}

const initialOutput1: OutputNodeType = {
  id: "output-1",
  type: "output",
  position: { x: 760, y: 80 },
  data: { platform: "zhihu", content: "", label: "输出" },
}

const initialOutput2: OutputNodeType = {
  id: "output-2",
  type: "output",
  position: { x: 760, y: 280 },
  data: { platform: "wechat", content: "", label: "输出" },
}

const initialOutput3: OutputNodeType = {
  id: "output-3",
  type: "output",
  position: { x: 760, y: 480 },
  data: { platform: "diary", content: "", label: "输出" },
}

const initialEdges: FlowEdge[] = [
  { id: "e-input1-agent1", source: "input-1", target: "agent-1", animated: false },
  { id: "e-agent1-output1", source: "agent-1", target: "output-1", animated: false },
  { id: "e-agent1-output2", source: "agent-1", target: "output-2", animated: false },
  { id: "e-agent1-output3", source: "agent-1", target: "output-3", animated: false },
]

// ─── Store 接口 ───────────────────────────────────────────────────────────────

interface CanvasStore {
  nodes: FlowNode[]
  edges: FlowEdge[]
  onNodesChange: OnNodesChange<FlowNode>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  addNode: (type: "input" | "agent" | "output", position?: { x: number; y: number }) => void
  removeNode: (id: string) => void
  updateNodeData: <T extends Record<string, unknown>>(id: string, data: Partial<T>) => void
  runWorkflow: (agentNodeId: string) => Promise<void>
  abortWorkflow: (agentNodeId: string) => void
  _unsubscribe?: () => void
  _sessionIds: string[]
}

// ─── Store 实现 ───────────────────────────────────────────────────────────────

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [initialInput, initialAgent, initialOutput1, initialOutput2, initialOutput3] as FlowNode[],
  edges: initialEdges,
  _sessionIds: [],

  onNodesChange: (changes: NodeChange<FlowNode>[]) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes: EdgeChange[]) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection: Connection) =>
    set((s) => ({ edges: addEdge(connection, s.edges) })),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  addNode: (type, position) => {
    const id = `${type}-${nanoid(6)}`
    const pos = position ?? {
      x: 100 + Math.random() * 300,
      y: 100 + Math.random() * 300,
    }

    const node: FlowNode = (() => {
      if (type === "input") {
        return {
          id,
          type: "input",
          position: pos,
          data: { inputType: "text", value: "", label: "新输入" } satisfies InputNodeData,
        } as InputNodeType
      }
      if (type === "agent") {
        return {
          id,
          type: "agent",
          position: pos,
          data: {
            idea: "",
            model: "moonshotai/kimi-k2.6",
            status: "idle",
            logs: [],
            dryRun: false,
          } satisfies AgentNodeData,
        } as AgentNodeType
      }
      return {
        id,
        type: "output",
        position: pos,
        data: { platform: "zhihu", content: "", label: "新输出" } satisfies OutputNodeData,
      } as OutputNodeType
    })()

    set((s) => ({ nodes: [...s.nodes, node] }))
  },

  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  updateNodeData: (id, data) =>
    set((s): Partial<CanvasStore> => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...(data as Record<string, unknown>) } } : n,
      ) as FlowNode[],
    })),

  runWorkflow: async (agentNodeId) => {
    const { nodes, edges, updateNodeData, _unsubscribe } = get()

    _unsubscribe?.()

    const agentNode = nodes.find((n) => n.id === agentNodeId && n.type === "agent") as
      | AgentNodeType
      | undefined
    if (!agentNode) return

    const inputIds = edges
      .filter((e) => e.target === agentNodeId)
      .map((e) => e.source)

    const inputNodes = nodes.filter((n) => inputIds.includes(n.id) && n.type === "input") as InputNodeType[]

    const outputIds = edges
      .filter((e) => e.source === agentNodeId)
      .map((e) => e.target)

    const outputNodes = nodes.filter((n) => outputIds.includes(n.id) && n.type === "output") as OutputNodeType[]

    const appendLog = (text: string, type: AgentLog["type"] = "info") => {
      updateNodeData<AgentNodeData>(agentNodeId, {
        logs: [
          ...((get().nodes.find((n) => n.id === agentNodeId) as AgentNodeType | undefined)?.data.logs ?? []),
          { id: nanoid(), timestamp: Date.now(), text, type },
        ],
      })
    }

    updateNodeData<AgentNodeData>(agentNodeId, { status: "running", logs: [] })
    outputNodes.forEach((o) => updateNodeData<OutputNodeData>(o.id, { content: "" }))
    // 运行时将相关 edges 设为 animated
    set((s) => ({
      edges: s.edges.map((e) =>
        e.source === agentNodeId || e.target === agentNodeId
          ? { ...e, animated: true }
          : e
      ),
    }))
    set({ _sessionIds: [] })
    appendLog("开始运行工作流...")

    const dryRun = agentNode.data.dryRun

    if (dryRun) {
      appendLog("[dry-run] 模拟运行，不调用模型")
      for (const o of outputNodes) {
        await runMockWorkflow(
          o.data.platform,
          agentNode.data.idea,
          (chunk) => {
            const cur = (get().nodes.find((n) => n.id === o.id) as OutputNodeType | undefined)?.data.content ?? ""
            updateNodeData<OutputNodeData>(o.id, { content: cur + chunk })
          },
          () => {},
        )
      }
      updateNodeData<AgentNodeData>(agentNodeId, { status: "done" })
      appendLog("dry-run 完成")
      return
    }

    const available = await isServerAvailable()

    if (!available) {
      appendLog("OpenCode 服务未启动，切换到演示模式", "info")
      for (const o of outputNodes) {
        await runMockWorkflow(
          o.data.platform,
          agentNode.data.idea,
          (chunk) => {
            const cur = (get().nodes.find((n) => n.id === o.id) as OutputNodeType | undefined)?.data.content ?? ""
            updateNodeData<OutputNodeData>(o.id, { content: cur + chunk })
          },
          () => {},
        )
      }
      updateNodeData<AgentNodeData>(agentNodeId, { status: "done" })
      appendLog("演示完成（真实运行需启动 OpenCode）")
      return
    }

    // ─ 构建基础提示词（输入 + 想法，各输出节点共用） ────────────────────────
    const baseParts = []
    for (const node of inputNodes) {
      const val = node.data.value.trim()
      if (!val) continue

      if (node.data.inputType === "url") {
        baseParts.push({ type: "text" as const, text: `【参考链接】\n${val}\n\n请访问上述链接，读取其内容后作为参考资料。` })
        appendLog(`链接已加入上下文: ${val}`)
      } else {
        const prefix = {
          text: "输入内容",
          file: "文件内容",
          memory: "记忆内容",
          feed: "信息流",
        }[node.data.inputType] ?? "输入内容"
        baseParts.push({ type: "text" as const, text: `【${prefix}】\n${val}` })
      }
    }
    if (agentNode.data.idea.trim()) {
      baseParts.push({ type: "text" as const, text: `【想法/指令】\n${agentNode.data.idea.trim()}` })
    }

    if (!baseParts.length) {
      appendLog("请先填写输入内容", "error")
      updateNodeData<AgentNodeData>(agentNodeId, { status: "idle" })
      return
    }

    const PLATFORM_INSTRUCTION: Record<string, string> = {
      zhihu: "请生成适合知乎平台的长文章，包含标题、引言和正文结构，内容深度且有洞察力。",
      wechat: "请生成适合微信公众号的图文推送，标题吸引人，排版适合移动端阅读，语言亲切。",
      diary: "请以个人口吻生成日记或笔记风格的内容，流水记录，自然真实，不必拘谨。",
    }

    // ─ 每个输出节点独立发起 AI 会话 ─────────────────────────────────────────
    try {
      for (let i = 0; i < outputNodes.length; i++) {
        const outputNode = outputNodes[i]
        const platformInstr = PLATFORM_INSTRUCTION[outputNode.data.platform] ?? PLATFORM_INSTRUCTION.diary
        const parts = [
          ...baseParts,
          { type: "text" as const, text: platformInstr },
        ]

        appendLog(`[${i + 1}/${outputNodes.length}] 创建 ${outputNode.data.platform} 会话...`)
        const sessionId = await createSession()
        set((s) => ({ _sessionIds: [...s._sessionIds, sessionId] }))
        updateNodeData<AgentNodeData>(agentNodeId, { sessionId })

        let outputBuffer = ""

        await new Promise<void>((resolve, reject) => {
          const unsubscribe = subscribeEvents(
            (event) => {
              const { payload } = event
              if (payload.type === "message.part.updated") {
                const props = payload.properties as {
                  part?: { type?: string; sessionID?: string; state?: { status?: string; title?: string } }
                  delta?: string
                }
                const part = props.part
                if (part?.sessionID && part.sessionID !== sessionId) return

                if (part?.type === "text" && props.delta) {
                  outputBuffer += props.delta
                  updateNodeData<OutputNodeData>(outputNode.id, { content: outputBuffer })
                }
                if (part?.type === "tool") {
                  const state = part.state as { status?: string; title?: string } | undefined
                  if (state?.title) appendLog(`工具: ${state.title}`, "tool")
                }
              } else if (payload.type === "session.idle") {
                const props = payload.properties as { sessionID?: string }
                if (props.sessionID && props.sessionID !== sessionId) return
                appendLog(`${outputNode.data.platform} 生成完成`, "info")
                unsubscribe()
                resolve()
              } else if (payload.type === "session.error" || payload.type === "session.failed") {
                const props = payload.properties as { sessionID?: string; error?: string; message?: string }
                if (props.sessionID && props.sessionID !== sessionId) return
                appendLog(`错误: ${props.error ?? props.message ?? "未知错误"}`, "error")
                unsubscribe()
                reject(new Error(props.error ?? props.message ?? "session error"))
              }
            },
            () => {
              appendLog("事件流断开", "error")
              reject(new Error("SSE disconnected"))
            },
          )

          set({ _unsubscribe: unsubscribe })

          appendLog(`发送提示词（${parts.length} 段）...`)
          sendPrompt(sessionId, parts, agentNode.data.model).catch(reject)
        })
      }

      updateNodeData<AgentNodeData>(agentNodeId, { status: "done" })
      appendLog(`全部 ${outputNodes.length} 个输出节点生成完成`)
    } catch (err) {
      appendLog(`运行失败: ${(err as Error).message}`, "error")
      updateNodeData<AgentNodeData>(agentNodeId, { status: "error" })
    } finally {
      // 完成/失败后恢复 edges 静止
      set((s) => ({
        edges: s.edges.map((e) =>
          e.source === agentNodeId || e.target === agentNodeId
            ? { ...e, animated: false }
            : e
        ),
      }))
    }
  },

  abortWorkflow: (agentNodeId) => {
    const { _unsubscribe, _sessionIds, updateNodeData } = get()
    _unsubscribe?.()
    _sessionIds.forEach((sid) => abortSession(sid))
    set({ _sessionIds: [] })
    set((s) => ({
      edges: s.edges.map((e) =>
        e.source === agentNodeId || e.target === agentNodeId
          ? { ...e, animated: false }
          : e
      ),
    }))
    updateNodeData<AgentNodeData>(agentNodeId, { status: "idle" })
  },
}))
