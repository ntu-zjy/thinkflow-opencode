import { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Copy, Database, BookOpen, MessageSquare, BookMarked } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { OutputNodeType, OutputPlatform } from "../types"
import useCanvasStore from "../store/canvasStore"
import useMemoryStore from "../store/memoryStore"

const PLATFORM_LIST: { value: OutputPlatform; label: string; icon: React.ReactNode }[] = [
  { value: "zhihu", label: "知乎", icon: <BookOpen size={12} /> },
  { value: "wechat", label: "公众号", icon: <MessageSquare size={12} /> },
  { value: "diary", label: "日记·笔记", icon: <BookMarked size={12} /> },
]

export default function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const platform = data.platform ?? "zhihu"

  function handleCopy() {
    if (!data.content) return
    navigator.clipboard.writeText(data.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  function handleSaveMemory() {
    if (!data.content) return
    addEntry({
      folderId: "output",
      title: `${PLATFORM_LIST.find((p) => p.value === platform)?.label ?? "输出"} — ${new Date().toLocaleDateString()}`,
      content: data.content,
      tags: [platform],
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  const nodeStyle: React.CSSProperties = {
    width: 260,
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

  const tabBarStyle: React.CSSProperties = {
    display: "flex",
    borderBottom: "1px solid var(--color-border-subtle)",
    padding: "0 8px",
    gap: 2,
  }

  const bodyStyle: React.CSSProperties = {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }

  const footerStyle: React.CSSProperties = {
    display: "flex",
    gap: 8,
    borderTop: "1px solid var(--color-border-subtle)",
    padding: "10px 14px",
  }

  const btnStyle: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    padding: "6px 0",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    fontSize: 12,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  }

  return (
    <div style={nodeStyle}>
      {/* Target handle — top center */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{ left: -5 }}
      />

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
          {PLATFORM_LIST.find((p) => p.value === platform)?.icon ?? <BookOpen size={13} />}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          输出
        </span>
      </div>

      {/* Platform tabs */}
      <div style={tabBarStyle}>
        {PLATFORM_LIST.map((p) => (
          <button
            key={p.value}
            onClick={() => updateNodeData(id, { platform: p.value })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 8px",
              fontSize: 11,
              fontFamily: "var(--font-body)",
              background: "none",
              border: "none",
              borderBottom: platform === p.value
                ? "2px solid var(--color-accent-primary)"
                : "2px solid transparent",
              color: platform === p.value
                ? "var(--color-accent-primary)"
                : "var(--color-text-muted)",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: -1,
            }}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      {/* Content preview */}
      <div style={bodyStyle}>
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            minHeight: 64,
          }}
        >
          {data.content ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--color-text-secondary)",
                lineHeight: 1.6,
              }}
              className="markdown-output"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.content}
              </ReactMarkdown>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              等待 Agent 输出内容...
            </span>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={footerStyle}>
        <button
          style={{
            ...btnStyle,
            color: copied ? "var(--color-status-done)" : "var(--color-text-secondary)",
            borderColor: copied ? "var(--color-status-done)" : "var(--color-border-default)",
          }}
          onClick={handleCopy}
          title="复制内容"
        >
          <Copy size={12} />
          {copied ? "已复制" : "复制"}
        </button>
        <button
          style={{
            ...btnStyle,
            color: saved ? "var(--color-status-done)" : "var(--color-text-secondary)",
            borderColor: saved ? "var(--color-status-done)" : "var(--color-border-default)",
          }}
          onClick={handleSaveMemory}
          title="保存到记忆库"
        >
          <Database size={12} />
          {saved ? "已保存" : "存入记忆"}
        </button>
      </div>
    </div>
  )
}
