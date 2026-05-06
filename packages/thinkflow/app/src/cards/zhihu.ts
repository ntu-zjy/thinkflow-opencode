import { ZhihuLogo } from "./logos"
import { registerCard } from "./registry"

registerCard({
  key: "zhihu",
  label: "知乎",
  LogoComponent: ZhihuLogo,
  color: "#5a7a96",
  darkColor: "#7a9ab6",
  bgColor: "rgba(90,122,150,0.06)",
  borderColor: "rgba(90,122,150,0.25)",
  darkBgColor: "rgba(122,154,182,0.08)",
  darkBorderColor: "rgba(122,154,182,0.35)",
  defaultInstruction: (fmt) => {
    if (fmt === "text") return "请生成适合知乎平台的长文章，包含标题、引言和正文结构，内容深度且有洞察力。"
    return "请生成适合知乎平台的长文章，包含标题、引言和正文结构，内容深度且有洞察力。"
  },
  supportedFormats: ["text", "image_text", "auto"],
})
