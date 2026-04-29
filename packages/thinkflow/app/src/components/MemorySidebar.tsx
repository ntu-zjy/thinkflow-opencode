import { useState, useRef } from "react"
import { Brain, X, Plus, Search, ChevronRight, ChevronDown, Download, Upload } from "lucide-react"
import useMemoryStore from "../store/memoryStore"
import type { MemoryFolder, MemoryFolderType } from "../types"

type Props = { onClose: () => void }

type InlineForm = {
  folderId: string
  title: string
  content: string
  tags: string
}

const EMPTY_FORM: InlineForm = { folderId: "", title: "", content: "", tags: "" }

const FOLDER_ORDER: MemoryFolderType[] = ["persona", "material", "preference", "output"]

export default function MemorySidebar({ onClose }: Props) {
  const { folders, entries, addEntry, deleteEntry, exportData, importData, searchEntries } =
    useMemoryStore()

  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState<InlineForm>(EMPTY_FORM)
  const fileRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim() ? searchEntries(query) : entries

  const toggleFolder = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }))

  const openForm = (folderId: string) =>
    setForm({ folderId, title: "", content: "", tags: "" })

  const closeForm = () => setForm(EMPTY_FORM)

  const submitForm = () => {
    if (!form.title.trim() || !form.content.trim()) return
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    addEntry({ folderId: form.folderId, title: form.title.trim(), content: form.content.trim(), tags })
    closeForm()
  }

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "thinkflow-memory.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) importData(text)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Sort folders by canonical order
  const sortedFolders = [...folders].sort(
    (a, b) => FOLDER_ORDER.indexOf(a.type) - FOLDER_ORDER.indexOf(b.type)
  )

  return (
    <aside
      style={{
        width: 320,
        minWidth: 320,
        height: "100%",
        background: "var(--color-bg-surface)",
        borderRight: "1px solid var(--color-border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Brain size={18} color="var(--color-accent)" />
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: "var(--color-text-primary)",
              letterSpacing: "0.02em",
            }}
          >
            记忆库
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            color: "var(--color-text-secondary)",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--color-bg-base)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 8,
            padding: "6px 10px",
          }}
        >
          <Search size={14} color="var(--color-text-secondary)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索记忆..."
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--color-text-primary)",
            }}
          />
        </div>
      </div>

      {/* Folder list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
        {sortedFolders.map((folder: MemoryFolder) => {
          const folderEntries = filtered.filter((e) => e.folderId === folder.id)
          const isCollapsed = !!collapsed[folder.id]
          const isFormOpen = form.folderId === folder.id

          return (
            <div key={folder.id}>
              {/* Folder header */}
              <button
                onClick={() => toggleFolder(folder.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                <span style={{ flex: 1, textAlign: "left" }}>{folder.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    background: "var(--color-bg-base)",
                    borderRadius: 10,
                    padding: "1px 6px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {folderEntries.length}
                </span>
              </button>

              {!isCollapsed && (
                <div style={{ paddingBottom: 4 }}>
                  {/* Entries */}
                  {folderEntries.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        margin: "2px 12px",
                        padding: "8px 10px",
                        background: "var(--color-bg-base)",
                        borderRadius: 8,
                        border: "1px solid var(--color-border-subtle)",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            marginBottom: 3,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {entry.title}
                        </div>
                        {entry.tags.length > 0 && (
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: 10,
                                  padding: "1px 6px",
                                  borderRadius: 10,
                                  background: "var(--color-accent-subtle, rgba(99,102,241,0.12))",
                                  color: "var(--color-accent)",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            lineHeight: 1.5,
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {entry.content.slice(0, 80)}
                          {entry.content.length > 80 ? "…" : ""}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          borderRadius: 4,
                          color: "var(--color-text-secondary)",
                          flexShrink: 0,
                          opacity: 0.6,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Inline add form */}
                  {isFormOpen ? (
                    <div
                      style={{
                        margin: "6px 12px",
                        padding: "10px",
                        background: "var(--color-bg-base)",
                        borderRadius: 8,
                        border: "1px solid var(--color-accent, #6366f1)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <input
                        autoFocus
                        placeholder="标题"
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        style={{
                          background: "var(--color-bg-surface)",
                          border: "1px solid var(--color-border-subtle)",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 13,
                          color: "var(--color-text-primary)",
                          outline: "none",
                        }}
                      />
                      <textarea
                        placeholder="内容"
                        value={form.content}
                        onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                        rows={3}
                        style={{
                          background: "var(--color-bg-surface)",
                          border: "1px solid var(--color-border-subtle)",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 12,
                          color: "var(--color-text-primary)",
                          outline: "none",
                          resize: "vertical",
                          fontFamily: "inherit",
                        }}
                      />
                      <input
                        placeholder="标签（逗号分隔）"
                        value={form.tags}
                        onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                        style={{
                          background: "var(--color-bg-surface)",
                          border: "1px solid var(--color-border-subtle)",
                          borderRadius: 6,
                          padding: "5px 8px",
                          fontSize: 12,
                          color: "var(--color-text-primary)",
                          outline: "none",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={closeForm}
                          style={{
                            background: "none",
                            border: "1px solid var(--color-border-subtle)",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          取消
                        </button>
                        <button
                          onClick={submitForm}
                          style={{
                            background: "var(--color-accent, #6366f1)",
                            border: "none",
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 12,
                            cursor: "pointer",
                            color: "#fff",
                            fontWeight: 600,
                          }}
                        >
                          确认
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => openForm(folder.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        margin: "4px 12px 2px",
                        padding: "5px 8px",
                        background: "none",
                        border: "1px dashed var(--color-border-subtle)",
                        borderRadius: 6,
                        cursor: "pointer",
                        color: "var(--color-text-secondary)",
                        fontSize: 12,
                        width: "calc(100% - 24px)",
                      }}
                    >
                      <Plus size={12} />
                      新建
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 12px",
          borderTop: "1px solid var(--color-border-subtle)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleExport}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 0",
            background: "var(--color-bg-base)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          <Download size={13} />
          导出 JSON
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 0",
            background: "var(--color-bg-base)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          <Upload size={13} />
          导入 JSON
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={handleImport}
        />
      </div>
    </aside>
  )
}
