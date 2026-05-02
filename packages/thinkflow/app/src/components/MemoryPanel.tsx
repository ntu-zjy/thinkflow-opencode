import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { useMemoryStore } from "../store/memoryStore"
import type { MemoryEntry } from "../types"

interface MemoryPanelProps {
  onClose: () => void
}

const FOLDER_COLOR_MAP: Record<string, string> = {
  persona:    "#3b82f6",
  material:   "#10b981",
  preference: "#f59e0b",
  output:     "#8b5cf6",
  other:      "#6b7280",
}

function getFolderColorByType(type: string): string {
  return FOLDER_COLOR_MAP[type] ?? "#6b7280"
}

function FolderIcon({ type, size = 12 }: { type: string; size?: number }) {
  const s = { width: size, height: size, flexShrink: 0 as const }
  if (type === "persona") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
  if (type === "material") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )
  if (type === "preference") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </svg>
  )
  if (type === "output") return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
  // other / custom
  return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}

// ─── 记忆卡片详情弹窗 ─────────────────────────────────────────────────────────

interface MemoryModalProps {
  entry: MemoryEntry
  folderName: string
  folderType: string
  color: string
  onClose: () => void
}

function MemoryModal({ entry, folderName, folderType, color, onClose }: MemoryModalProps) {
  const [copied, setCopied] = useState(false)

  const handleClose = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose() }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [handleClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div
      className="tf-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="tf-modal" style={{ borderTop: `3px solid ${color}` }}>
        <div className="tf-modal__header">
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="tf-node__title">{entry.title}</span>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              padding: "1px 8px",
              borderRadius: 99,
              background: color + "1a",
              color,
              width: "fit-content",
            }}>
              <FolderIcon type={folderType} size={11} />
              {folderName}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <button
              className="tf-btn tf-btn-ghost"
              style={{ padding: "4px 10px", fontSize: 12 }}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  复制
                </>
              )}
            </button>
            <button
              className="tf-node__delete"
              style={{ opacity: 1, position: "relative", top: "auto", right: "auto" }}
              onClick={handleClose}
              title="关闭"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="tf-modal__body">
          <pre style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            color: "var(--text-primary)",
          }}>
            {entry.content}
          </pre>
        </div>

        <div className="tf-modal__footer">
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {entry.content.length > 0 ? `${entry.content.length} 字` : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>按 ESC 关闭</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ─── 记忆库主面板 ─────────────────────────────────────────────────────────────

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const folders = useMemoryStore((s) => s.folders)
  const entries = useMemoryStore((s) => s.entries)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const updateEntry = useMemoryStore((s) => s.updateEntry)
  const removeEntry = useMemoryStore((s) => s.removeEntry)
  const searchEntries = useMemoryStore((s) => s.searchEntries)
  const importFromJson = useMemoryStore((s) => s.importFromJson)
  const exportToJson = useMemoryStore((s) => s.exportToJson)

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [modalEntry, setModalEntry] = useState<MemoryEntry | null>(null)

  const filteredEntries = query
    ? searchEntries(query)
    : selectedFolderId
    ? entries.filter((e) => e.folderId === selectedFolderId)
    : entries

  const handleExport = () => {
    const json = exportToJson()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `thinkflow-memory-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          importFromJson(ev.target?.result as string)
        } catch {
          alert("导入失败：文件格式不正确")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const startEdit = (id: string, title: string, content: string) => {
    setEditingId(id)
    setEditTitle(title)
    setEditContent(content)
  }

  const saveEdit = () => {
    if (editingId) {
      updateEntry(editingId, { title: editTitle, content: editContent })
      setEditingId(null)
    }
  }

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return
    const folderId = selectedFolderId ?? folders[0]?.id ?? "folder-output"
    addEntry({ folderId, title: newTitle, content: newContent })
    setNewTitle("")
    setNewContent("")
    setShowNewForm(false)
  }

  const getFolderColor = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId)
    return folder ? getFolderColorByType(folder.type) : "var(--border)"
  }

  const getFolder = (folderId: string) => folders.find((f) => f.id === folderId)

  return (
    <div className="tf-memory-panel">
      {/* 顶部工具栏 */}
      <div className="tf-memory-panel__header">
        <span className="tf-memory-panel__title">记忆</span>

        {/* 分类 tab */}
        <div className="tf-memory-panel__tabs">
          <button
            className={`tf-btn ${selectedFolderId === null && !query ? "tf-btn-primary" : "tf-btn-ghost"}`}
            style={{ padding: "3px 12px", fontSize: 12 }}
            onClick={() => { setSelectedFolderId(null); setQuery("") }}
          >
            全部
          </button>
          {folders.map((f) => {
            const tabColor = getFolderColorByType(f.type)
            const isActive = selectedFolderId === f.id
            return (
              <button
                key={f.id}
                className="tf-btn tf-btn-ghost tf-memory-panel__tab"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 12px",
                  fontSize: 12,
                  borderBottom: isActive ? `2px solid ${tabColor}` : "2px solid transparent",
                  color: isActive ? tabColor : undefined,
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                }}
                onClick={() => { setSelectedFolderId(f.id); setQuery("") }}
              >
                <FolderIcon type={f.type} size={12} />
                {f.name}
              </button>
            )
          })}
        </div>

        {/* 右侧操作 */}
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <input
            className="tf-input"
            placeholder="搜索记忆..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 180, padding: "5px 10px", fontSize: 12 }}
          />
          <button
            className="tf-btn tf-btn-primary"
            style={{ padding: "5px 14px", fontSize: 12 }}
            onClick={() => setShowNewForm((v) => !v)}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建记忆
          </button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "5px 10px" }} onClick={handleImport} title="导入">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            </svg>
          </button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "5px 10px" }} onClick={handleExport} title="导出">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="7 16 12 21 17 16" />
              <line x1="12" y1="21" x2="12" y2="9" />
              <path d="M3 9v4a2 2 0 002 2h14a2 2 0 002-2V9" />
            </svg>
          </button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "5px 10px" }} onClick={onClose} title="关闭，返回画布">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 新建表单 */}
      {showNewForm && (
        <div className="tf-memory-panel__new-form">
          <input
            className="tf-input"
            placeholder="标题..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ flex: 1 }}
          />
          <textarea
            className="tf-textarea"
            placeholder="内容..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={3}
            style={{ flex: 3 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", flexShrink: 0 }}>
            <select
              className="tf-input"
              value={selectedFolderId ?? folders[0]?.id ?? ""}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              style={{ fontSize: 12 }}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button className="tf-btn tf-btn-primary" onClick={handleAdd}>保存</button>
            <button className="tf-btn tf-btn-ghost" onClick={() => setShowNewForm(false)}>取消</button>
          </div>
        </div>
      )}

      {/* 卡片网格区 */}
      <div className="tf-memory-panel__grid">
        {filteredEntries.length === 0 ? (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 13,
            padding: "var(--space-6) 0",
          }}>
            {query ? "未找到匹配记忆" : "暂无记忆，点击「新建记忆」添加"}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const color = getFolderColor(entry.folderId)
            const folder = getFolder(entry.folderId)
            return (
              <div
                key={entry.id}
                className="tf-memory-card"
                style={{ "--memory-color": color } as React.CSSProperties}
              >
                {editingId === entry.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    <input
                      className="tf-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      className="tf-textarea"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={5}
                    />
                    <div style={{ display: "flex", gap: "var(--space-2)" }}>
                      <button className="tf-btn tf-btn-primary" style={{ flex: 1 }} onClick={saveEdit}>保存</button>
                      <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={() => setEditingId(null)}>取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 卡片 header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="tf-memory-card__title">{entry.title}</span>
                        {folder && (
                          <span
                            className="tf-memory-card__badge"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: color + "1a", color }}
                          >
                            <FolderIcon type={folder.type} size={10} />
                            {folder.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0, marginLeft: "var(--space-2)" }}>
                        {/* 展开按钮 */}
                        <button
                          className="tf-btn tf-btn-ghost"
                          style={{ padding: "2px 6px", fontSize: 11 }}
                          onClick={() => setModalEntry(entry)}
                          title="展开查看"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                          </svg>
                        </button>
                        <button
                          className="tf-btn tf-btn-ghost"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => startEdit(entry.id, entry.title, entry.content)}
                        >
                          编辑
                        </button>
                        <button
                          className="tf-btn tf-btn-danger"
                          style={{ padding: "2px 8px", fontSize: 11 }}
                          onClick={() => removeEntry(entry.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <p className="tf-memory-card__content">{entry.content}</p>
                    {entry.tags.length > 0 && (
                      <div className="tf-memory-entry__tags">
                        {entry.tags.map((t) => <span key={t} className="tf-tag">{t}</span>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 记忆详情 Modal */}
      {modalEntry && (() => {
        const folder = getFolder(modalEntry.folderId)
        return folder ? (
          <MemoryModal
            entry={modalEntry}
            folderName={folder.name}
            folderType={folder.type}
            color={getFolderColor(modalEntry.folderId)}
            onClose={() => setModalEntry(null)}
          />
        ) : null
      })()}
    </div>
  )
}
