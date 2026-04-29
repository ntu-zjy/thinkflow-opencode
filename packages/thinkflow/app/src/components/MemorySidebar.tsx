import { useState } from "react"
import { useMemoryStore } from "../store/memoryStore"
import type { MemoryFolderType } from "../types"

interface MemorySidebarProps {
  open: boolean
  onClose: () => void
}

const FOLDER_ICONS: Record<MemoryFolderType, string> = {
  persona: "👤",
  material: "📚",
  preference: "⚙️",
  output: "📄",
}

export function MemorySidebar({ open, onClose }: MemorySidebarProps) {
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

  return (
    <div className={`tf-sidebar${open ? " open" : ""}`}>
      <div className="tf-sidebar__header">
        <span className="tf-sidebar__title">记忆库</span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 8px" }} onClick={handleImport} title="导入">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            </svg>
          </button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 8px" }} onClick={handleExport} title="导出">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="7 16 12 21 17 16" />
              <line x1="12" y1="21" x2="12" y2="9" />
              <path d="M3 9v4a2 2 0 002 2h14a2 2 0 002-2V9" />
            </svg>
          </button>
          <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 8px" }} onClick={onClose} title="关闭">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="tf-sidebar__body">
        {/* 搜索框 */}
        <input
          className="tf-input"
          placeholder="搜索记忆..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ marginBottom: "var(--space-3)" }}
        />

        {/* 分类文件夹 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)", marginBottom: "var(--space-3)" }}>
          <button
            className={`tf-btn ${selectedFolderId === null && !query ? "tf-btn-primary" : "tf-btn-ghost"}`}
            style={{ padding: "3px 10px", fontSize: 11 }}
            onClick={() => { setSelectedFolderId(null); setQuery("") }}
          >
            全部
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              className={`tf-btn ${selectedFolderId === f.id ? "tf-btn-primary" : "tf-btn-ghost"}`}
              style={{ padding: "3px 10px", fontSize: 11 }}
              onClick={() => { setSelectedFolderId(f.id); setQuery("") }}
            >
              {FOLDER_ICONS[f.type as MemoryFolderType]} {f.name}
            </button>
          ))}
        </div>

        {/* 新建按钮 */}
        <button
          className="tf-btn tf-btn-primary"
          style={{ width: "100%", marginBottom: "var(--space-3)" }}
          onClick={() => setShowNewForm((v) => !v)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建记忆
        </button>

        {/* 新建表单 */}
        {showNewForm && (
          <div
            style={{
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-3)",
              marginBottom: "var(--space-3)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <input
              className="tf-input"
              placeholder="标题..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="tf-textarea"
              placeholder="内容..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <button className="tf-btn tf-btn-primary" style={{ flex: 1 }} onClick={handleAdd}>
                保存
              </button>
              <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewForm(false)}>
                取消
              </button>
            </div>
          </div>
        )}

        {/* 记忆条目列表 */}
        {filteredEntries.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, padding: "var(--space-6) 0" }}>
            {query ? "未找到匹配记忆" : "暂无记忆，点击「新建记忆」添加"}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="tf-memory-entry">
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
                    rows={4}
                  />
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button className="tf-btn tf-btn-primary" style={{ flex: 1 }} onClick={saveEdit}>保存</button>
                    <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={() => setEditingId(null)}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-1)" }}>
                    <span className="tf-memory-entry__title">{entry.title}</span>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button
                        className="tf-btn tf-btn-ghost"
                        style={{ padding: "2px 6px", fontSize: 10 }}
                        onClick={() => startEdit(entry.id, entry.title, entry.content)}
                      >
                        编辑
                      </button>
                      <button
                        className="tf-btn tf-btn-danger"
                        style={{ padding: "2px 6px", fontSize: 10 }}
                        onClick={() => removeEntry(entry.id)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <p className="tf-memory-entry__preview">{entry.content}</p>
                  {entry.tags.length > 0 && (
                    <div className="tf-memory-entry__tags">
                      {entry.tags.map((t) => <span key={t} className="tf-tag">{t}</span>)}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
