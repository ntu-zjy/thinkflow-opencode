import { create } from "zustand"
import { persist } from "zustand/middleware"
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
  generateImage,
} from "../services/opencodeClient"

// ─── 创作形式 → 平台指令 ────────────────────────────────────────────────────

function getPlatformInstruction(platform: string, contentFormat: string): string {
  const isText = contentFormat === "text"
  const isImageText = contentFormat === "image_text"

  if (platform === "xiaohongshu") {
    if (isText) {
      return "请为小红书平台生成活泼种草风格的文案，含话题标签 #xxx，不需要图片。"
    }
    return `请为小红书平台生成内容，必须严格按以下格式输出：\n\n第一行：[IMG_PROMPT: <详细的英文图片描述，包含风格、色调、主体、构图，约 20 个单词>]\n空一行\n然后是中文正文文案（活泼种草风格，含话题标签 #xxx）\n\n示例：\n[IMG_PROMPT: Fresh pink cherry blossoms, soft bokeh background, morning light, aesthetic minimalist style, vertical composition]\n\n清晨遇见这朵花，治愈了整个春天 🌸\n\n#花卉 #春日 #小确幸`
  }

  const imgFormatNote = isText
    ? "\n\n请只输出文字内容，不需要配图或图片描述。"
    : isImageText
    ? "\n\n请在文案开头输出 [IMG_PROMPT: <详细英文图片描述，包含风格、色调、主体、构图，约 20 个单词>]，换行后输出正文。"
    : ""

  const base: Record<string, string> = {
    zhihu: "请生成适合知乎平台的长文章，包含标题、引言和正文结构，内容深度且有洞察力。",
    wechat: "请生成适合微信公众号的图文推送，标题吸引人，排版适合移动端阅读，语言亲切。",
    diary: "请以个人口吻生成日记或笔记风格的内容，流水记录，自然真实，不必拘谨。",
  }
  return (base[platform] ?? base.diary) + imgFormatNote
}

// ─── 初始示例节点（扇形布局） ───────────────────────────────────────────────

// 坐标以 (0,0) 为中心，fitView 可精确居中
// style.width 告知 ReactFlow 节点真实宽度，确保 fitView 正确计算边界
const initialInput: InputNodeType = {
  id: "input-1",
  type: "input",
  position: { x: -560, y: -160 },
  data: { inputType: "text", value: "", label: "输入" },
  style: { width: 280 },
}

const initialAgent: AgentNodeType = {
  id: "agent-1",
  type: "agent",
  position: { x: -160, y: -160 },
  data: { idea: "", model: "moonshotai/kimi-k2.6", status: "idle", logs: [], dryRun: false },
  style: { width: 300 },
}

const initialOutput1: OutputNodeType = {
  id: "output-1",
  type: "output",
  position: { x: 280, y: -160 },
  data: { platform: "zhihu", content: "", label: "输出", contentFormat: "auto" },
  style: { width: 320 },
}

const initialEdges: FlowEdge[] = [
  { id: "e-input1-agent1", source: "input-1", target: "agent-1", animated: false },
  { id: "e-agent1-output1", source: "agent-1", target: "output-1", animated: false },
]

// ─── 多工作流数据结构 ─────────────────────────────────────────────────────────

interface WorkflowRecord {
  id: string
  name: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  history: Array<{ nodes: FlowNode[]; edges: FlowEdge[] }>
  historyIndex: number
}

function createDefaultWorkflow(name: string): WorkflowRecord {
  return {
    id: nanoid(8),
    name,
    nodes: [initialInput, initialAgent, initialOutput1] as FlowNode[],
    edges: initialEdges,
    history: [],
    historyIndex: -1,
  }
}

// ─── 持久化清理函数 ───────────────────────────────────────────────────────────

function cleanNodeForPersist(n: FlowNode): FlowNode {
  if (n.type === "agent") {
    const d = n.data as AgentNodeData
    return { ...n, data: { ...d, status: "idle" as const, logs: [], sessionId: undefined } }
  }
  if (n.type === "output") {
    const d = n.data as OutputNodeData
    return { ...n, data: { ...d, images: undefined, contentType: undefined } }
  }
  return n
}

