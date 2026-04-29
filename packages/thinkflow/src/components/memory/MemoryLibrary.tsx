import React, { useState } from "react"
import { Input, Button, Modal, Select, Tag } from "antd"
import { useMemoryStore } from "@/store"
import type { MemoryType, MemoryEntry } from "@/types/memory"
import "./MemoryLibrary.css"

const TYPE_LABELS: Record<MemoryType, { label: string; color: string }> = {
  persona: { label: "账号人设", color: "var(--tf-node-input)" },
  material: { label: "内容素材", color: "var(--tf-node-output)" },
  preference: { label: "用户偏好", color: "var(--tf-gold)" },
  output: { label: "历史输出", color: "var(--tf-accent)" },
}

export default function MemoryLibrary() {
  const folders = useMemoryStore((s) => s.folders)
  const addFolder = useMemoryStore((s) => s.addFolder)
  const deleteFolder = useMemoryStore((s) => s.deleteFolder)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const updateEntry = useMemoryStore((s) => s.updateEntry)
  const deleteEntry = useMemoryStore((s) => s.deleteEntry)
  const searchQuery = useMemoryStore((s) => s.searchQuery)
  const setSearch = useMemoryStore((s) => s.setSearch)
  const searchEntries = useMemoryStore((s) => s.searchEntries)

  const [activeFolderId, setActiveFolderId] = useState<string | null>(
    folders[0]?.id ?? null,
  )
  const [entryModal, setEntryModal] = useState<{
    open: boolean
    mode: "create" | "edit"
    folderId: string
    entry?: MemoryEntry
  }>({ open: false, mode: "create", folderId: "" })
  const [entryForm, setEntryForm] = useState({ title: "", content: "", tags: "" })
  const [newFolderModal, setNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderType, setNewFolderType] = useState<MemoryType>("material")

  const activeFolder = folders.find((f) => f.id === activeFolderId)
  const displayEntries = searchQuery
    ? searchEntries(searchQuery)
    : activeFolder?.entries ?? []

  function openCreateEntry(folderId: string) {
    setEntryForm({ title: "", content: "", tags: "" })
    setEntryModal({ open: true, mode: "create", folderId })
  }

  function openEditEntry(folderId: string, entry: MemoryEntry) {
    setEntryForm({ title: entry.title, content: entry.content, tags: entry.tags.join(", ") })
    setEntryModal({ open: true, mode: "edit", folderId, entry })
  }

  function saveEntry() {
    const tags = entryForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
    const folder = folders.find((f) => f.id === entryModal.folderId)
    if (!folder) return

    if (entryModal.mode === "create") {
      addEntry(entryModal.folderId, {
        title: entryForm.title,
        content: entryForm.content,
        type: folder.type,
        tags,
      })
    } else if (entryModal.entry) {
      updateEntry(entryModal.folderId, entryModal.entry.id, {
        title: entryForm.title,
        content: entryForm.content,
        tags,
      })
    }
    setEntryModal({ ...entryModal, open: false })
  }

  function createFolder() {
    if (!newFolderName.trim()) return
    addFolder(newFolderName.trim(), newFolderType)
    setNewFolderModal(false)
    setNewFolderName("")
  }

  return (
    <div className="tf-memory">
      <aside className="tf-memory__sidebar">
        <div className="tf-memory__search">
          <Input
            prefix={<SearchIcon />}
            placeholder="搜索记忆..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </div>

        <div className="tf-memory__folders">
          <div className="tf-memory__section-header">
            <span>文件夹</span>
            <button className="tf-icon-btn" onClick={() => setNewFolderModal(true)} title="新建文件夹">
              <PlusIcon />
            </button>
          </div>
          {folders.map((f) => {
            const meta = TYPE_LABELS[f.type]
            return (
              <button
                key={f.id}
                className={`tf-memory__folder-item ${f.id === activeFolderId ? "tf-memory__folder-item--active" : ""}`}
                onClick={() => { setActiveFolderId(f.id); setSearch("") }}
              >
                <span className="tf-memory__folder-dot" style={{ background: meta.color }} />
                <span className="tf-memory__folder-name">{f.name}</span>
                <span className="tf-memory__folder-count">{f.entries.length}</span>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="tf-memory__main">
        <div className="tf-memory__header">
          <h2 className="tf-memory__title">
            {searchQuery ? `搜索: "${searchQuery}"` : (activeFolder?.name ?? "记忆库")}
          </h2>
          {activeFolder && !searchQuery && (
            <Button
              type="primary"
              size="small"
              onClick={() => openCreateEntry(activeFolder.id)}
            >
              + 新建记忆
            </Button>
          )}
        </div>

        <div className="tf-memory__entries">
          {!displayEntries.length && (
            <div className="tf-memory__empty">
              <EmptyIcon />
              <p>{searchQuery ? "没有匹配的记忆" : "还没有记忆，点击「新建记忆」开始添加"}</p>
            </div>
          )}
          {displayEntries.map((entry) => {
            const folderId = folders.find((f) => f.entries.some((e) => e.id === entry.id))?.id
            return (
              <div key={entry.id} className="tf-memory__entry">
                <div className="tf-memory__entry-header">
                  <h3 className="tf-memory__entry-title">{entry.title}</h3>
                  <div className="tf-memory__entry-actions">
                    {folderId && (
                      <>
                        <button className="tf-icon-btn" onClick={() => folderId && openEditEntry(folderId, entry)}>
                          <EditIcon />
                        </button>
                        <button className="tf-icon-btn tf-icon-btn--danger" onClick={() => folderId && deleteEntry(folderId, entry.id)}>
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <p className="tf-memory__entry-content">{entry.content}</p>
                <div className="tf-memory__entry-tags">
                  {entry.tags.map((t) => (
                    <span key={t} className="tf-memory__tag">{t}</span>
                  ))}
                  <span className="tf-memory__entry-date">
                    {new Date(entry.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Entry modal */}
      <Modal
        title={entryModal.mode === "create" ? "新建记忆" : "编辑记忆"}
        open={entryModal.open}
        onCancel={() => setEntryModal({ ...entryModal, open: false })}
        onOk={saveEntry}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: !entryForm.title.trim() }}
      >
        <div className="tf-memory__form">
          <Input
            placeholder="记忆标题"
            value={entryForm.title}
            onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
          />
          <Input.TextArea
            placeholder="记忆内容..."
            value={entryForm.content}
            onChange={(e) => setEntryForm({ ...entryForm, content: e.target.value })}
            rows={6}
          />
          <Input
            placeholder="标签，用逗号分隔（如：写作风格, 口头禅）"
            value={entryForm.tags}
            onChange={(e) => setEntryForm({ ...entryForm, tags: e.target.value })}
          />
        </div>
      </Modal>

      {/* New folder modal */}
      <Modal
        title="新建文件夹"
        open={newFolderModal}
        onCancel={() => setNewFolderModal(false)}
        onOk={createFolder}
        okText="创建"
        cancelText="取消"
      >
        <div className="tf-memory__form">
          <Input
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <Select
            value={newFolderType}
            onChange={(v: MemoryType) => setNewFolderType(v)}
            style={{ width: "100%" }}
            options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
      </Modal>
    </div>
  )
}

function SearchIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function EditIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}
function EmptyIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg>
}
