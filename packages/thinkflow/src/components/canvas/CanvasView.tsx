import React, { useCallback } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  SelectionMode,
} from "@xyflow/react"
import { useCanvasStore } from "@/store"
import InputNode from "@/components/nodes/InputNode"
import AgentNode from "@/components/nodes/AgentNode"
import OutputNode from "@/components/nodes/OutputNode"
import CanvasContextMenu from "./CanvasContextMenu"
import "./CanvasView.css"

const nodeTypes: NodeTypes = {
  inputNode: InputNode as NodeTypes["inputNode"],
  agentNode: AgentNode as NodeTypes["agentNode"],
  outputNode: OutputNode as NodeTypes["outputNode"],
}

function FlowCanvas() {
  const canvas = useCanvasStore((s) => s.activeCanvas())
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null)

  const onPaneContextMenu = useCallback((e: React.MouseEvent | MouseEvent) => {
    e.preventDefault()
    const me = e as React.MouseEvent
    setContextMenu({ x: me.clientX, y: me.clientY })
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  if (!canvas) return <div className="tf-canvas-empty">请选择或创建一个画布</div>

  return (
    <div className="tf-canvas-wrapper" onClick={closeContextMenu}>
      <ReactFlow
        nodes={canvas.nodes}
        edges={canvas.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onPaneContextMenu={onPaneContextMenu}
        selectionMode={SelectionMode.Partial}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "inputNode") return "var(--tf-node-input)"
            if (node.type === "agentNode") return "var(--tf-node-agent)"
            if (node.type === "outputNode") return "var(--tf-node-output)"
            return "var(--tf-text-muted)"
          }}
          maskColor="rgba(13,13,16,0.7)"
          style={{ bottom: 48, right: 12 }}
        />
      </ReactFlow>

      {contextMenu && (
        <CanvasContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} />
      )}
    </div>
  )
}

export default function CanvasView() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  )
}
