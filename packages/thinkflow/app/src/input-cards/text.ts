import { TextLogo } from "./logos"
import { registerInputCard } from "./registry"

registerInputCard({
  key: "text",
  label: "文本输入",
  shortLabel: "文本",
  LogoComponent: TextLogo,
  color: "#b47828",           // 思流暖棕色
  darkColor: "#f59e0b",
  bgColor: "rgba(180,120,40,0.06)",
  borderColor: "rgba(180,120,40,0.25)",
  darkBgColor: "rgba(245,158,11,0.08)",
  darkBorderColor: "rgba(245,158,11,0.35)",
  placeholder: "输入文本内容...",
  description: "直接输入或粘贴文本内容",
})
