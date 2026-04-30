import { useState, useCallback } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { OutputNodeType, OutputPlatform, OutputNodeData } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useMemoryStore } from "../store/memoryStore"
import { OutputModal } from "../components/OutputModal"

const PLATFORMS: { key: OutputPlatform; label: string; desc: string }[] = [
  { key: "zhihu", label: "知乎", desc: "长文章格式" },
  { key: "wechat", label: "公众号", desc: "图文推送格式" },
  { key: "diary", label: "日记/笔记", desc: "个人记录格式" },
  { key: "xiaohongshu", label: "小红书", desc: "图文/图片格式" },
]

export function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const addEntry = useMemoryStore((s) => s.addEntry)

  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const doCopy = useCallback(() => {
    if (!data.content) return
    navigator.clipboard.writeText(data.content)
  }, [data.content])

  const doSave = useCallback(() => {
    if (!data.content) return
    const platformName = PLATFORMS.find((p) => p.key === data.platform)?.label ?? "输出"
    addEntry({
      folderId: "folder-output",
      title: `${platformName} · ${new Date().toLocaleDateString("zh-CN")}`,
      content: data.content,
      tags: [data.platform],
    })
  }, [data.content, data.platform, addEntry])

  const handleCopy = () => {
    doCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveToMemory = () => {
    doSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasImage = data.contentType === "image" && data.images && data.images.length > 0
  const hasContent = !!(data.content || hasImage)

  return (
    <div className={`tf-node${selected ? " selected" : ""}`} style={{ minWidth: 320 }}>
      <Handle type="target" position={Position.Left} />

      <div className="tf-node__header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="tf-node__title">输出</span>
        </div>
        <button className="tf-node__delete" onClick={() => removeNode(id)} title="删除节点">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="tf-node__body">
        {/* 平台选择 */}
        <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              className={`tf-btn${data.platform === p.key ? " tf-btn-primary" : " tf-btn-ghost"}`}
              style={{ flex: "1 1 calc(33% - 4px)", flexDirection: "column", gap: 2, padding: "4px 3px", minWidth: 54 }}
              onClick={() => updateNodeData<OutputNodeData>(id, { platform: p.key })}
              title={p.desc}
            >
              <span style={{ fontSize: 10 }}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* 字数 / 切换 / 放大 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {data.content ? `${data.content.length} 字` : hasImage ? "图片已生成" : "等待生成..."}
          </span>
          <div style={{ display: "flex", gap: "var(--space-1)" }}>
            {hasContent && (
              <button
                className="tf-btn tf-btn-ghost"
                style={{ padding: "2px 6px", fontSize: 10 }}
                onClick={() => setShowModal(true)}
                title="放大查看"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            )}
            {!hasImage && (
              <button
                className="tf-btn tf-btn-ghost"
                style={{ padding: "2px 8px", fontSize: 10 }}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "原文" : "预览"}
              </button>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div className="tf-preview">
          {hasImage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {data.images!.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.title ?? "生成图片"}
                  style={{ maxWidth: "100%", borderRadius: "var(--radius-sm)", display: "block" }}
                />
              ))}
              {data.content && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
              )}
            </div>
          ) : data.content ? (
            showPreview ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
            ) : (
              <pre style={{ fontFamily: "var(--font-code)", fontSize: 11, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
                {data.content}
              </pre>
            )
          ) : (
            <span className="tf-preview-empty">内容将在 Agent 运行后显示...</span>
          )}
        </div>

        {/* 操作按钮 */}
        {hasContent && (
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {hasImage && data.images?.[0] ? (
              <a
                href={data.images[0].url}
                download="thinkflow-image.png"
                className="tf-btn tf-btn-ghost"
                style={{ flex: 1, textDecoration: "none", textAlign: "center", justifyContent: "center" }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载图片
              </a>
            ) : (
              <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={handleCopy}>
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
            )}
            {data.content && (
              <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={handleSaveToMemory}>
                {saved ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    已保存
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    存为记忆
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <OutputModal
          content={data.content}
          images={data.images}
          contentType={data.contentType}
          platform={data.platform}
          onClose={() => setShowModal(false)}
          doCopy={doCopy}
          doSave={doSave}
        />
      )}
    </div>
  )
}
