import { WechatLogo } from "./logos"
import { registerCard } from "./registry"

registerCard({
  key: "wechat",
  label: "公众号",
  LogoComponent: WechatLogo,
  color: "#6b9b7a",
  darkColor: "#8bb99a",
  bgColor: "rgba(107,155,122,0.06)",
  borderColor: "rgba(107,155,122,0.25)",
  darkBgColor: "rgba(139,185,154,0.08)",
  darkBorderColor: "rgba(139,185,154,0.35)",
  defaultInstruction: (fmt) => {
    if (fmt === "text") return "请生成适合微信公众号的图文推送，标题吸引人，排版适合移动端阅读，语言亲切。"
    return "请生成适合微信公众号的图文推送，标题吸引人，排版适合移动端阅读，语言亲切。"
  },
  supportedFormats: ["text", "image_text", "auto"],
})
