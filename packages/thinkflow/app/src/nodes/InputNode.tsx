import { useState, useCallback, useMemo, useEffect, useRef } from "react"

const stripHtml = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { InputNodeType, InputType, McpTool } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useMemoryStore } from "../store/memoryStore"
import { convertFileToMarkdown } from "../services/opencodeClient"
import { getInputCard } from "../input-cards"
import { fetchFeed, formatFeedContent, intervalToMs, type FeedConfig } from "../services/feedService"

const MCP_TOOLS: { key: McpTool; label: string; desc: string }[] = [
  { key: "fetch", label: "Fetch", desc: "抓取任意网页内容" },
  { key: "github", label: "GitHub", desc: "热榜 / Trending 数据" },
]

// 刷新周期选项
const REFRESH_INTERVALS = [
  { value: "5min", label: "5分钟" },
  { value: "15min", label: "15分钟" },
  { value: "1hour", label: "1小时" },
  { value: "6hours", label: "6小时" },
  { value: "1day", label: "每天" },
]

// 信息流源类型
const FEED_TYPES = [
  { value: "rss", label: "RSS", icon: "📰" },
  { value: "github", label: "GitHub", icon: "🐙" },
  { value: "api", label: "API", icon: "🔌" },
]

export function InputNode({ id, data, selected }: NodeProps<InputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const entries = useMemoryStore((s) => s.entries)
  const addMemoryEntry = useMemoryStore((s) => s.addEntry)

  const [isDragging, setIsDragging] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [feedLoading, setFeedLoading] = useState(false)
  const feedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 获取当前输入类型的卡片定义
  const card = useMemo(() => {
    try {
      return getInputCard(data.inputType)
    } catch {
      return null
    }
  }, [data.inputType])

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

  // 动态样式
  const headerStyle = useMemo(() => {
    if (!card) return {}
    return {
      background: card.bgColor,
      borderColor: card.borderColor,
      borderBottom: `1px solid ${card.borderColor}`,
    }
  }, [card])

  const nodeStyle = useMemo(() => {
    if (!card) return {}
    return {
      borderColor: card.borderColor,
    }
  }, [card])

  // 渲染 Logo
  const renderLogo = () => {
    if (!card) return null
    const LogoComponent = card.LogoComponent
    return <LogoComponent size={14} />
  }

  // 信息流获取
  const handleFetchFeed = useCallback(async () => {
    if (!data.feedUrl && data.mcpTool !== "github") return

    setFeedLoading(true)
    try {
      const config: FeedConfig = {
        url: data.feedUrl || "",
        type: (data.feedType as FeedConfig["type"]) || "rss",
        refreshInterval: data.refreshInterval || "1hour",
        filters: {
          keywords: data.feedKeywords?.split(",").map((k: string) => k.trim()).filter(Boolean),
          maxItems: 5,
        },
      }

      const result = await fetchFeed(config)
      const content = formatFeedContent(result)
      updateNodeData(id, {
        value: content,
        label: `信息流 (${result.items.length}条)`,
        feedLastFetch: result.lastUpdated,
      })
    } catch (error) {
      console.error("Feed fetch error:", error)
    } finally {
      setFeedLoading(false)
    }
  }, [data.feedUrl, data.mcpTool, data.feedType, data.refreshInterval, data.feedKeywords, id, updateNodeData])

  // 信息流自动刷新
  useEffect(() => {
    if (data.inputType !== "feed") {
      if (feedTimerRef.current) {
        clearInterval(feedTimerRef.current)
        feedTimerRef.current = null
      }
      return
    }

    // 如果有配置且开启了自动刷新，设置定时器
    if (data.feedUrl && data.refreshInterval) {
      const ms = intervalToMs(data.refreshInterval)
      feedTimerRef.current = setInterval(() => {
        handleFetchFeed()
      }, ms)
    }

    return () => {
      if (feedTimerRef.current) {
        clearInterval(feedTimerRef.current)
        feedTimerRef.current = null
      }
    }
  }, [data.inputType, data.feedUrl, data.refreshInterval, handleFetchFeed])

  return (
    <div className={`tf-node${selected ? " selected" : ""}`} data-type="input" style={nodeStyle}>
      <div className="tf-node__header" style={{ ...headerStyle, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ color: card?.color || "var(--text-muted)" }}>
            {renderLogo()}
          </span>
          <span className="tf-node__title">{card?.shortLabel || "输入"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          {data.value?.trim() && (
            <button
              className="tf-node__delete tf-node__bookmark"
              style={{
                color: savedFlash ? "var(--status-done)" : undefined,
                background: savedFlash ? "rgba(34,197,94,0.12)" : undefined,
              }}
              onClick={handleSaveToMemory}
              title="加入灵感"
            >
              {savedFlash ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
      </div>

      <div className="tf-node__body">
        {/* 文本输入 */}
        {data.inputType === "text" && (
          <textarea
            className="tf-textarea"
            placeholder={card?.placeholder || "输入文本内容..."}
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
            placeholder={card?.placeholder || "https://..."}
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

        {/* 信息流（重构为配置化） */}
        {data.inputType === "feed" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {/* 信息源类型选择 */}
            <div style={{
              display: "flex",
              gap: "var(--space-1)",
              padding: "4px",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-md)",
            }}>
              {FEED_TYPES.map((type) => (
                <button
                  key={type.value}
                  className={`tf-btn${(data.feedType || "rss") === type.value ? " tf-btn-primary" : " tf-btn-ghost"}`}
                  style={{
                    justifyContent: "center",
                    flex: 1,
                    fontSize: 11,
                    padding: "4px 8px",
                  }}
                  onClick={() => updateNodeData(id, { feedType: type.value })}
                >
                  <span style={{ marginRight: 4 }}>{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>

            {/* 信息源 URL */}
            <input
              className="tf-input"
              type="url"
              placeholder={data.feedType === "github" ? "GitHub 用户名/仓库名 (留空则获取 Trending)" : "RSS 或 API 地址..."}
              value={data.feedUrl ?? ""}
              onChange={(e) => updateNodeData(id, { feedUrl: e.target.value })}
              style={{ fontSize: 12 }}
            />

            {/* 关键词过滤 */}
            <input
              className="tf-input"
              type="text"
              placeholder="关键词过滤 (用逗号分隔)..."
              value={data.feedKeywords ?? ""}
              onChange={(e) => updateNodeData(id, { feedKeywords: e.target.value })}
              style={{ fontSize: 12 }}
            />

            {/* 刷新频率 */}
            <select
              className="tf-select"
              value={data.refreshInterval ?? "1hour"}
              onChange={(e) => updateNodeData(id, { refreshInterval: e.target.value })}
              style={{ fontSize: 12 }}
            >
              {REFRESH_INTERVALS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  自动刷新: {opt.label}
                </option>
              ))}
            </select>

            {/* 获取按钮 */}
            <button
              className="tf-btn tf-btn-primary"
              onClick={handleFetchFeed}
              disabled={feedLoading || (!data.feedUrl && data.feedType !== "github")}
              style={{
                justifyContent: "center",
                fontSize: 12,
                padding: "6px 12px",
                marginTop: "var(--space-1)",
                opacity: feedLoading || (!data.feedUrl && data.feedType !== "github") ? 0.6 : 1,
              }}
            >
              {feedLoading ? (
                <>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite", marginRight: 6 }}>
                    ⟳
                  </span>
                  获取中...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {data.value ? "立即刷新" : "开始获取"}
                </>
              )}
            </button>

            {/* 状态显示 */}
            {(data.feedLastFetch || data.value) && (
              <div style={{
                fontSize: 10,
                color: "var(--text-muted)",
                textAlign: "center",
              }}>
                {data.feedLastFetch && `最后更新: ${new Date(data.feedLastFetch).toLocaleString("zh-CN")}`}
                {data.value && !data.feedLastFetch && `已获取 ${data.value.length} 字`}
              </div>
            )}

            {/* 内容预览 */}
            {data.value && (
              <div style={{
                marginTop: "var(--space-1)",
                padding: "var(--space-2)",
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-md)",
                fontSize: 11,
                color: "var(--text-secondary)",
                maxHeight: 100,
                overflow: "auto",
                border: "1px solid var(--border)",
              }}>
                <div style={{
                  fontWeight: 600,
                  marginBottom: 4,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  内容预览
                </div>
                <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5 }}>
                  {data.value.slice(0, 300)}{data.value.length > 300 ? "\n... (已截断)" : ""}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
