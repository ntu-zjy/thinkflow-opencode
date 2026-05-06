import { XhsPreview } from "../components/previews/XhsPreview"
import { XiaohongshuLogo } from "./logos"
import { registerCard } from "./registry"

registerCard({
  key: "xiaohongshu",
  label: "小红书",
  LogoComponent: XiaohongshuLogo,
  color: "#c06070",
  darkColor: "#d08090",
  bgColor: "rgba(192,96,112,0.06)",
  borderColor: "rgba(192,96,112,0.25)",
  darkBgColor: "rgba(208,128,144,0.08)",
  darkBorderColor: "rgba(208,128,144,0.35)",
  defaultInstruction: (fmt) => {
    if (fmt === "text") return "请为小红书平台生成活泼种草风格的文案，含话题标签 #xxx，不需要图片。"
    return `请为小红书平台生成内容，必须严格按以下格式输出：\n\n第一行：[IMG_PROMPT: <详细的英文图片描述，包含风格、色调、主体、构图，约 20 个单词>]\n空一行\n然后是中文正文文案（活泼种草风格，含话题标签 #xxx）\n\n示例：\n[IMG_PROMPT: Fresh pink cherry blossoms, soft bokeh background, morning light, aesthetic minimalist style, vertical composition]\n\n清晨遇见这朵花，治愈了整个春天 🌸\n\n#花卉 #春日 #小确幸`
  },
  supportedFormats: ["text", "image_text", "auto"],
  PreviewComponent: XhsPreview,
})
