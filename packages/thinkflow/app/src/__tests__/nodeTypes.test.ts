import { describe, it, expect } from "vitest"
import { nodeTypes } from "../nodes"

describe("nodeTypes — 节点类型注册", () => {
  it("应该导出 input 节点类型", () => {
    expect(nodeTypes.input).toBeDefined()
    expect(typeof nodeTypes.input).toBe("function")
  })

  it("应该导出 agent 节点类型", () => {
    expect(nodeTypes.agent).toBeDefined()
    expect(typeof nodeTypes.agent).toBe("function")
  })

  it("应该导出 output 节点类型", () => {
    expect(nodeTypes.output).toBeDefined()
    expect(typeof nodeTypes.output).toBe("function")
  })

  it("应该只有三种节点类型", () => {
    expect(Object.keys(nodeTypes)).toHaveLength(3)
  })

  it("所有节点类型均为 React 函数组件", () => {
    for (const [key, Component] of Object.entries(nodeTypes)) {
      expect(typeof Component, `${key} should be function`).toBe("function")
    }
  })
})