function cleanEdgeForPersist(e: FlowEdge): FlowEdge {
  return { ...e, animated: false }
}

// ─── Store 接口 ───────────────────────────────────────────────────────────────

interface CanvasStore {
  nodes: FlowNode[]
  edges: FlowEdge[]
  onNodesChange: OnNodesChange<FlowNode>
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  setNodes: (nodes: FlowNode[]) => void
  setEdges: (edges: FlowEdge[]) => void
  addNode: (type: "input" | "agent" | "output", position?: { x: number; y: number }, initialData?: Record<string, unknown>) => void
  removeNode: (id: string) => void
  updateNodeData: <T extends Record<string, unknown>>(id: string, data: Partial<T>) => void
  runWorkflow: (agentNodeId: string) => Promise<void>
  abortWorkflow: (agentNodeId: string) => void
  _unsubscribe?: () => void
  _sessionIds: string[]
  _history: Array<{ nodes: FlowNode[]; edges: FlowEdge[] }>
  _historyIndex: number
  _pushHistory: () => void
  undo: () => void
  redo: () => void
  // 多工作流
  workflows: Record<string, WorkflowRecord>
  activeWorkflowId: string
  _saveCurrentWorkflow: () => void
  createWorkflow: () => void
  switchWorkflow: (id: string) => void
  closeWorkflow: (id: string) => void
  renameWorkflow: (id: string, name: string) => void
}

// ─── Store 实现 ───────────────────────────────────────────────────────────────

