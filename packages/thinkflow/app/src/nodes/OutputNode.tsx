import { useState, useCallback } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { OutputNodeType, OutputPlatform, OutputNodeData, ContentFormat, MatrixResult, VideoScript } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useMemoryStore } from "../store/memoryStore"
import { OutputModal } from "../components/OutputModal"
import { downloadSingleText, downloadAsZip } from "../utils/download"
import { markdownToHtml } from "../utils/markdownToHtml"

const PLATFORMS: { key: OutputPlatform; label: string; desc: string }[] = [
  { key: "zhihu", label: "知乎", desc: "长文章格式" },
  { key: "wechat", label: "公众号", desc: "图文推送格式" },
  { key: "diary", label: "日记", desc: "口语化流水记录" },
  { key: "note", label: "笔记", desc: "正式结构化记录" },
  { key: "xiaohongshu", label: "小红书", desc: "图文/图片格式" },
  { key: "video", label: "视频", desc: "短视频脚本+MP4" },
]

// 背景色渐变预览
const GRADIENT_PREVIEW: Record<string, string> = {
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)": "#667eea",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)": "#f093fb",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)": "#4facfe",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)": "#43e97b",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)": "#fa709a",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)": "#a18cd1",
}

const FORMAT_OPTIONS: { key: ContentFormat; label: string; title: string }[] = [
  { key: "text",       label: "纯文本", title: "只输出文字内容" },
  { key: "image_text", label: "图文",   title: "生成图片 + 文案" },
  { key: "auto",       label: "自主",   title: "由 Agent 根据平台特性自主决定" },
]

