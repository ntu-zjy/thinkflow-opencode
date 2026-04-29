import React, { useState } from "react"
import { Input, Tooltip } from "antd"
import { useCanvasStore } from "@/store"
import { useAppStore } from "@/store"
import "./TopBar.css"

export default function TopBar() {
  const panel = useAppStore((s) => s.panel)
  const activeCanvas = useCanvasStore((s) => s.activeCanvas())
  const renameCanvas = useCanvasStore((s) => s.renameCanvas)
  const addInputNode = useCanvasStore((s) => s.addInputNode)
  const addAgentNode = useCanvasStore((s) => s.addAgentNode)
  const addOutputNode = useCanvasStore((s) => s.addOutputNode)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState("")

  function startEdit() {
    setTitle(activeCanvas?.title ?? "")
    setEditing(true)
  }

  function confirmEdit() {
    if (activeCanvas && title.trim()) {
      renameCanvas(activeCanvas.id, title.trim())
    }
    setEditing(false)
  }

  return (
    <header className="tf-topbar">
      <div className="tf-topbar__left">
        {panel === "canvas" && activeCanvas && (
          <>
            {editing ? (
              <Input
                className="tf-topbar__title-input"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={confirmEdit}
                onPressEnter={confirmEdit}
                size="small"
                variant="borderless"
              />
            ) : (
              <button className="tf-topbar__title" onClick={startEdit}>
                {activeCanvas.title}
                <EditIcon />
              </button>
            )}
          </>
        )}
        {panel === "memory" && <span className="tf-topbar__title-static">记忆库</span>}
      </div>

      {panel === "canvas" && (
        <div className="tf-topbar__actions">
          <Tooltip title="添加输入节点">
            <button className="tf-toolbar-btn tf-toolbar-btn--input" onClick={() => addInputNode()}>
              <InputIcon />
              <span>输入</span>
            </button>
          </Tooltip>
          <Tooltip title="添加 Agent 节点">
            <button className="tf-toolbar-btn tf-toolbar-btn--agent" onClick={() => addAgentNode()}>
              <AgentIcon />
              <span>Agent</span>
            </button>
          </Tooltip>
          <Tooltip title="添加输出节点">
            <button className="tf-toolbar-btn tf-toolbar-btn--output" onClick={() => addOutputNode()}>
              <OutputIcon />
              <span>输出</span>
            </button>
          </Tooltip>
          <div className="tf-topbar__divider" />
          <Tooltip title="运行全部">
            <button className="tf-toolbar-btn tf-toolbar-btn--run">
              <RunIcon />
              <span>运行</span>
            </button>
          </Tooltip>
        </div>
      )}
    </header>
  )
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function InputIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
}

function AgentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  )
}

function OutputIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 8 14 12" />
      <path d="M18 8v8" />
      <path d="M2 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H2" />
    </svg>
  )
}

function RunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
