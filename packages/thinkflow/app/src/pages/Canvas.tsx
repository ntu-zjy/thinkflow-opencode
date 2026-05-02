import { useCallback, useEffect, useRef, useState } from "react"
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
import type { AgentNodeData } from "../types"

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
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const runWorkflow = useCanvasStore((s) => s.runWorkflow)
  const setStoreNodes = useCanvasStore((s) => s.setNodes)

  const activeWorkflowId = useCanvasStore((s) => s.activeWorkflowId)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const paneRef = useRef<HTMLDivElement>(null)


  // 切换工作流后重新 fitView（200ms 等 DOM 稳定）
  useEffect(() => {
    const timer = setTimeout(() => fitView({ padding: 0.2 }), 200)
    return () => clearTimeout(timer)
  }, [activeWorkflowId, fitView])

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

  const addNodeAtPos = (
    type: "input" | "agent" | "output",
    initialData?: Record<string, unknown>,
  ) => {
    if (contextMenu) {
      addNode(type, { x: contextMenu.flowX, y: contextMenu.flowY }, initialData)
    }
    setContextMenu(null)
  }

  // 全局快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
      const meta = e.metaKey || e.ctrlKey

      // Cmd/Ctrl+Z → undo
      if (meta && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      // Cmd/Ctrl+Shift+Z 或 Cmd/Ctrl+Y → redo
      if ((meta && e.key === "z" && e.shiftKey) || (meta && e.key === "y")) {
        e.preventDefault()
        redo()
        return
      }
      // 以下快捷键在输入框内不触发
      if (inInput) return
      // Cmd/Ctrl+A → 全选节点
      if (meta && e.key === "a") {
        e.preventDefault()
        setStoreNodes(nodes.map((n) => ({ ...n, selected: true })))
        return
      }
      // Cmd/Ctrl+Enter → 运行选中 Agent（无选中则运行全部）
      if (meta && e.key === "Enter") {
        e.preventDefault()
        const selectedAgents = nodes.filter((n) => n.type === "agent" && n.selected)
        const targets = selectedAgents.length > 0 ? selectedAgents : nodes.filter((n) => n.type === "agent")
        targets.forEach((n) => {
          if ((n.data as AgentNodeData).status !== "running") runWorkflow(n.id)
        })
        return
      }
      // Space 或 H → fitView 归位
      if (e.code === "Space" || e.key === "h" || e.key === "H") {
        e.preventDefault()
        fitView({ padding: 0.2 })
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [undo, redo, fitView, nodes, runWorkflow, setStoreNodes])

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
        onInit={(instance) => setTimeout(() => instance.fitView({ padding: 0.2 }), 150)}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ animated: false }}
        deleteKeyCode="Delete"
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panActivationKeyCode={null}
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
              右键添加 · Del 删除 · Shift 多选 · 滚轮缩放
              <br />
              ⌘Z 撤销 · ⌘⇧Z 重做 · ⌘A 全选 · ⌘↵ 运行 · Space 归位
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
            输入节点
          </div>

          <div className="tf-context-menu-item" onClick={() => addNodeAtPos("agent")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83" />
            </svg>
            Agent 节点
          </div>

          <div className="tf-context-menu-item" onClick={() => addNodeAtPos("output")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            输出节点
          </div>
        </div>
      )}
    </div>
  )
}
