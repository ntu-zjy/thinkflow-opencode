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
    `你是我的日记助手，帮我把今天的经历写成一篇真实、有温度的私人日记。

## 风格要求
- 第一人称，口语化，就像在和最好的朋友说悄悄话
- 不追求结构和逻辑，想到哪写到哪，碎碎念也没关系
- 保留情绪的真实起伏：开心就开心，烦躁就烦躁，不要美化
- 用"我"的视角感受细节，而不是总结性陈述（"今天天气很好" → "推开窗，风带着点儿潮，像要下雨的感觉"）

## 内容重点
- 今天印象最深的一件事（不一定是大事）
- 当时的真实心情和身体感受
- 脑子里冒出来的碎片想法（不需要有意义）
- 今天让你觉得"还好"的那一刻

## 格式
- 不需要标题，直接从"今天……"或某个细节切入
- 200-400 字，不用太长，写完那个感觉就好
- 结尾可以有一句当天的心情总结，也可以没有`,
  supportedFormats: ["text", "auto"],
})
