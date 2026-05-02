import { useState, useRef, useEffect } from "react"
import { useCanvasStore } from "../store/canvasStore"

function WorkflowItem({
  id,
  name,
  isActive,
  canClose,
  onSwitch,
  onClose,
  onRename,
}: {
  id: string
  name: string
  isActive: boolean
  canClose: boolean
  onSwitch: () => void
  onClose: (e: React.MouseEvent) => void
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setEditValue(name)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, name])

  const commit = () => {
    const v = editValue.trim()
    if (v && v !== name) onRename(v)
    setEditing(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit()
    if (e.key === "Escape") setEditing(false)
    e.stopPropagation()
  }

  return (
    <div
      className={`tf-wf-item${isActive ? " active" : ""}`}
      onClick={onSwitch}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      title={`${name}（双击重命名）`}
      data-id={id}
    >
      <div className="tf-wf-item__indicator" />
      <svg className="tf-wf-item__icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
      {editing ? (
        <input
          ref={inputRef}
          className="tf-wf-item__input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="tf-wf-item__name">{name}</span>
      )}
      {canClose && (
        <button className="tf-wf-item__close" onClick={onClose} title="关闭" tabIndex={-1}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}

interface WorkflowSidebarProps {
  memoryOpen: boolean
  onToggleMemory: () => void
}

export function WorkflowSidebar({ memoryOpen, onToggleMemory }: WorkflowSidebarProps) {
  const workflows = useCanvasStore((s) => s.workflows)
  const activeWorkflowId = useCanvasStore((s) => s.activeWorkflowId)
  const createWorkflow = useCanvasStore((s) => s.createWorkflow)
  const switchWorkflow = useCanvasStore((s) => s.switchWorkflow)
  const closeWorkflow = useCanvasStore((s) => s.closeWorkflow)
  const renameWorkflow = useCanvasStore((s) => s.renameWorkflow)

  const list = Object.values(workflows)
  const canClose = list.length > 1

  return (
    <div className="tf-wf-sidebar">
      {/* ── 画布区块 ── */}
      <div className="tf-wf-sidebar__header">
        <span className="tf-wf-sidebar__label">画布</span>
        <button className="tf-wf-sidebar__add" onClick={createWorkflow} title="新建画布">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div className="tf-wf-sidebar__list">
        {list.map((wf) => (
          <WorkflowItem
            key={wf.id}
            id={wf.id}
            name={wf.name}
            isActive={!memoryOpen && wf.id === activeWorkflowId}
            canClose={canClose}
            onSwitch={() => { if (memoryOpen) onToggleMemory(); switchWorkflow(wf.id) }}
            onClose={(e) => { e.stopPropagation(); closeWorkflow(wf.id) }}
            onRename={(name) => renameWorkflow(wf.id, name)}
          />
        ))}
      </div>

      {/* ── 记忆入口 ── */}
      <div className="tf-wf-sidebar__footer">
        <button
          className={`tf-wf-sidebar__memory-btn${memoryOpen ? " active" : ""}`}
          onClick={onToggleMemory}
          title="记忆"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          </svg>
          <span>记忆</span>
        </button>
      </div>
    </div>
  )
}
