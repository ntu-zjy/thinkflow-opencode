import { FeedLogo } from "./logos"
import { registerInputCard } from "./registry"

registerInputCard({
  key: "feed",
  label: "信息流",
  shortLabel: "信息流",
  LogoComponent: FeedLogo,
  color: "#b47828",           // 思流暖棕色
  darkColor: "#f59e0b",
  bgColor: "rgba(180,120,40,0.06)",
  borderColor: "rgba(180,120,40,0.25)",
  darkBgColor: "rgba(245,158,11,0.08)",
  darkBorderColor: "rgba(245,158,11,0.35)",
  placeholder: "配置信息源",
  description: "从 RSS、API 或网页抓取最新内容",
})
