import { describe, it, expect } from "vitest"
import { markdownToHtml } from "../utils/markdownToHtml"

describe("markdownToHtml", () => {
  it("空字符串返回空字符串", () => {
    expect(markdownToHtml("")).toBe("")
    expect(markdownToHtml("   ")).toBe("")
  })

  it("已是 HTML 则原样返回", () => {
    const html = "<p>hello</p>"
    expect(markdownToHtml(html)).toBe(html)
  })

  it("标题转换", () => {
    expect(markdownToHtml("# 大标题")).toContain("<h1>大标题</h1>")
    expect(markdownToHtml("## 二级")).toContain("<h2>二级</h2>")
    expect(markdownToHtml("### 三级")).toContain("<h3>三级</h3>")
  })

  it("粗体和斜体", () => {
    expect(markdownToHtml("**粗体**")).toContain("<strong>粗体</strong>")
    expect(markdownToHtml("*斜体*")).toContain("<em>斜体</em>")
  })

  it("无序列表", () => {
    const result = markdownToHtml("- 项目1\n- 项目2")
    expect(result).toContain("<ul>")
    expect(result).toContain("<li>项目1</li>")
    expect(result).toContain("<li>项目2</li>")
  })

  it("有序列表", () => {
    const result = markdownToHtml("1. 第一\n2. 第二")
    expect(result).toContain("<ol>")
    expect(result).toContain("<li>第一</li>")
    expect(result).toContain("<li>第二</li>")
  })

  it("引用块", () => {
    expect(markdownToHtml("> 引用内容")).toContain("<blockquote>")
    expect(markdownToHtml("> 引用内容")).toContain("引用内容")
  })

  it("代码块", () => {
    const result = markdownToHtml("```js\nconst x = 1\n```")
    expect(result).toContain("<pre>")
    expect(result).toContain("<code")
    expect(result).toContain("const x = 1")
  })

  it("行内代码", () => {
    expect(markdownToHtml("`code`")).toContain("<code>code</code>")
  })

  it("普通段落", () => {
    expect(markdownToHtml("普通文字")).toContain("<p>普通文字</p>")
  })

  it("分割线", () => {
    expect(markdownToHtml("---")).toContain("<hr>")
  })

  it("复合内容：知乎文章格式", () => {
    const md = `# 文章标题\n\n## 引言\n\n这是一段**重要**内容。\n\n- 第一点\n- 第二点`
    const result = markdownToHtml(md)
    expect(result).toContain("<h1>文章标题</h1>")
    expect(result).toContain("<h2>引言</h2>")
    expect(result).toContain("<strong>重要</strong>")
    expect(result).toContain("<ul>")
  })
})
