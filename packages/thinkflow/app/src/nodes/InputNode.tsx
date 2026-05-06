import { useState, useCallback } from "react"

const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { InputNodeType, InputType, McpTool } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useMemoryStore } from "../store/memoryStore"
import { convertFileToMarkdown } from "../services/opencodeClient"


const INPUT_TABS: { key: InputType; label: string }[] = [
  { key: "text", label: "文本" },
  { key: "url", label: "链接" },
  { key: "file", label: "文件" },
  { key: "memory", label: "记忆" },
  { key: "feed", label: "信息流" },
]

const MCP_TOOLS: { key: McpTool; label: string; desc: string }[] = [
  { key: "fetch", label: "Fetch", desc: "抓取任意网页内容" },
  { key: "github", label: "GitHub", desc: "热榜 / Trending 数据" },
]

export function InputNode({ id, data, selected }: NodeProps<InputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const entries = useMemoryStore((s) => s.entries)
  const addMemoryEntry = useMemoryStore((s) => s.addEntry)

  const [isDragging, setIsDragging] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const handleSaveToMemory = () => {
    const content = data.value
    if (!content?.trim()) return
    const title = data.label && data.label !== "输入"
      ? data.label
      : content.slice(0, 30) + (content.length > 30 ? "…" : "")
    addMemoryEntry({ folderId: "folder-material", title, content })
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  const setType = (t: InputType) => updateNodeData(id, { inputType: t })
  const setValue = (v: string) => updateNodeData(id, { value: v })

  const readFile = useCallback(
    async (file: File) => {
      try {
        const markdown = await convertFileToMarkdown(file)
        updateNodeData(id, { value: markdown, label: file.name, fileConverted: true })
        setType("file")
      } catch {
        // 降级：readAsText（markitdown 不可用或转换失败）
        const reader = new FileReader()
        reader.onload = (ev) => {
          const content = ev.target?.result as string ?? ""
          updateNodeData(id, { value: content, label: file.name, fileConverted: false })
        }
        reader.readAsText(file)
        setType("file")
      }
    },
    [id],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  return (
    <div className={`tf-node${selected ? " selected" : ""}`}>
      <div className="tf-node__header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="tf-node__title">输入</span>
        </div>
        {data.value?.trim() && (
          <button
            className="tf-node__delete"
            style={{ color: savedFlash ? "var(--status-done)" : undefined, opacity: savedFlash ? 1 : undefined }}
            onClick={handleSaveToMemory}
            title="加入灵感"
          >
            {savedFlash ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            )}
          </button>
        )}
        <button className="tf-node__delete" onClick={() => removeNode(id)} title="删除节点">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="tf-node__body">
        {/* 类型切换 */}
        <div className="tf-tabs">
          {INPUT_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tf-tab${data.inputType === tab.key ? " active" : ""}`}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 文本输入 */}
        {data.inputType === "text" && (
          <textarea
            className="tf-textarea"
            placeholder="输入文本内容..."
            value={data.value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
          />
        )}

        {/* URL 输入 */}
        {data.inputType === "url" && (
          <input
            className="tf-input"
            type="url"
            placeholder="https://..."
            value={data.value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        {/* 文件拖拽 */}
        {data.inputType === "file" && (
          <div
            className={`tf-dropzone${isDragging ? " active" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input")
              input.type = "file"
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0]
                if (file) readFile(file)
              }
              input.click()
            }}
          >
            {data.value ? (
              <span style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{data.label !== "输入" ? data.label : "文件"} · {data.value.length} 字</span>
                {data.fileConverted === true && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "#10b98122", color: "#10b981", flexShrink: 0 }}>已转为 MD</span>
                )}
                {data.fileConverted === false && (
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: "var(--border)", color: "var(--text-muted)", flexShrink: 0 }}>原始文本</span>
                )}
              </span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 4, opacity: 0.4 }}>
                  <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                </svg>
                <div>拖拽文件或点击选择</div>
                <div style={{ fontSize: 10, marginTop: 4, color: "var(--text-muted)" }}>支持 PDF、Word、PPT、HTML、图片、文本文件</div>
              </>
            )}
          </div>
        )}

        {/* 记忆选择 */}
        {data.inputType === "memory" && (
          <select
            className="tf-select"
            value={data.memoryEntryId ?? ""}
            onChange={(e) => {
              const entry = entries.find((en) => en.id === e.target.value)
              updateNodeData(id, { memoryEntryId: e.target.value, value: stripHtml(entry?.content ?? "") })
            }}
          >
            <option value="">— 选择记忆 —</option>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.title}
              </option>
            ))}
          </select>
        )}

        {/* 信息流（MCP 工具） */}
        {data.inputType === "feed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {MCP_TOOLS.map((tool) => (
              <button
                key={tool.key}
                className={`tf-btn${data.mcpTool === tool.key ? " tf-btn-primary" : " tf-btn-ghost"}`}
                style={{ justifyContent: "flex-start" }}
                onClick={() => updateNodeData(id, { mcpTool: tool.key, value: tool.key })}
              >
                <span style={{ fontWeight: 600 }}>{tool.label}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{tool.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
