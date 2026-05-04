/**
 * 将 markdown 字符串转换为 TipTap 可渲染的 HTML。
 * 处理 GFM 常用语法：标题、粗体/斜体、代码块、行内代码、引用、列表、分割线、换行。
 */
export function markdownToHtml(md: string): string {
  if (!md || !md.trim()) return ""

  // 检测是否已经是 HTML
  if (md.trimStart().startsWith("<")) return md

  let html = md

  // 代码块（优先处理，避免内部内容被其他规则干扰）
  html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.replace(/\n$/, ""))
    return `<pre><code${lang ? ` class="language-${lang.trim()}"` : ""}>${escaped}</code></pre>`
  })

  // 按行处理
  const lines = html.split("\n")
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 跳过已转换的代码块
    if (line.startsWith("<pre>")) {
      result.push(line)
      i++
      continue
    }

    // 标题
    const h3 = line.match(/^###\s+(.+)/)
    if (h3) { result.push(`<h3>${inlineFormat(h3[1])}</h3>`); i++; continue }
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) { result.push(`<h2>${inlineFormat(h2[1])}</h2>`); i++; continue }
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) { result.push(`<h1>${inlineFormat(h1[1])}</h1>`); i++; continue }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      result.push("<hr>")
      i++
      continue
    }

    // 引用
    if (line.startsWith(">")) {
      const content = line.replace(/^>\s?/, "")
      result.push(`<blockquote><p>${inlineFormat(content)}</p></blockquote>`)
      i++
      continue
    }

    // 无序列表（收集连续的列表项）
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(`<li>${inlineFormat(lines[i].replace(/^[-*+]\s/, ""))}</li>`)
        i++
      }
      result.push(`<ul>${items.join("")}</ul>`)
      continue
    }

    // 有序列表（收集连续的列表项）
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inlineFormat(lines[i].replace(/^\d+\.\s/, ""))}</li>`)
        i++
      }
      result.push(`<ol>${items.join("")}</ol>`)
      continue
    }

    // 空行 → 段落分隔
    if (line.trim() === "") {
      result.push("")
      i++
      continue
    }

    // 普通段落
    result.push(`<p>${inlineFormat(line)}</p>`)
    i++
  }

  // 合并相邻空行，避免多余间距
  return result.filter((l, idx) => !(l === "" && result[idx - 1] === "")).join("\n")
}

function inlineFormat(text: string): string {
  // 行内代码
  text = text.replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
  // 粗斜体（***）
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
  // 粗体（**）
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  // 斜体（*）
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>")
  // 删除线（~~）
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>")
  return text
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
