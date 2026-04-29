import { useState, useRef } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { FileText, Link, File, Brain, Rss, ChevronDown } from "lucide-react"
import type { InputNodeType, InputType } from "../types"
import useCanvasStore from "../store/canvasStore"

const TAB_LIST: { value: InputType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "文本", icon: <FileText size={12} /> },
  { value: "url", label: "URL", icon: <Link size={12} /> },
  { value: "file", label: "文件", icon: <File size={12} /> },
  { value: "memory", label: "记忆", icon: <Brain size={12} /> },
  { value: "feed", label: "信息流", icon: <Rss size={12} /> },
]

export default function InputNode({ id, data, selected }: NodeProps<InputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeTab = data.inputType ?? "text"

  function setTab(tab: InputType) {
    updateNodeData(id, { inputType: tab })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) updateNodeData(id, { value: file.name })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) updateNodeData(id, { value: file.name })
  }

  const nodeStyle: React.CSSProperties = {
    width: 240,
    background: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: selected
      ? "var(--shadow-node), 0 0 0 2px var(--color-accent-primary)"
      : "var(--shadow-node)",
    border: selected
      ? "1px solid var(--color-accent-primary)"
      : "1px solid var(--color-border-subtle)",
    overflow: "hidden",
    fontFamily: "var(--font-body)",
    transition: "box-shadow 0.2s, border-color 0.2s",
  }

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px 8px",
    borderBottom: "1px solid var(--color-border-subtle)",
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-display)",
  }

  const tabBarStyle: React.CSSProperties = {
    display: "flex",
    borderBottom: "1px solid var(--color-border-subtle)",
    padding: "0 8px",
    gap: 2,
  }

  const bodyStyle: React.CSSProperties = {
    padding: "12px 14px 14px",
  }

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 72,
    maxHeight: 300,
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    padding: "8px 10px",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.5,
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    padding: "8px 10px",
    outline: "none",
  }

  const dropZoneStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 80,
    background: dragging ? "var(--color-accent-subtle)" : "var(--color-bg-elevated)",
    border: `1.5px dashed ${dragging ? "var(--color-accent-primary)" : "var(--color-border-default)"}`,
    borderRadius: "var(--radius-sm)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
    padding: "12px 10px",
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    padding: "8px 10px",
    outline: "none",
    cursor: "pointer",
  }

  return (
    <div style={nodeStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent-primary)",
          }}
        >
          <FileText size={13} />
        </div>
        <span style={titleStyle}>输入</span>
      </div>

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {TAB_LIST.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTab(tab.value)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.value
                ? "2px solid var(--color-accent-primary)"
                : "2px solid transparent",
              color: activeTab === tab.value
                ? "var(--color-accent-primary)"
                : "var(--color-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: -1,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        {activeTab === "text" && (
          <textarea
            style={textareaStyle}
            placeholder="输入文本内容..."
            value={data.value ?? ""}
            onChange={(e) => updateNodeData(id, { value: e.target.value })}
          />
        )}

        {activeTab === "url" && (
          <input
            type="url"
            style={inputStyle}
            placeholder="https://..."
            value={data.value ?? ""}
            onChange={(e) => updateNodeData(id, { value: e.target.value })}
          />
        )}

        {activeTab === "file" && (
          <>
            <div
              style={dropZoneStyle}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <File size={20} style={{ color: "var(--color-text-muted)" }} />
              {data.value ? (
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center" }}>
                  {data.value}
                </span>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    拖拽文件到此处
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    或点击选择文件
                  </span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </>
        )}

        {activeTab === "memory" && (
          <div
            style={{
              padding: "12px 10px",
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border-default)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              color: "var(--color-text-muted)",
              fontSize: 13,
            }}
            onClick={() => alert("记忆库选择功能待接入")}
          >
            <Brain size={14} style={{ color: "var(--color-accent-primary)", flexShrink: 0 }} />
            {data.memoryId
              ? <span style={{ color: "var(--color-text-secondary)" }}>已选择记忆 #{data.memoryId}</span>
              : <span>从记忆库选择</span>
            }
            <ChevronDown size={12} style={{ marginLeft: "auto" }} />
          </div>
        )}

        {activeTab === "feed" && (
          <select
            style={selectStyle}
            value={data.mcpTool ?? "fetch"}
            onChange={(e) => updateNodeData(id, { mcpTool: e.target.value as "fetch" | "github" })}
          >
            <option value="fetch">Fetch 工具</option>
            <option value="github">GitHub MCP 工具</option>
          </select>
        )}
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{ right: -5 }}
      />
    </div>
  )
}
