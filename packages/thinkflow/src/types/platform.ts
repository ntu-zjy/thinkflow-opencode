export interface PlatformFormat {
  id: string
  name: string
  description: string
  maxLength?: number
  supportsImages: boolean
  promptTemplate: string
}

export const PLATFORM_FORMATS: Record<string, PlatformFormat> = {
  xiaohongshu: {
    id: "xiaohongshu",
    name: "小红书",
    description: "图文笔记，适合生活方式内容",
    maxLength: 1000,
    supportsImages: true,
    promptTemplate: `请生成适合小红书平台的图文笔记内容：
- 标题要吸引眼球，可以用emoji
- 正文分段清晰，使用emoji点缀
- 结尾加上话题标签 #话题
- 语气亲切活泼，像朋友分享
- 字数控制在600-1000字`,
  },
  zhihu: {
    id: "zhihu",
    name: "知乎",
    description: "专业深度文章，适合知识分享",
    maxLength: 10000,
    supportsImages: true,
    promptTemplate: `请生成适合知乎平台的专业文章：
- 标题用问答或陈述句式
- 开门见山，先给出核心答案
- 论点有据，引用数据和案例
- 结构清晰，用标题分段
- 语气专业但不失亲和`,
  },
  wechat: {
    id: "wechat",
    name: "公众号",
    description: "深度长文，适合品牌内容",
    maxLength: 20000,
    supportsImages: true,
    promptTemplate: `请生成适合微信公众号的文章：
- 标题具有传播性，引发好奇
- 开头抓人，3行内抓住读者
- 故事性强，情感共鸣
- 段落简短，适合移动端阅读
- 结尾有行动号召`,
  },
  manhua: {
    id: "manhua",
    name: "漫剧剧本",
    description: "分镜脚本，适合短视频/漫画创作",
    maxLength: 5000,
    supportsImages: false,
    promptTemplate: `请生成漫剧/短视频分镜脚本：
- 分场景编号描述
- 包含台词、动作、表情
- 视觉描述清晰易绘制
- 节奏紧凑，每集3-5分钟
- 格式：【场景N】背景 | 人物 | 台词`,
  },
  raw: {
    id: "raw",
    name: "纯文本",
    description: "通用文本输出，不限格式",
    supportsImages: false,
    promptTemplate: "",
  },
}
