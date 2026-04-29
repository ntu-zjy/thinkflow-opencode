import { describe, it, expect } from "vitest"
import { nodeTypes, InputNode, AgentNode, OutputNode } from "../nodes"

describe("nodeTypes 注册", () => {
  it("nodeTypes 包含三种节点类型", () => {
    expect(nodeTypes).toHaveProperty("input")
    expect(nodeTypes).toHaveProperty("agent")
    expect(nodeTypes).toHaveProperty("output")
  })

  it("nodeTypes.input 是函数组件", () => {
    expect(typeof nodeTypes.input).toBe("function")
  })

  it("nodeTypes.agent 是函数组件", () => {
    expect(typeof nodeTypes.agent).toBe("function")
  })

  it("nodeTypes.output 是函数组件", () => {
    expect(typeof nodeTypes.output).toBe("function")
  })

  it("导出的具名组件与 nodeTypes 中的引用一致", () => {
    expect(nodeTypes.input).toBe(InputNode)
    expect(nodeTypes.agent).toBe(AgentNode)
    expect(nodeTypes.output).toBe(OutputNode)
  })
})
