import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { OutputPlatform, ImageAsset, VideoScript } from "../types"

const PLATFORM_LABELS: Record<OutputPlatform, string> = {
  zhihu: "知乎",
  wechat: "公众号",
  diary: "日记",
  note: "笔记",
  xiaohongshu: "小红书",
  video: "视频脚本",
}

interface OutputModalProps {
  content: string
  images?: ImageAsset[]
  contentType?: "text" | "image"
  platform: OutputPlatform
  onClose: () => void
  doCopy: () => void
  doSave: () => void
  doDownload?: () => void
}

export function OutputModal({ content, images, contentType, platform, onClose, doCopy, doSave, doDownload }: OutputModalProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

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
    doCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    doSave()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasImage = contentType === "image" && images && images.length > 0

  // 视频脚本 JSON 解析（兼容 AI 用 ```json 包裹的情况）
  const videoScript: VideoScript | null = platform === "video" && content
    ? (() => {
        try {
          const cleaned = content
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```\s*$/, "")
            .trim()
          return JSON.parse(cleaned) as VideoScript
        } catch { return null }
      })()
    : null

  const charCount = content.length

  return createPortal(
    <div
      className="tf-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="tf-modal">
        {/* 头部 */}
        <div className="tf-modal__header">
          <span className="tf-node__title">
            {PLATFORM_LABELS[platform] ?? platform} · 详细内容
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {!hasImage && !videoScript && (
              <div className="tf-tabs">
                <button
                  className={`tf-tab${showPreview ? " active" : ""}`}
                  onClick={() => setShowPreview(true)}
                >
                  预览
                </button>
                <button
                  className={`tf-tab${!showPreview ? " active" : ""}`}
                  onClick={() => setShowPreview(false)}
                >
                  原文
                </button>
              </div>
            )}
            {content && (
              <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={handleCopy}>
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
            {doDownload && (content || (contentType === "image" && images && images.length > 0)) && (
              <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={doDownload}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载
              </button>
            )}
            {content && (
              <button className="tf-btn tf-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={handleSave}>
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

        {/* 内容 */}
        <div className="tf-modal__body">
          {videoScript ? (
            /* 视频脚本：分镜卡片列表 */
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                {videoScript.title}
              </div>
              {videoScript.slides.map((s, idx) => (
                <div key={idx} style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{
                    background: s.background,
                    height: 72,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <span style={{ color: "white", fontSize: 20, fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
                      {s.title}
                    </span>
                  </div>
                  <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--text-secondary)" }}>
                    {s.voiceover}
                  </div>
                </div>
              ))}
            </div>
          ) : hasImage ? (
            <div>
              {images!.map((img) => (
                <img key={img.id} src={img.url} alt={img.title ?? "生成的图片"} />
              ))}
              {content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>}
            </div>
          ) : content ? (
            showPreview ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <pre>{content}</pre>
            )
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>暂无内容</span>
          )}
        </div>

        {/* 页脚 */}
        <div className="tf-modal__footer">
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {videoScript ? `${videoScript.slides.length} 个分镜` : charCount > 0 ? `${charCount} 字` : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>按 ESC 关闭</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
