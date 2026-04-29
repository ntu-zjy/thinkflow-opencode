import { useState, useCallback, useEffect } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Connection,
  type NodeTypes,
  type IsValidConnection,
} from "@xyflow/react"
import type { ThinkFlowEdge } from "../types"
import useCanvasStore from "../store/canvasStore"
import { nodeTypes } from "../nodes"

type ContextMenu = {
  x: number
  y: number
} | null

export default function Canvas() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const addNode = useCanvasStore((s) => s.addNode)
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)

  const [menu, setMenu] = useState<ContextMenu>(null)
  const [menuPos, setMenuPos] = useState({ flowX: 0, flowY: 0 })

  // Seed default demo nodes if canvas is empty
  useEffect(() => {
    if (nodes.length > 0) return
    addNode("input", { x: 100, y: 200 })
    addNode("agent", { x: 420, y: 180 })
    addNode("output", { x: 740, y: 200 })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Set default data after seeding (store initializes with blank defaults)
  useEffect(() => {
    if (nodes.length !== 3) return
    const [inputNode, , outputNode] = nodes
    if (inputNode?.type === "input" && !inputNode.data.value) {
      updateNodeData(inputNode.id, { value: "请输入内容..." })
    }
    if (outputNode?.type === "output") {
      updateNodeData(outputNode.id, { platform: "zhihu" })
    }
  }, [nodes.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const isValidConnection = useCallback<IsValidConnection<ThinkFlowEdge>>(
    (connection: Connection | ThinkFlowEdge) => {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false
      if (sourceNode.type === "input" && targetNode.type === "agent") return true
      if (sourceNode.type === "agent" && targetNode.type === "output") return true
      return false
    },
    [nodes],
  )

  function handleContextMenu(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (target.closest(".react-flow__node")) return
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ x: e.clientX, y: e.clientY })
    setMenuPos({ flowX: e.clientX - rect.left, flowY: e.clientY - rect.top })
  }

  function closeMenu() {
    setMenu(null)
  }

  function handleAddNode(type: "input" | "agent" | "output") {
    addNode(type, { x: menuPos.flowX - 120, y: menuPos.flowY - 60 })
    closeMenu()
  }

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    top: menu?.y ?? 0,
    left: menu?.x ?? 0,
    zIndex: 1000,
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-elevated)",
    padding: "6px",
    minWidth: 160,
    fontFamily: "var(--font-body)",
  }

  const menuItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--color-text-primary)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    border: "none",
    background: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "var(--font-body)",
    transition: "background 0.12s",
  }

  return (
    <div
      style={{ width: "100%", height: "100%", position: "relative" }}
      onContextMenu={handleContextMenu}
      onClick={closeMenu}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes as NodeTypes}
        isValidConnection={isValidConnection}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            if (node.type === "input") return "rgba(245,158,11,0.4)"
            if (node.type === "agent") return "rgba(59,130,246,0.4)"
            if (node.type === "output") return "rgba(16,185,129,0.4)"
            return "var(--color-border-strong)"
          }}
          maskColor="rgba(11,15,26,0.7)"
          style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
          }}
        />
      </ReactFlow>

      {/* Context menu */}
      {menu && (
        <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              fontSize: 10,
              color: "var(--color-text-muted)",
              padding: "4px 12px 6px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            添加节点
          </div>
          {(
            [
              { type: "input" as const, label: "输入节点", dot: "rgba(245,158,11,0.8)" },
              { type: "agent" as const, label: "Agent 节点", dot: "rgba(59,130,246,0.8)" },
              { type: "output" as const, label: "输出节点", dot: "rgba(16,185,129,0.8)" },
            ] as const
          ).map((item) => (
            <button
              key={item.type}
              style={menuItemStyle}
              onClick={() => handleAddNode(item.type)}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-overlay)"
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.background = "none"
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.dot,
                  flexShrink: 0,
                }}
              />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
