import React from "react"
import { useCanvasStore } from "@/store"
import "./CanvasContextMenu.css"

interface Props {
  x: number
  y: number
  onClose: () => void
}

export default function CanvasContextMenu({ x, y, onClose }: Props) {
  const addInputNode = useCanvasStore((s) => s.addInputNode)
  const addAgentNode = useCanvasStore((s) => s.addAgentNode)
  const addOutputNode = useCanvasStore((s) => s.addOutputNode)

  function handle(fn: () => void) {
    fn()
    onClose()
  }

  return (
    <div
      className="tf-context-menu tf-animate-in"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="tf-context-menu__header">添加节点</div>
      <button className="tf-context-menu__item" onClick={() => handle(() => addInputNode({ x: x - 200, y }))}>
        <span className="tf-context-menu__dot" style={{ background: "var(--tf-node-input)" }} />
        输入节点
      </button>
      <button className="tf-context-menu__item" onClick={() => handle(() => addAgentNode({ x: x - 200, y }))}>
        <span className="tf-context-menu__dot" style={{ background: "var(--tf-node-agent)" }} />
        Agent 节点
      </button>
      <button className="tf-context-menu__item" onClick={() => handle(() => addOutputNode({ x: x - 200, y }))}>
        <span className="tf-context-menu__dot" style={{ background: "var(--tf-node-output)" }} />
        输出节点
      </button>
    </div>
  )
}
