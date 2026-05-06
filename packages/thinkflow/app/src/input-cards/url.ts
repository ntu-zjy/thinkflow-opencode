import { LinkLogo } from "./logos"
import { registerInputCard } from "./registry"

registerInputCard({
  key: "url",
  label: "链接输入",
  shortLabel: "链接",
  LogoComponent: LinkLogo,
  color: "#b47828",           // 思流暖棕色
  darkColor: "#f59e0b",
  bgColor: "rgba(180,120,40,0.06)",
  borderColor: "rgba(180,120,40,0.25)",
  darkBgColor: "rgba(245,158,11,0.08)",
  darkBorderColor: "rgba(245,158,11,0.35)",
  placeholder: "https://...",
  description: "输入网址链接，Agent 将自动抓取内容",
})
