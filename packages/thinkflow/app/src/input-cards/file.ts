import { FileLogo } from "./logos"
import { registerInputCard } from "./registry"

registerInputCard({
  key: "file",
  label: "文件输入",
  shortLabel: "文件",
  LogoComponent: FileLogo,
  color: "#b47828",           // 思流暖棕色
  darkColor: "#f59e0b",
  bgColor: "rgba(180,120,40,0.06)",
  borderColor: "rgba(180,120,40,0.25)",
  darkBgColor: "rgba(245,158,11,0.08)",
  darkBorderColor: "rgba(245,158,11,0.35)",
  placeholder: "拖拽文件或点击选择",
  description: "支持 PDF、Word、PPT、HTML、图片、文本文件",
})