export function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const addEntry = useMemoryStore((s) => s.addEntry)

  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeMatrixIdx, setActiveMatrixIdx] = useState(0)

  // 视频生成状态
  const [videoGenStatus, setVideoGenStatus] = useState<"idle" | "generating" | "done" | "error">("idle")
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoMessage, setVideoMessage] = useState("")
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // 矩阵结果
  const matrixResults: MatrixResult[] = (data.matrixResults as MatrixResult[] | undefined) ?? []
  const isMatrix = matrixResults.length > 1
  const activeResult = isMatrix ? matrixResults[activeMatrixIdx] : null

  const displayContent = activeResult ? activeResult.content : data.content
  const displayImages = activeResult ? activeResult.images : data.images
  const displayContentType = activeResult ? activeResult.contentType : data.contentType
  const hasImage = displayContentType === "image" && displayImages && displayImages.length > 0
  const hasContent = !!(displayContent || hasImage)

  // 切换人设时同步展示内容
  const switchMatrix = (idx: number) => {
    setActiveMatrixIdx(idx)
  }

  const doCopy = useCallback(() => {
    if (!displayContent) return
    navigator.clipboard.writeText(displayContent)
  }, [displayContent])

  const doSave = useCallback(() => {
    if (!displayContent) return
    const platformName = PLATFORMS.find((p) => p.key === data.platform)?.label ?? "输出"
    const personaSuffix = activeResult ? ` · ${activeResult.personaLabel}` : ""
    addEntry({
      folderId: "folder-output",
      title: `${platformName}${personaSuffix} · ${new Date().toLocaleDateString("zh-CN")}`,
      content: markdownToHtml(displayContent),
      tags: [data.platform],
    })
  }, [displayContent, data.platform, activeResult, addEntry])

  const doDownload = useCallback(() => {
    const platformLabel = PLATFORMS.find((p) => p.key === data.platform)?.label ?? "输出"
    const personaSuffix = activeResult ? `-${activeResult.personaLabel}` : ""
    const date = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")
    if (hasImage && displayImages?.[0]) {
      downloadAsZip(
        [{ filename: `${platformLabel}${personaSuffix}-${date}.txt`, content: displayContent ?? "", imageBase64: displayImages[0].url }],
        `${platformLabel}${personaSuffix}-${date}.zip`,
      )
    } else if (displayContent) {
      downloadSingleText(displayContent, `${platformLabel}${personaSuffix}-${date}.txt`)
    }
  }, [displayContent, displayImages, hasImage, data.platform, activeResult])

  const doDownloadAll = useCallback(() => {
    if (!isMatrix || matrixResults.length === 0) return
    const platformLabel = PLATFORMS.find((p) => p.key === data.platform)?.label ?? "输出"
    const date = new Date().toLocaleDateString("zh-CN").replace(/\//g, "-")
    const items = matrixResults.map((r) => ({
      filename: `${platformLabel}-${r.personaLabel || `人设${r.slotIndex + 1}`}-${date}.txt`,
      content: r.content,
      imageBase64: r.images?.[0]?.url,
    }))
    downloadAsZip(items, `${platformLabel}-矩阵全部-${date}.zip`)
  }, [matrixResults, isMatrix, data.platform])

  // 解析视频脚本 JSON（兼容 AI 用 ```json 包裹的情况）
  const videoScript: VideoScript | null = (() => {
    if (data.platform !== "video" || !displayContent) return null
    try {
      // 去掉可能的 markdown 代码块包裹
      const cleaned = displayContent
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim()
      return JSON.parse(cleaned) as VideoScript
    } catch { return null }
  })()

  const doGenerateVideo = useCallback(async () => {
    if (!videoScript) return
    setVideoGenStatus("generating")
    setVideoProgress(0)
    setVideoMessage("准备中...")
    setVideoUrl(null)

    const videoId = `${id}-${Date.now()}`
    try {
      const resp = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, title: videoScript.title, slides: videoScript.slides }),
      })
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const evt = JSON.parse(line.slice(6)) as { type: string; progress?: number; message?: string; videoUrl?: string }
          if (evt.type === "step" || evt.type === "done") {
            setVideoProgress(evt.progress ?? 0)
            setVideoMessage(evt.message ?? "")
            if (evt.type === "done" && evt.videoUrl) {
              setVideoUrl(evt.videoUrl)
              setVideoGenStatus("done")
            }
          } else if (evt.type === "error") {
            throw new Error(evt.message ?? "未知错误")
          }
        }
      }
    } catch (err) {
      setVideoGenStatus("error")
      setVideoMessage(err instanceof Error ? err.message : "生成失败")
    }
  }, [videoScript, id])

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

  return (
    <div className={`tf-node${selected ? " selected" : ""}`} style={{ minWidth: 320 }}>
      <Handle type="target" position={Position.Left} />

      <div className="tf-node__header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
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
        {/* 矩阵模式人设切换 — 紧凑下拉选择器 */}
        {isMatrix && (
          <div className="tf-matrix-selector">
            <span className="tf-matrix-selector-label">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              人设
            </span>
            <button
              className="tf-matrix-nav"
              onClick={() => switchMatrix((activeMatrixIdx - 1 + matrixResults.length) % matrixResults.length)}
              title="上一个人设"
              disabled={matrixResults.length <= 1}
            >‹</button>
            <select
              className="tf-matrix-select"
              value={activeMatrixIdx}
              onChange={(e) => switchMatrix(Number(e.target.value))}
            >
              {matrixResults.map((r, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}. {r.personaLabel || `人设 ${idx + 1}`}
                </option>
              ))}
            </select>
            <button
              className="tf-matrix-nav"
              onClick={() => switchMatrix((activeMatrixIdx + 1) % matrixResults.length)}
              title="下一个人设"
              disabled={matrixResults.length <= 1}
            >›</button>
            <span className="tf-matrix-counter">{activeMatrixIdx + 1}/{matrixResults.length}</span>
          </div>
        )}

        {/* 平台选择 — 3+3 网格 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-1)" }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              className={`tf-btn${data.platform === p.key ? " tf-btn-primary" : " tf-btn-ghost"}`}
              style={{ padding: "5px 8px", fontSize: 11 }}
              onClick={() => updateNodeData<OutputNodeData>(id, { platform: p.key })}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* 创作形式选择 — 视频平台不显示 */}
        {data.platform !== "video" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-1)" }}>
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f.key}
                className={`tf-btn${(data.contentFormat ?? "auto") === f.key ? " tf-btn-primary" : " tf-btn-ghost"}`}
                style={{ padding: "4px 6px", fontSize: 10 }}
                onClick={() => updateNodeData<OutputNodeData>(id, { contentFormat: f.key })}
                title={f.title}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* 字数 / 切换 / 放大 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {data.platform === "video"
              ? videoScript ? `${videoScript.slides.length} 个分镜` : displayContent ? "解析中..." : "等待生成..."
              : displayContent ? `${displayContent.length} 字` : hasImage ? "图片已生成" : "等待生成..."}
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
          {data.platform === "video" && videoScript ? (
            /* 视频脚本分镜预览 */
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: "var(--space-1)" }}>
                {videoScript.title}
              </div>
              {videoScript.slides.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      background: s.background,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>{s.title}</span>
                  </div>
                  <div style={{ padding: "4px 8px", fontSize: 10, color: "var(--text-muted)" }}>
                    {s.voiceover}
                  </div>
                </div>
              ))}
            </div>
          ) : data.platform === "video" && displayContent ? (
            /* 视频平台有内容但解析失败，显示原文 */
            <pre style={{ fontFamily: "var(--font-code)", fontSize: 10, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
              {displayContent}
            </pre>
          ) : hasImage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {displayImages!.map((img) => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.title ?? "生成图片"}
                  style={{ maxWidth: "100%", borderRadius: "var(--radius-sm)", display: "block" }}
                />
              ))}
              {displayContent && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
              )}
            </div>
          ) : displayContent ? (
            showPreview ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            ) : (
              <pre style={{ fontFamily: "var(--font-code)", fontSize: 11, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
                {displayContent}
              </pre>
            )
          ) : (
            <span className="tf-preview-empty">内容将在 Agent 运行后显示...</span>
          )}
        </div>

        {/* 视频生成区域 */}
        {data.platform === "video" && videoScript && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {videoGenStatus === "generating" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{videoMessage}</span>
                  <span style={{ fontSize: 11, color: "var(--accent)" }}>{videoProgress}%</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "var(--accent)", width: `${videoProgress}%`, transition: "width 0.3s ease" }} />
                </div>
              </div>
            )}
            {videoGenStatus === "error" && (
              <div style={{ fontSize: 11, color: "var(--error, #e74c3c)", padding: "4px 0" }}>
                ✗ {videoMessage}
              </div>
            )}
            {videoGenStatus !== "generating" && (
              <div style={{ display: "flex", gap: "var(--space-1)" }}>
                <button
                  className="tf-btn tf-btn-primary"
                  style={{ flex: 1, fontSize: 11 }}
                  onClick={() => void doGenerateVideo()}
                >
                  {videoGenStatus === "done" ? "重新生成" : "生成视频"}
                </button>
                {videoGenStatus === "done" && videoUrl && (
                  <a
                    href={videoUrl}
                    download="thinkflow-video.mp4"
                    className="tf-btn tf-btn-ghost"
                    style={{ flex: 1, fontSize: 11, textAlign: "center", textDecoration: "none" }}
                  >
                    下载 MP4
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        {hasContent && data.platform !== "video" && (
          <>
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              {!hasImage && (
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
              <button className="tf-btn tf-btn-ghost" style={{ flex: 1 }} onClick={doDownload}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载
              </button>
            </div>
            {isMatrix && (
              <button className="tf-btn tf-btn-ghost" style={{ width: "100%", marginTop: "var(--space-1)" }} onClick={doDownloadAll}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载全部人设（ZIP）
              </button>
            )}
          </>
        )}
      </div>

      {showModal && (
        <OutputModal
          content={displayContent}
          images={displayImages}
          contentType={displayContentType}
          platform={data.platform}
          onClose={() => setShowModal(false)}
          doCopy={doCopy}
          doSave={doSave}
          doDownload={doDownload}
        />
      )}
    </div>
  )
}
