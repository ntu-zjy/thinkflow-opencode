import { describe, it, expect, beforeEach, vi } from "vitest"
import "./setup"
import { useCanvasStore } from "../store/canvasStore"

// 重置为初始状态
const resetStore = () => {
  useCanvasStore.setState({
    nodes: [
      { id: "input-1", type: "input", position: { x: 100, y: 200 }, data: { inputType: "text", value: "", label: "输入" } },
      { id: "agent-1", type: "agent", position: { x: 450, y: 200 }, data: { idea: "", model: "moonshotai/kimi-k2.6", status: "idle", logs: [], dryRun: false } },
      { id: "output-1", type: "output", position: { x: 800, y: 200 }, data: { platform: "zhihu", content: "", label: "输出" } },
    ] as ReturnType<typeof useCanvasStore.getState>["nodes"],
    edges: [
      { id: "e-input1-agent1", source: "input-1", target: "agent-1", animated: false },
      { id: "e-agent1-output1", source: "agent-1", target: "output-1", animated: false },
    ],
  })
}

beforeEach(resetStore)

describe("canvasStore — 节点操作", () => {
  it("初始状态包含 3 个节点", () => {
    expect(useCanvasStore.getState().nodes).toHaveLength(3)
  })

  it("addNode 添加 input 节点", () => {
    useCanvasStore.getState().addNode("input")
    expect(useCanvasStore.getState().nodes).toHaveLength(4)
    const newNode = useCanvasStore.getState().nodes.find((n) => n.type === "input" && n.id !== "input-1")
    expect(newNode).toBeDefined()
    expect(newNode?.type).toBe("input")
  })

  it("addNode 添加 agent 节点，默认模型正确", () => {
    useCanvasStore.getState().addNode("agent")
    const agentNodes = useCanvasStore.getState().nodes.filter((n) => n.type === "agent")
    expect(agentNodes).toHaveLength(2)
    const newAgent = agentNodes.find((n) => n.id !== "agent-1")
    expect((newAgent?.data as { model: string }).model).toBe("moonshotai/kimi-k2.6")
  })

  it("addNode 指定位置", () => {
    useCanvasStore.getState().addNode("output", { x: 500, y: 300 })
    const outputNodes = useCanvasStore.getState().nodes.filter((n) => n.type === "output")
    expect(outputNodes).toHaveLength(2)
    const newOutput = outputNodes.find((n) => n.id !== "output-1")
    expect(newOutput?.position).toEqual({ x: 500, y: 300 })
  })

  it("updateNodeData 更新节点数据", () => {
    useCanvasStore.getState().updateNodeData("agent-1", { idea: "新想法" })
    const agent = useCanvasStore.getState().nodes.find((n) => n.id === "agent-1")
    expect((agent?.data as { idea: string }).idea).toBe("新想法")
  })

  it("updateNodeData 只更新指定字段", () => {
    useCanvasStore.getState().updateNodeData("output-1", { content: "输出内容" })
    const output = useCanvasStore.getState().nodes.find((n) => n.id === "output-1")
    expect((output?.data as { platform: string }).platform).toBe("zhihu") // 其他字段不变
    expect((output?.data as { content: string }).content).toBe("输出内容")
  })
})

describe("canvasStore — 边操作", () => {
  it("初始状态包含 2 条边", () => {
    expect(useCanvasStore.getState().edges).toHaveLength(2)
  })

  it("setEdges 替换全部边", () => {
    useCanvasStore.getState().setEdges([])
    expect(useCanvasStore.getState().edges).toHaveLength(0)
  })
})

describe("canvasStore — 工作流（dry-run 模式）", () => {
  it("dry-run 模式完成后状态变为 done", async () => {
    // 将 agent-1 设置为 dry-run 并先填写输入
    useCanvasStore.getState().updateNodeData("input-1", { value: "测试输入内容" })
    useCanvasStore.getState().updateNodeData("agent-1", { dryRun: true })

    await useCanvasStore.getState().runWorkflow("agent-1")

    const agent = useCanvasStore.getState().nodes.find((n) => n.id === "agent-1")
    expect((agent?.data as { status: string }).status).toBe("done")
  }, 10000)

  it("dry-run 模式生成输出内容", async () => {
    useCanvasStore.getState().updateNodeData("input-1", { value: "测试输入" })
    useCanvasStore.getState().updateNodeData("agent-1", { dryRun: true })

    await useCanvasStore.getState().runWorkflow("agent-1")

    const output = useCanvasStore.getState().nodes.find((n) => n.id === "output-1")
    expect((output?.data as { content: string }).content.length).toBeGreaterThan(0)
  }, 10000)

  it("非 dry-run 且 OpenCode 不可用时走 mock 流程", async () => {
    // 让 fetch 模拟失败（isServerAvailable 返回 false）
    const origFetch = globalThis.fetch
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("网络错误")) as unknown as typeof fetch
    useCanvasStore.getState().updateNodeData("input-1", { value: "测试文本" })
    useCanvasStore.getState().updateNodeData("agent-1", { dryRun: false, idea: "想法" })

    await useCanvasStore.getState().runWorkflow("agent-1")
    const agent = useCanvasStore.getState().nodes.find((n) => n.id === "agent-1")
    expect(["done", "error"]).toContain((agent?.data as { status: string }).status)
    globalThis.fetch = origFetch
  }, 10000)

  it("abortWorkflow 将状态设置为 idle", async () => {
    useCanvasStore.getState().updateNodeData("agent-1", { status: "running" })
    useCanvasStore.getState().abortWorkflow("agent-1")
    const agent = useCanvasStore.getState().nodes.find((n) => n.id === "agent-1")
    expect((agent?.data as { status: string }).status).toBe("idle")
  })

  it("不存在的 agentNodeId 直接返回不抛出异常", async () => {
    await expect(useCanvasStore.getState().runWorkflow("non-existent")).resolves.toBeUndefined()
  })
})
