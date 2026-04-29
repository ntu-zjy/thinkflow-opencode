import { useCallback, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
  Panel,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useCanvasStore } from "../store/canvasStore"
import { nodeTypes } from "../nodes"

interface ContextMenu {
  x: number
  y: number
  flowX: number
  flowY: number
}

export function Canvas() {
  const nodes = useCanvasStore((s) => s.nodes)
  const edges = useCanvasStore((s) => s.edges)
  const onNodesChange = useCanvasStore((s) => s.onNodesChange)
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const addNode = useCanvasStore((s) => s.addNode)

  const { screenToFlowPosition } = useReactFlow()
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const paneRef = useRef<HTMLDivElement>(null)

  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault()
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setContextMenu({ x: e.clientX, y: e.clientY, flowX: flowPos.x, flowY: flowPos.y })
    },
    [screenToFlowPosition],
  )

  const handlePaneClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  const addNodeAtPos = (type: "input" | "agent" | "output") => {
    if (contextMenu) {
      addNode(type, { x: contextMenu.flowX, y: contextMenu.flowY })
    }
    setContextMenu(null)
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }} ref={paneRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ animated: false }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === "input") return "var(--border-accent)"
            if (n.type === "agent") return "var(--status-running)"
            return "var(--status-done)"
          }}
          maskColor="var(--bg-overlay)"
          style={{ background: "var(--bg-surface)" }}
        />

        {/* 快捷提示 — 悬停问号展开，放右下角避开 Controls */}
        <Panel position="bottom-right">
          <div className="tf-shortcut-hint" style={{ marginBottom: 8, marginRight: 8 }}>
            <div className="tf-shortcut-hint__icon">?</div>
            <div className="tf-shortcut-hint__tooltip" style={{ left: "auto", right: 0 }}>
              右键添加节点 · Del 删除 · Shift 多选 · 滚轮缩放
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="tf-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div className="tf-context-menu-item" onClick={() => addNodeAtPos("input")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            添加输入节点
          </div>
          <div className="tf-context-menu-item" onClick={() => addNodeAtPos("agent")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83" />
            </svg>
            添加 Agent 节点
          </div>
          <div className="tf-context-menu-item" onClick={() => addNodeAtPos("output")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            添加输出节点
          </div>
        </div>
      )}
    </div>
  )
}
