import { DiaryLogo } from "./logos"
import { registerCard } from "./registry"

registerCard({
  key: "diary",
  label: "日记",
  LogoComponent: DiaryLogo,
  color: "#a08060",
  darkColor: "#c0a080",
  bgColor: "rgba(160,128,96,0.06)",
  borderColor: "rgba(160,128,96,0.25)",
  darkBgColor: "rgba(192,160,128,0.08)",
  darkBorderColor: "rgba(192,160,128,0.35)",
  defaultInstruction: (_fmt) =>
    "请以第一人称口语化方式写日记，就像在和朋友聊天一样，记录今天发生的事情和感受，口吻随意自然，不追求逻辑结构，真实生动。",
  supportedFormats: ["text", "auto"],
})
