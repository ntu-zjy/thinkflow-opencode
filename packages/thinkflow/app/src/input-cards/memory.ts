import { MemoryLogo } from "./logos"
import { registerInputCard } from "./registry"

registerInputCard({
  key: "memory",
  label: "记忆输入",
  shortLabel: "记忆",
  LogoComponent: MemoryLogo,
  color: "#b47828",           // 思流暖棕色
  darkColor: "#f59e0b",
  bgColor: "rgba(180,120,40,0.06)",
  borderColor: "rgba(180,120,40,0.25)",
  darkBgColor: "rgba(245,158,11,0.08)",
  darkBorderColor: "rgba(245,158,11,0.35)",
  placeholder: "从记忆库中选择",
  description: "选择已保存的记忆内容作为输入",
})