const defaultWf = createDefaultWorkflow("画布 1")

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
  nodes: defaultWf.nodes,
  edges: defaultWf.edges,
  _sessionIds: [],
  _history: [],
  _historyIndex: -1,
  workflows: { [defaultWf.id]: defaultWf },
  activeWorkflowId: defaultWf.id,

  // ─── 多工作流操作 ────────────────────────────────────────────────────────

  _saveCurrentWorkflow: () => {
    const { nodes, edges, _history, _historyIndex, activeWorkflowId, workflows } = get()
    set({
      workflows: {
        ...workflows,
        [activeWorkflowId]: {
          ...workflows[activeWorkflowId],
          nodes,
          edges,
          history: _history,
          historyIndex: _historyIndex,
        },
      },
    })
  },

  createWorkflow: () => {
    const { workflows, _saveCurrentWorkflow } = get()
    _saveCurrentWorkflow()
    const n = Object.keys(workflows).length + 1
    const wf = createDefaultWorkflow(`画布 ${n}`)
    set({
      workflows: { ...workflows, [wf.id]: wf },
      activeWorkflowId: wf.id,
      nodes: wf.nodes,
      edges: wf.edges,
      _history: [],
      _historyIndex: -1,
    })
  },

  switchWorkflow: (id) => {
    const { activeWorkflowId, workflows, nodes, _saveCurrentWorkflow } = get()
    if (id === activeWorkflowId) return
    // abort 正在运行的 agent
    nodes.filter((n) => n.type === "agent" && (n.data as AgentNodeData).status === "running")
      .forEach((n) => get().abortWorkflow(n.id))
    _saveCurrentWorkflow()
    const wf = workflows[id]
    if (!wf) return
    set({
      activeWorkflowId: id,
      nodes: wf.nodes,
      edges: wf.edges,
      _history: wf.history ?? [],
      _historyIndex: wf.historyIndex ?? -1,
    })
  },

  closeWorkflow: (id) => {
    const { workflows, activeWorkflowId, switchWorkflow } = get()
    const ids = Object.keys(workflows)
    if (ids.length <= 1) return
    // 关闭当前激活的 → 先切换到相邻工作流
    if (id === activeWorkflowId) {
      const idx = ids.indexOf(id)
      const nextId = ids[idx > 0 ? idx - 1 : 1]
      switchWorkflow(nextId)
    }
    set((s) => {
      const next = { ...s.workflows }
      delete next[id]
      return { workflows: next }
    })
  },

  renameWorkflow: (id, name) => {
    set((s) => ({
      workflows: {
        ...s.workflows,
        [id]: { ...s.workflows[id], name },
      },
    }))
  },

  // ─── 历史管理 ────────────────────────────────────────────────────────────

  _pushHistory: () => {
    const { nodes, edges, _history, _historyIndex } = get()
    const newHistory = _history.slice(0, _historyIndex + 1)
    newHistory.push({ nodes: [...nodes], edges: [...edges] })
    if (newHistory.length > 50) newHistory.shift()
    set({ _history: newHistory, _historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { _history, _historyIndex } = get()
    if (_historyIndex <= 0) return
    const prev = _history[_historyIndex - 1]
    set({ nodes: prev.nodes, edges: prev.edges, _historyIndex: _historyIndex - 1 })
  },

  redo: () => {
    const { _history, _historyIndex } = get()
    if (_historyIndex >= _history.length - 1) return
    const next = _history[_historyIndex + 1]
    set({ nodes: next.nodes, edges: next.edges, _historyIndex: _historyIndex + 1 })
  },

  onNodesChange: (changes: NodeChange<FlowNode>[]) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes: EdgeChange[]) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  onConnect: (connection: Connection) => {
    get()._pushHistory()
    set((s) => ({ edges: addEdge(connection, s.edges) }))
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => {
    get()._pushHistory()
    set({ edges })
  },

  addNode: (type, position, initialData) => {
    get()._pushHistory()
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
          data: { inputType: "text", value: "", label: "新输入", ...initialData } satisfies InputNodeData,
          style: { width: 280 },
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
            ...initialData,
          } satisfies AgentNodeData,
          style: { width: 300 },
        } as AgentNodeType
      }
      return {
        id,
        type: "output",
        position: pos,
        data: { platform: "zhihu", content: "", label: "新输出", contentFormat: "auto", ...initialData } satisfies OutputNodeData,
        style: { width: 320 },
      } as OutputNodeType
    })()

    set((s) => ({ nodes: [...s.nodes, node] }))
  },

  removeNode: (id) => {
    get()._pushHistory()
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
    }))
  },

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

    const runMock = async (o: OutputNodeType) => {
      await runMockWorkflow(
        o.data.platform,
        agentNode.data.idea,
        (chunk) => {
          const cur = (get().nodes.find((n) => n.id === o.id) as OutputNodeType | undefined)?.data.content ?? ""
          updateNodeData<OutputNodeData>(o.id, { content: cur + chunk })
        },
        () => {},
        (imageUrl) => {
          const existing = (get().nodes.find((n) => n.id === o.id) as OutputNodeType | undefined)?.data.images ?? []
          updateNodeData<OutputNodeData>(o.id, {
            images: [...existing, { id: nanoid(), url: imageUrl, generatedAt: Date.now() }],
            contentType: "image",
          })
        },
      )
    }

    if (dryRun) {
      appendLog("[dry-run] 模拟运行，不调用模型")
      for (const o of outputNodes) await runMock(o)
      updateNodeData<AgentNodeData>(agentNodeId, { status: "done" })
      appendLog("dry-run 完成")
      return
    }

    const available = await isServerAvailable()

    if (!available) {
      appendLog("OpenCode 服务未启动，切换到演示模式", "info")
      for (const o of outputNodes) await runMock(o)
      updateNodeData<AgentNodeData>(agentNodeId, { status: "done" })
      appendLog("演示完成（真实运行需启动 OpenCode）")
      return
    }

    // ─ 构建基础提示词（输入 + 想法，各输出节点共用） ────────────────────────
    const baseParts: { type: "text"; text: string }[] = []
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

    // ─ 每个输出节点并行发起独立 AI 会话 ─────────────────────────────────────
    const runOneOutput = async (outputNode: OutputNodeType, idx: number) => {
      const cf = outputNode.data.contentFormat ?? "auto"
      const platformInstr = getPlatformInstruction(outputNode.data.platform, cf)
      const parts = [...baseParts, { type: "text" as const, text: platformInstr }]

      appendLog(`[${idx + 1}/${outputNodes.length}] 创建 ${outputNode.data.platform} 会话...`)
      const sessionId = await createSession()
      set((s) => ({ _sessionIds: [...s._sessionIds, sessionId] }))

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
              if (part?.type === "file") {
                const fp = part as { mime?: string; url?: string; id?: string }
                if (fp.mime?.startsWith("image/") && fp.url) {
                  const existing = (get().nodes.find((n) => n.id === outputNode.id) as OutputNodeType | undefined)?.data.images ?? []
                  updateNodeData<OutputNodeData>(outputNode.id, {
                    images: [...existing, { id: fp.id ?? nanoid(), url: fp.url, generatedAt: Date.now() }],
                    contentType: "image",
                  })
                  appendLog(`[${outputNode.data.platform}] 图片已生成`, "info")
                }
              }
              if (part?.type === "tool") {
                const state = part.state as { status?: string; title?: string } | undefined
                if (state?.title) appendLog(`[${outputNode.data.platform}] 工具: ${state.title}`, "tool")
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
              appendLog(`[${outputNode.data.platform}] 错误: ${props.error ?? props.message ?? "未知错误"}`, "error")
              unsubscribe()
              reject(new Error(props.error ?? props.message ?? "session error"))
            }
          },
          () => {
            appendLog("事件流断开", "error")
            reject(new Error("SSE disconnected"))
          },
        )
        sendPrompt(sessionId, parts, agentNode.data.model).catch(reject)
      })

      // 图文两步法：解析 [IMG_PROMPT:...] 标记触发生图
      // 触发条件：选了"图文"，或选了"自主"且平台为小红书
      const shouldGenerateImage =
        cf === "image_text" ||
        (cf === "auto" && outputNode.data.platform === "xiaohongshu")
      if (shouldGenerateImage && outputBuffer) {
        const match = outputBuffer.match(/\[IMG_PROMPT:\s*([\s\S]+?)\]/)
        if (match) {
          const imagePrompt = match[1].trim()
          const caption = outputBuffer.replace(/\[IMG_PROMPT:[\s\S]+?\]\n?/, "").trim()
          updateNodeData<OutputNodeData>(outputNode.id, { content: caption })
          appendLog(`[小红书] 解析到图片描述，开始生图...`, "info")
          const imageUrl = await generateImage(imagePrompt).catch((err: Error) => {
            appendLog(`[小红书] 所有图片生成通道失败: ${(err.message ?? "").slice(0, 60)}，使用占位图`, "info")
            const label = encodeURIComponent(imagePrompt.slice(0, 40))
            return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23ff2b54" opacity="0.1" rx="12"/><text x="50%" y="40%" font-family="sans-serif" font-size="16" fill="%23ff2b54" text-anchor="middle">图片生成失败，使用占位图</text><text x="50%" y="56%" font-family="sans-serif" font-size="12" fill="%23888" text-anchor="middle">${label}</text></svg>`
          })
          updateNodeData<OutputNodeData>(outputNode.id, {
            images: [{ id: nanoid(), url: imageUrl, generatedAt: Date.now() }],
            contentType: "image",
          })
          appendLog(`[小红书] 图片生成完成`, "info")
        }
      }
    }

    try {
      appendLog(`并行启动 ${outputNodes.length} 个输出节点...`)
      await Promise.all(outputNodes.map((o, i) => runOneOutput(o, i)))
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
    }),
    {
      name: "thinkflow-canvas-v2",
      partialize: (s) => ({
        activeWorkflowId: s.activeWorkflowId,
        workflows: Object.fromEntries(
          Object.entries(s.workflows).map(([id, wf]) => [
            id,
            {
              ...wf,
              nodes: wf.nodes.map(cleanNodeForPersist),
              edges: wf.edges.map(cleanEdgeForPersist),
              history: [],
              historyIndex: -1,
            },
          ])
        ),
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.activeWorkflowId && state.workflows?.[state.activeWorkflowId]) {
          const wf = state.workflows[state.activeWorkflowId]
          state.nodes = wf.nodes
          state.edges = wf.edges
          state._history = []
          state._historyIndex = -1
        }
      },
    }
  )
)
