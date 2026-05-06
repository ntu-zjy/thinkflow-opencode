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
    "请生成一篇正式的结构化笔记，包含标题、摘要、主要内容（分点或分节）和总结，语言精准简洁，信息全面，适合日后查阅和复习。",
  supportedFormats: ["text", "image_text", "auto"],
})
