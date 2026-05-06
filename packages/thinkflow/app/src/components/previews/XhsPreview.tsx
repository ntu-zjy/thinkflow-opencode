import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { PreviewProps } from "../../cards/registry"

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
          {images!.map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt={img.title ?? "小红书图片"}
              style={{ width: "100%", borderRadius: "var(--radius-sm)", display: "block", marginBottom: "var(--space-2)" }}
            />
          ))}
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
