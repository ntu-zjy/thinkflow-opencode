import { NoteLogo } from "./logos"
import { registerCard } from "./registry"

registerCard({
  key: "note",
  label: "笔记",
  LogoComponent: NoteLogo,
  color: "#7a7a9a",
  darkColor: "#9a9aba",
  bgColor: "rgba(122,122,154,0.06)",
  borderColor: "rgba(122,122,154,0.25)",
  darkBgColor: "rgba(154,154,186,0.08)",
  darkBorderColor: "rgba(154,154,186,0.35)",
  defaultInstruction: (_fmt) =>
    `你是一位专业的知识整理助手，请根据输入内容，生成一篇结构清晰、适合长期查阅的正式笔记。

## 笔记结构
1. **标题**：简洁准确，反映核心主题
2. **摘要（TL;DR）**：3-5 句话概括要点，让读者 10 秒内了解全文价值
3. **核心内容**（分节，每节有 ### 标题）：
   - 按逻辑递进组织，而非时间顺序
   - 关键概念用**加粗**标注
   - 复杂关系用列表或表格呈现
4. **关键结论**：独立成节，条目化列出最重要的 3-5 条洞察
5. **延伸思考**（可选）：尚未解决的问题或值得深挖的方向

## 写作标准
- 语言精准，避免模糊词（"很多""一些""可能"需要具体化）
- 数据和来源明确（如果输入中有的话）
- 专业术语附上通俗解释
- 适合三个月后翻出来仍能快速理解
- 全文 500-1200 字，详略得当`,
  supportedFormats: ["text", "image_text", "auto"],
})
