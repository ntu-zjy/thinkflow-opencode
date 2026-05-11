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
    const base = `你是一位经验丰富的微信公众号编辑。请根据输入内容，创作一篇适合微信公众号推送的优质文章。

## 标题规范
- 主标题不超过 25 字，必须在用户打开前传递清晰价值
- 常用结构：数字型（"5个方法..."）/ 悬念型（"为什么...？"）/ 对比型（"...和...的区别"）
- 禁止标题党和夸大其词

## 文章结构
1. **开头（150字内）**：用一个真实场景、数据或反常识结论迅速切入，不要自我介绍
2. **主体（分 3-5 个小节）**：每节有小标题（加粗），内容具体有据
3. **结尾（100字内）**：总结 + 行动引导（思考/留言/转发理由）

## 排版规范
- 移动端优先：每段不超过 4 行，段落间有空行
- 重点内容用**加粗**突出
- 适当使用项目符号（-）列举要点
- 全文 800-1500 字为佳

## 语言风格
- 亲切自然，有温度，不是论文腔
- 多用"你"而非"大家/读者"，制造一对一感
- 数据和案例要具体，不说"很多人""大量研究"等模糊表述`

    if (fmt === "image_text") {
      return base + `\n\n## 封面图要求\n**在文章正文之前，单独输出封面图提示词（单独占一行）：**\n[IMG_PROMPT_COVER: 封面图英文描述：16:9横版构图，与文章主题高度呼应。描述具体的主体对象、背景场景、光线方向与质感、色调搭配、道具细节等，描述越具体生图质量越高]\n\n然后输出正文内容。`
    }
    return base
  },
  supportedFormats: ["text", "image_text", "auto"],
})
