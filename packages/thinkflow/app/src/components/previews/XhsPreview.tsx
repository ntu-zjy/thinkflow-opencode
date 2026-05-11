import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { PreviewProps } from "../../cards/registry"
import type { ImageAsset } from "../../types"

function ImgOrSkeleton({ img, alt, style }: { img: ImageAsset; alt: string; style?: React.CSSProperties }) {
  if (img.loading) {
    return (
      <div style={{ ...style, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, background: "var(--bg-surface-2)", color: "var(--text-tertiary)", fontSize: 11 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        生图中...
      </div>
    )
  }
  return <img src={img.url} alt={alt} style={style} />
}

function extractTags(content: string): { text: string; tags: string[] } {
  const tags: string[] = []
  const text = content.replace(/#([一-龥\w]+)/g, (_, tag) => {
    tags.push(tag)
    return ""
  }).trim()
  return { text, tags }
}

export function XhsPreview({ content, images, contentType, showPreview }: PreviewProps) {
  const hasImage = contentType === "image" && images && images.length > 0
  const { text, tags } = extractTags(content)

  return (
    <div className="tf-xhs-card">
      {/* 图片区（如有） */}
      {hasImage && (
        <div className="tf-xhs-card__images">
          {images!.length === 1 ? (
            <ImgOrSkeleton
              img={images![0]}
              alt={images![0].title ?? "小红书封面"}
              style={{ width: "100%", borderRadius: "var(--radius-sm)", display: "block" }}
            />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-1)" }}>
              {images!.map((img, idx) => (
                <div key={img.id} style={{ position: "relative", paddingBottom: "133%", overflow: "hidden", borderRadius: "var(--radius-sm)", background: "var(--bg-surface-2)" }}>
                  <ImgOrSkeleton
                    img={img}
                    alt={img.title ?? `图${idx + 1}`}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  {idx === 0 && (
                    <span style={{ position: "absolute", top: 4, left: 4, background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 4 }}>封面</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 正文 */}
      <div className="tf-xhs-card__body">
        {showPreview ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text || content}</ReactMarkdown>
        ) : (
          <pre style={{ fontFamily: "var(--font-code)", fontSize: 11, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
            {content}
          </pre>
        )}
      </div>

      {/* 标签行 */}
      {tags.length > 0 && (
        <div className="tf-xhs-card__tags">
          {tags.map((tag) => (
            <span key={tag} className="tf-xhs-tag">#{tag}</span>
          ))}
        </div>
      )}
    </div>
  )
}
