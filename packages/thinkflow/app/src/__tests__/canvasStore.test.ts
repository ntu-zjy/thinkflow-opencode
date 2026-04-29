import { describe, it, expect, beforeEach, vi } from "vitest"
import useCanvasStore from "../store/canvasStore"

// Mock opencodeClient to avoid real network calls
vi.mock("../services/opencodeClient", () => ({
  opencodeClient: {
    createSession: vi.fn().mockResolvedValue("mock-session-123"),
    sendPrompt: vi.fn().mockResolvedValue(undefined),
    subscribeEvents: vi.fn().mockReturnValue(() => {}),
    abortSession: vi.fn().mockResolvedValue(undefined),
    isMockMode: vi.fn().mockReturnValue(true),
  },
}))

beforeEach(() => {
  useCanvasStore.setState({ nodes: [], edges: [] })
})

describe("canvasStore", () => {
  it("初始状态为空画布", () => {
    const { nodes, edges } = useCanvasStore.getState()
    expect(nodes).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it("addNode 添加输入节点", () => {
    useCanvasStore.getState().addNode("input", { x: 100, y: 200 })
    const { nodes } = useCanvasStore.getState()
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe("input")
    expect(nodes[0].position).toEqual({ x: 100, y: 200 })
  })

  it("addNode 添加 Agent 节点默认 model", () => {
    useCanvasStore.getState().addNode("agent", { x: 0, y: 0 })
    const node = useCanvasStore.getState().nodes[0]
    expect(node.type).toBe("agent")
    if (node.type === "agent") {
      expect(node.data.model).toBe("moonshotai/kimi-k2.6")
      expect(node.data.status).toBe("idle")
      expect(node.data.logs).toEqual([])
    }
  })

  it("addNode 添加输出节点默认 platform", () => {
    useCanvasStore.getState().addNode("output", { x: 0, y: 0 })
    const node = useCanvasStore.getState().nodes[0]
    expect(node.type).toBe("output")
    if (node.type === "output") {
      expect(node.data.platform).toBe("zhihu")
    }
  })

  it("updateNodeData 更新节点数据", () => {
    useCanvasStore.getState().addNode("input", { x: 0, y: 0 })
    const id = useCanvasStore.getState().nodes[0].id
    useCanvasStore.getState().updateNodeData(id, { value: "新内容" })
    const node = useCanvasStore.getState().nodes[0]
    if (node.type === "input") {
      expect(node.data.value).toBe("新内容")
    }
  })

  it("setNodes 直接设置节点列表", () => {
    const nodes = [
      { id: "n1", type: "input" as const, position: { x: 0, y: 0 }, data: { inputType: "text" as const, value: "" } },
    ]
    useCanvasStore.getState().setNodes(nodes)
    expect(useCanvasStore.getState().nodes).toHaveLength(1)
    expect(useCanvasStore.getState().nodes[0].id).toBe("n1")
  })

  it("setEdges 直接设置边列表", () => {
    const edges = [{ id: "e1", source: "n1", target: "n2" }]
    useCanvasStore.getState().setEdges(edges)
    expect(useCanvasStore.getState().edges).toHaveLength(1)
  })

  it("onConnect 添加新连线", () => {
    useCanvasStore.getState().onConnect({ source: "n1", target: "n2", sourceHandle: null, targetHandle: null })
    expect(useCanvasStore.getState().edges).toHaveLength(1)
    expect(useCanvasStore.getState().edges[0].source).toBe("n1")
  })

  it("runWorkflow 找不到 agentNode 时直接返回", async () => {
    await expect(useCanvasStore.getState().runWorkflow("non-existent")).resolves.toBeUndefined()
  })

  it("abortWorkflow 将 running 节点状态重置为 idle", () => {
    useCanvasStore.getState().addNode("agent", { x: 0, y: 0 })
    const id = useCanvasStore.getState().nodes[0].id
    useCanvasStore.getState().updateNodeData(id, { status: "running", sessionId: "sid-123" })
    useCanvasStore.getState().abortWorkflow(id)
    const node = useCanvasStore.getState().nodes[0]
    if (node.type === "agent") {
      expect(node.data.status).toBe("idle")
    }
  })
})
