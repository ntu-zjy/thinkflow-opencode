import { describe, it, expect, beforeEach } from "vitest"
import { useCanvasStore } from "../store/canvasStore"

beforeEach(() => {
  // Reset store state between tests
  useCanvasStore.setState({
    canvases: [],
    activeCanvasId: null,
    selectedNodeIds: [],
  })
})

describe("canvasStore", () => {
  it("creates a new canvas", () => {
    const { createCanvas } = useCanvasStore.getState()
    const id = createCanvas("Test Canvas")
    const state = useCanvasStore.getState()
    expect(state.canvases).toHaveLength(1)
    expect(state.canvases[0].title).toBe("Test Canvas")
    expect(state.activeCanvasId).toBe(id)
  })

  it("creates canvas with default nodes", () => {
    const { createCanvas } = useCanvasStore.getState()
    createCanvas("My Canvas")
    const state = useCanvasStore.getState()
    const canvas = state.canvases[0]
    expect(canvas.nodes).toHaveLength(3)
    expect(canvas.nodes.map((n) => n.type)).toEqual(["inputNode", "agentNode", "outputNode"])
  })

  it("creates canvas with default edges", () => {
    const { createCanvas } = useCanvasStore.getState()
    createCanvas("My Canvas")
    const state = useCanvasStore.getState()
    const canvas = state.canvases[0]
    expect(canvas.edges).toHaveLength(2)
    // input -> agent
    expect(canvas.edges[0].source).toBe(canvas.nodes[0].id)
    expect(canvas.edges[0].target).toBe(canvas.nodes[1].id)
    // agent -> output
    expect(canvas.edges[1].source).toBe(canvas.nodes[1].id)
    expect(canvas.edges[1].target).toBe(canvas.nodes[2].id)
  })

  it("deletes a canvas", () => {
    const store = useCanvasStore.getState()
    const id1 = store.createCanvas("Canvas 1")
    const id2 = store.createCanvas("Canvas 2")
    useCanvasStore.getState().deleteCanvas(id1)
    const state = useCanvasStore.getState()
    expect(state.canvases).toHaveLength(1)
    expect(state.canvases[0].id).toBe(id2)
  })

  it("switches active canvas", () => {
    const store = useCanvasStore.getState()
    const id1 = store.createCanvas("Canvas 1")
    const id2 = store.createCanvas("Canvas 2")
    useCanvasStore.getState().setActiveCanvas(id1)
    expect(useCanvasStore.getState().activeCanvasId).toBe(id1)
  })

  it("renames a canvas", () => {
    const store = useCanvasStore.getState()
    const id = store.createCanvas("Old Title")
    useCanvasStore.getState().renameCanvas(id, "New Title")
    const canvas = useCanvasStore.getState().canvases.find((c) => c.id === id)
    expect(canvas?.title).toBe("New Title")
  })

  it("adds an input node", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const before = useCanvasStore.getState().activeCanvas()?.nodes.length ?? 0
    useCanvasStore.getState().addInputNode({ x: 100, y: 100 })
    const after = useCanvasStore.getState().activeCanvas()?.nodes.length ?? 0
    expect(after).toBe(before + 1)
    const newNode = useCanvasStore.getState().activeCanvas()?.nodes.at(-1)
    expect(newNode?.type).toBe("inputNode")
  })

  it("adds an agent node", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    useCanvasStore.getState().addAgentNode({ x: 200, y: 200 })
    const newNode = useCanvasStore.getState().activeCanvas()?.nodes.at(-1)
    expect(newNode?.type).toBe("agentNode")
  })

  it("adds an output node", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    useCanvasStore.getState().addOutputNode({ x: 300, y: 300 })
    const newNode = useCanvasStore.getState().activeCanvas()?.nodes.at(-1)
    expect(newNode?.type).toBe("outputNode")
  })

  it("deletes a node and its edges", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const inputNodeId = canvas.nodes.find((n) => n.type === "inputNode")!.id
    const edgesBefore = canvas.edges.length
    useCanvasStore.getState().deleteNode(inputNodeId)
    const state = useCanvasStore.getState().activeCanvas()!
    expect(state.nodes.find((n) => n.id === inputNodeId)).toBeUndefined()
    // Edges connected to deleted node should be removed
    const edgesAfter = state.edges.length
    expect(edgesAfter).toBeLessThan(edgesBefore)
  })

  it("updates node data", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const agentNodeId = canvas.nodes.find((n) => n.type === "agentNode")!.id
    useCanvasStore.getState().updateNodeData(agentNodeId, { idea: "Write a poem" } as any)
    const updatedNode = useCanvasStore.getState().activeCanvas()?.nodes.find((n) => n.id === agentNodeId)
    expect((updatedNode?.data as any).idea).toBe("Write a poem")
  })

  it("sets node status", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const agentNodeId = canvas.nodes.find((n) => n.type === "agentNode")!.id
    useCanvasStore.getState().setNodeStatus(agentNodeId, "running")
    const updatedNode = useCanvasStore.getState().activeCanvas()?.nodes.find((n) => n.id === agentNodeId)
    expect((updatedNode?.data as any).status).toBe("running")
  })

  it("gets connected inputs for agent node", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const agentNodeId = canvas.nodes.find((n) => n.type === "agentNode")!.id
    const inputs = useCanvasStore.getState().getConnectedInputs(agentNodeId)
    expect(inputs).toHaveLength(1)
    expect(inputs[0].type).toBe("inputNode")
  })

  it("gets connected outputs for agent node", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const agentNodeId = canvas.nodes.find((n) => n.type === "agentNode")!.id
    const outputs = useCanvasStore.getState().getConnectedOutputs(agentNodeId)
    expect(outputs).toHaveLength(1)
    expect(outputs[0].type).toBe("outputNode")
  })

  it("prevents output→agent connections", () => {
    const store = useCanvasStore.getState()
    store.createCanvas("Canvas")
    const canvas = useCanvasStore.getState().activeCanvas()!
    const outputNodeId = canvas.nodes.find((n) => n.type === "outputNode")!.id
    const agentNodeId = canvas.nodes.find((n) => n.type === "agentNode")!.id
    const edgesBefore = useCanvasStore.getState().activeCanvas()!.edges.length
    useCanvasStore.getState().onConnect({ source: outputNodeId, target: agentNodeId, sourceHandle: null, targetHandle: null })
    const edgesAfter = useCanvasStore.getState().activeCanvas()!.edges.length
    expect(edgesAfter).toBe(edgesBefore)
  })

  it("multiple canvases are independent", () => {
    const store = useCanvasStore.getState()
    const id1 = store.createCanvas("Canvas 1")
    const id2 = store.createCanvas("Canvas 2")
    useCanvasStore.getState().setActiveCanvas(id1)
    useCanvasStore.getState().addInputNode({ x: 500, y: 500 })
    useCanvasStore.getState().setActiveCanvas(id2)
    const canvas2 = useCanvasStore.getState().activeCanvas()!
    // canvas2 should only have the default 3 nodes
    expect(canvas2.nodes).toHaveLength(3)
  })
})
