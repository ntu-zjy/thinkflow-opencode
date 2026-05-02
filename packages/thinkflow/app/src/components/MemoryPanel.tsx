import { useState, useRef, useCallback, useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Typography from "@tiptap/extension-typography"
import { useMemoryStore } from "../store/memoryStore"
import type { MemoryEntry, MemoryFolderType } from "../types"

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

function getFolderColor(type: string): string {
  return FOLDER_COLOR_MAP[type] ?? "#6b7280"
}

// 从 HTML 提取纯文本预览（用于侧边栏条目预览）
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
}

function FolderChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0deg)", flexShrink: 0 }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export function MemoryPanel({ onClose }: MemoryPanelProps) {
  const folders = useMemoryStore((s) => s.folders)
  const entries = useMemoryStore((s) => s.entries)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const updateEntry = useMemoryStore((s) => s.updateEntry)
  const removeEntry = useMemoryStore((s) => s.removeEntry)
  const addFolder = useMemoryStore((s) => s.addFolder)
  const removeFolder = useMemoryStore((s) => s.removeFolder)
  const renameFolder = useMemoryStore((s) => s.renameFolder)
  const searchEntries = useMemoryStore((s) => s.searchEntries)
  const importFromJson = useMemoryStore((s) => s.importFromJson)
  const exportToJson = useMemoryStore((s) => s.exportToJson)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set(folders.map((f) => f.id)),
  )
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editFolderId, setEditFolderId] = useState("")
  const [query, setQuery] = useState("")
  const [copied, setCopied] = useState(false)

  // 分类重命名状态
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingValue, setRenamingValue] = useState("")
  // 新建分类表单
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renamingInputRef = useRef<HTMLInputElement>(null)

  // 当前选中的条目对象
  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null

  // 搜索时展示的列表
  const displayEntries: MemoryEntry[] = query ? searchEntries(query) : entries

  // ─── TipTap 编辑器 ─────────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "开始写作...（# 标题、**粗体**、- 列表、> 引用）",
      }),
      Typography,
    ],
    content: "",
    editorProps: {
      attributes: { class: "tf-memory-tiptap-content" },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML()
      // 空内容时存空字符串，避免存 "<p></p>"
      handleContentChange(html === "<p></p>" ? "" : html)
    },
  })

  // 切换条目时同步编辑器内容
  useEffect(() => {
    if (!editor) return
    const target = selectedEntry?.content ?? ""
    // 避免循环更新：只在 HTML 内容真正不同时才设置
    if (editor.getHTML() !== target) {
      editor.commands.setContent(target ? target : "")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, selectedId])

  // ─── 条目操作 ──────────────────────────────────────────────────────────────

  // 切换到新条目时同步编辑状态
  const selectEntry = useCallback(
    (entry: MemoryEntry) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      setSelectedId(entry.id)
      setEditTitle(entry.title)
      setEditContent(entry.content)
      setEditFolderId(entry.folderId)
    },
    [],
  )

  // 自动保存 debounce
  const scheduleAutoSave = useCallback(
    (id: string, title: string, content: string, folderId: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        updateEntry(id, { title, content, folderId })
      }, 500)
    },
    [updateEntry],
  )

  const handleTitleChange = (v: string) => {
    setEditTitle(v)
    if (selectedId) scheduleAutoSave(selectedId, v, editContent, editFolderId)
  }

  const handleContentChange = (v: string) => {
    setEditContent(v)
    if (selectedId) scheduleAutoSave(selectedId, editTitle, v, editFolderId)
  }

  const handleFolderChange = (fid: string) => {
    setEditFolderId(fid)
    if (selectedId) {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      updateEntry(selectedId, { title: editTitle, content: editContent, folderId: fid })
    }
  }

  // 折叠/展开分类
  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      next.has(folderId) ? next.delete(folderId) : next.add(folderId)
      return next
    })
  }

  // 新建记忆
  const handleNew = (targetFolderId?: string) => {
    const folderId = targetFolderId ?? selectedEntry?.folderId ?? folders[0]?.id ?? "folder-material"
    const id = addEntry({ folderId, title: "新记忆", content: "" })
    const created = { id, folderId, title: "新记忆", content: "", tags: [], createdAt: Date.now(), updatedAt: Date.now() }
    selectEntry(created)
    setExpandedFolders((prev) => new Set([...prev, folderId]))
    // 聚焦标题
    setTimeout(() => {
      const el = document.getElementById("tf-memory-title-input") as HTMLTextAreaElement | null
      if (el) { el.focus(); el.select() }
    }, 50)
  }

  // ─── 分类管理 ─────────────────────────────────────────────────────────────

  const handleAddFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const id = addFolder("other" as MemoryFolderType, name)
    setExpandedFolders((prev) => new Set([...prev, id]))
    setNewFolderName("")
    setShowNewFolder(false)
  }

  const startRenameFolder = (id: string, currentName: string) => {
    setRenamingFolderId(id)
    setRenamingValue(currentName)
    setTimeout(() => renamingInputRef.current?.select(), 30)
  }

  const commitRenameFolder = () => {
    if (renamingFolderId && renamingValue.trim()) {
      renameFolder(renamingFolderId, renamingValue.trim())
    }
    setRenamingFolderId(null)
  }

  const handleDeleteFolder = (id: string) => {
    const count = entries.filter((e) => e.folderId === id).length
    if (count > 0 && !confirm(`该分类下有 ${count} 条记忆，删除后将一并清除，确认吗？`)) return
    if (selectedEntry?.folderId === id) setSelectedId(null)
    removeFolder(id)
  }

  // 删除当前条目
  const handleDelete = () => {
    if (!selectedId) return
    const idx = displayEntries.findIndex((e) => e.id === selectedId)
    removeEntry(selectedId)
    const remaining = entries.filter((e) => e.id !== selectedId)
    const next = remaining[idx] ?? remaining[idx - 1] ?? remaining[0] ?? null
    if (next) selectEntry(next)
    else setSelectedId(null)
  }

  // 复制正文（纯文本）
  const handleCopy = () => {
    if (!editContent) return
    const plain = editor ? editor.getText({ blockSeparator: "\n" }) : stripHtml(editContent)
    navigator.clipboard.writeText(plain)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 导出/导入
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
        try { importFromJson(ev.target?.result as string) }
        catch { alert("导入失败：文件格式不正确") }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const getFolder = (folderId: string) => folders.find((f) => f.id === folderId)

  return (
    <div className="tf-memory-panel">
      {/* 顶部工具栏 */}
      <div className="tf-memory-panel__header">
        <span className="tf-memory-panel__title">记忆</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
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
          <button className="tf-btn tf-btn-ghost" style={{ padding: "5px 10px" }} onClick={onClose} title="返回画布">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 两栏主区域 */}
      <div className="tf-memory-notion">
        {/* 左栏：导航列表 */}
        <div className="tf-memory-notion__sidebar">
          {/* 搜索框 */}
          <div className="tf-memory-notion__sidebar-header">
            <input
              className="tf-input"
              placeholder="搜索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, padding: "4px 8px", fontSize: 12 }}
            />
          </div>

          {/* 条目列表（分组） */}
          <div className="tf-memory-notion__list">
            {query ? (
              // 搜索模式：平铺显示
              displayEntries.length === 0 ? (
                <div style={{ padding: "var(--space-4) var(--space-3)", fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
                  未找到匹配
                </div>
              ) : (
                displayEntries.map((entry) => {
                  const folder = getFolder(entry.folderId)
                  const color = getFolderColor(folder?.type ?? "other")
                  return (
                    <div
                      key={entry.id}
                      className={`tf-memory-notion__item${selectedId === entry.id ? " active" : ""}`}
                      style={{ "--item-color": color } as React.CSSProperties}
                      onClick={() => selectEntry(entry)}
                    >
                      <div className="tf-memory-notion__item-title">{entry.title || "无标题"}</div>
                      <div className="tf-memory-notion__item-preview">{stripHtml(entry.content) || "空内容"}</div>
                      <button
                        className="tf-memory-item-del"
                        title="删除"
                        onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); if (selectedId === entry.id) setSelectedId(null) }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )
                })
              )
            ) : (
              // 正常模式：按分类分组
              <>
                {folders.map((folder) => {
                  const folderEntries = entries.filter((e) => e.folderId === folder.id)
                  const color = getFolderColor(folder.type)
                  const isOpen = expandedFolders.has(folder.id)
                  const isRenaming = renamingFolderId === folder.id
                  return (
                    <div key={folder.id}>
                      <div
                        className="tf-memory-notion__folder-header"
                        style={{ color: isOpen ? color : undefined }}
                        onClick={() => !isRenaming && toggleFolder(folder.id)}
                      >
                        <FolderChevron open={isOpen} />
                        {isRenaming ? (
                          <input
                            ref={renamingInputRef}
                            className="tf-memory-folder-rename"
                            value={renamingValue}
                            onChange={(e) => setRenamingValue(e.target.value)}
                            onBlur={commitRenameFolder}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRenameFolder()
                              if (e.key === "Escape") setRenamingFolderId(null)
                              e.stopPropagation()
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ flex: 1 }}>{folder.name}</span>
                        )}
                        {/* 固定显示：条目数 + 新建；重命名/删除 hover 显示 */}
                        <div className="tf-memory-folder-actions" onClick={(e) => e.stopPropagation()}>
                          <span className="tf-memory-folder-count">{folderEntries.length}</span>
                          <button title="新建记忆" onClick={() => handleNew(folder.id)}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                          <button className="tf-memory-folder-rename-btn" title="重命名" onClick={() => startRenameFolder(folder.id, folder.name)}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          {!folder.isDefault && (
                            <button className="tf-memory-folder-del-btn" title="删除分类" onClick={() => handleDeleteFolder(folder.id)}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      {isOpen && folderEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`tf-memory-notion__item${selectedId === entry.id ? " active" : ""}`}
                          style={{ "--item-color": color } as React.CSSProperties}
                          onClick={() => selectEntry(entry)}
                        >
                          <div className="tf-memory-notion__item-title">{entry.title || "无标题"}</div>
                          <div className="tf-memory-notion__item-preview">{stripHtml(entry.content) || "空内容"}</div>
                          <button
                            className="tf-memory-item-del"
                            title="删除"
                            onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); if (selectedId === entry.id) setSelectedId(null) }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {isOpen && folderEntries.length === 0 && (
                        <div style={{ padding: "var(--space-1) var(--space-5)", fontSize: 11, color: "var(--text-muted)" }}>
                          暂无记忆
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* 新建分类按钮 & 表单 */}
                {showNewFolder ? (
                  <div className="tf-memory-new-folder-form">
                    <input
                      className="tf-memory-folder-rename"
                      placeholder="分类名称..."
                      value={newFolderName}
                      autoFocus
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddFolder()
                        if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName("") }
                      }}
                    />
                    <div style={{ display: "flex", gap: "var(--space-1)", marginTop: "var(--space-1)" }}>
                      <button className="tf-btn tf-btn-primary" style={{ flex: 1, fontSize: 11, padding: "3px 0" }} onClick={handleAddFolder}>确认</button>
                      <button className="tf-btn tf-btn-ghost" style={{ flex: 1, fontSize: 11, padding: "3px 0" }} onClick={() => { setShowNewFolder(false); setNewFolderName("") }}>取消</button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="tf-memory-add-folder-btn"
                    onClick={() => setShowNewFolder(true)}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    新建分类
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 右栏：编辑器 */}
        <div className="tf-memory-notion__editor">
          {!selectedEntry ? (
            <div className="tf-memory-notion__empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.2 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="12" y2="17" />
              </svg>
              <span>选择一条记忆，或点击「＋」新建</span>
            </div>
          ) : (
            <>
              {/* 标题 + 右上角操作按钮 */}
              <div className="tf-memory-notion__title-row">
                <textarea
                  id="tf-memory-title-input"
                  className="tf-memory-notion__title-input"
                  value={editTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="无标题"
                  rows={1}
                  style={{ overflowY: "hidden" }}
                  onInput={(e) => {
                    const el = e.currentTarget
                    el.style.height = "auto"
                    el.style.height = `${el.scrollHeight}px`
                  }}
                />
                <div className="tf-memory-notion__editor-actions">
                  <button
                    className={`tf-btn tf-btn-ghost${copied ? " tf-copied" : ""}`}
                    style={{ padding: "4px 8px", fontSize: 11, gap: 4 }}
                    title="复制正文"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                    )}
                    {copied ? "已复制" : "复制"}
                  </button>
                  <button
                    className="tf-btn tf-btn-danger"
                    style={{ padding: "4px 8px", fontSize: 11 }}
                    title="删除"
                    onClick={handleDelete}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                    删除
                  </button>
                </div>
              </div>

              {/* 元信息：分类 + 字数 */}
              <div className="tf-memory-notion__meta">
                <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>分类</span>
                <select
                  className="tf-input"
                  value={editFolderId}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  style={{ fontSize: 12, padding: "2px 8px", flex: 1, maxWidth: 160 }}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                {selectedEntry.tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selectedEntry.tags.map((t) => (
                      <span key={t} className="tf-tag">{t}</span>
                    ))}
                  </div>
                )}
                {editContent.length > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                    {stripHtml(editContent).length} 字
                  </span>
                )}
              </div>

              {/* 正文：TipTap 富文本编辑器 */}
              <div className="tf-memory-tiptap-wrapper">
                <EditorContent editor={editor} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
