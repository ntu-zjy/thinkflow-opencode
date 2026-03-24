# MVP 产品方案：AI 内容创作团队平台

基于 OpenCode 的 Agent/SubAgent/Skill 架构，做一个拟人化的 Web 平台，聚焦内容创作领域。

---

## 产品理念

Agent + SubAgent 的模式像是找一个外包公司做事——有一个人和你对接（Primary Agent / 项目经理），这个对接人把任务拆解给他的员工（SubAgent / 团队成员）。

OpenCode 的 TUI 把这套协作过程压缩成了终端文本流。我们要做的是把它还原成一个**可视化的团队协作界面**——每个 agent 有身份、有头像、有工位，用户能看到整个团队在并行工作。

**聚焦方向**：内容创作——小红书图文、网文写作、视频分镜/剧本等。Agent 需要区分模态（纯文本、文生图、图文理解），并支持调用生图模型。

---

## 架构决策

### 不套壳 OpenCode，自研轻量引擎

**原因**：

| 因素         | 套壳 OpenCode                                          | 自研轻量引擎               |
| ------------ | ------------------------------------------------------ | -------------------------- |
| 多用户       | OpenCode 是单用户单实例，需要为每用户启动一个进程/容器 | 天然多租户                 |
| Agent 存储   | 读文件系统（markdown + json）                          | 读数据库，支持 Web UI 编辑 |
| Skill 来源   | 本地 SKILL.md                                          | 数据库 + Skill 市场        |
| 本地文件操作 | OpenCode 的核心场景                                    | 不是我们的场景             |
| 运维成本     | 高（每用户一个容器）                                   | 低（标准 Web 应用）        |

**借鉴 OpenCode 的架构设计模式，而不是它的代码。**

---

## 核心概念映射

| OpenCode 概念         | 平台概念            | 交互形式                             |
| --------------------- | ------------------- | ------------------------------------ |
| Primary Agent (build) | **项目经理 / 主编** | 主聊天窗口，和用户直接对话           |
| SubAgent (explore)    | **调研员 / 文案**   | 侧边弹出的独立工作面板，实时显示进度 |
| SubAgent (general)    | **设计师 / 写手**   | 独立面板，显示创作过程               |
| Custom Agent          | **团队成员**        | 有头像、名字、专长标签、模态标识     |
| Tool 执行             | **工作动态**        | 类似 Slack 的 activity feed          |
| Permission ask        | **审批请求**        | 类似钉钉的审批卡片                   |
| Session               | **项目/工单**       | 看板或列表视图                       |
| Compaction            | **周会纪要**        | 自动生成的项目阶段总结               |
| Skill                 | **技能手册**        | 团队共享的专项知识库                 |
| Bundle                | **团队模板**        | 预配置的 Agent+Skill 捆绑，一键启用  |

---

## 与 TUI 的关键交互差异

OpenCode TUI 里子 agent 的工作被折叠成一行：

```
[task] explore agent: 查看 auth 模块 ✓
  → 读取了 5 个文件
```

**我们的平台**让每个子 agent 有独立的工作面板，实时展示：

- 它正在做什么（写文案 / 生成图片 / 分析参考图）
- 它的思考过程（reasoning）
- 它的产出（文本、图片）
- 它的工作状态（空闲/工作中/已完成）
- 它的模态标识（纯文本 / 可生图 / 可读图）

这就是"看到团队成员在各自工位上干活"的感觉。

---

## 模态（Modality）设计

### 为什么模态是一等公民

内容创作场景下，Agent 不只是"文本进文本出"。用户定制 Agent 时需要直观感知这个 Agent "会什么"。

### Agent 的模态分类

| 模态类型 | 输入         | 输出         | 典型 Agent                              |
| -------- | ------------ | ------------ | --------------------------------------- |
| 纯文本   | text         | text         | 主编、校对、SEO 优化、大纲师、写手      |
| 文生图   | text         | text + image | 插画师、封面设计师、分镜草图师          |
| 图文理解 | text + image | text         | 竞品分析师、图片审核                    |
| 多模态   | text + image | text + image | 小红书图文创作（分析参考图 + 生成新图） |

### Agent 定义中的模态字段

```ts
{
  name: "designer",
  description: "ALWAYS use for cover images and content illustrations",
  mode: "subagent",
  modality: {
    input: ["text"],                      // 接受什么
    output: ["text", "image"],            // 能产出什么
  },
  capabilities: {
    imageGen: {                           // 生图能力配置
      provider: "nano-banana",
      model: "flux-schnell",
      enabled: true,
    },
  },
  prompt: "你是一个视觉设计师...",
}
```

### 用户定制时的体感

UI 上不是填一堆 JSON，而是可视化的选择：

```
[头像] 插画师
[模态] 输入：文字描述  输出：文字 + 图片  ← 可视化的标签/开关
[能力] ✅ 可调用 Nano Banana 生图        ← 开关
[专长] 小红书封面、文章配图、分镜草图     ← 标签
```

用户一眼能看出这个 Agent "会画画"。

---

## 生图能力设计

### 生图 = Agent 的固有能力，而非独立 Tool

在 OpenCode 里所有外部操作都是 Tool。但生图在内容创作场景里更像 Agent 的**固有能力**——插画师天然会画画，不需要"决定调不调工具"。

建议两层并存：

**第一层：Agent 执行层自动处理**

LLM 输出包含图片描述标记时，自动触发生图：

```ts
async function processOutput(agent: Agent, text: string) {
  if (agent.capabilities.imageGen?.enabled) {
    const prompts = extractImagePrompts(text) // 解析 <image>...</image> 标记
    for (const prompt of prompts) {
      const url = await generateImage(agent.capabilities.imageGen, prompt)
      yield { type: "image", url, prompt }
    }
  }
}
```

**第二层：也暴露为 Tool，让 LLM 主动决定生图时机**

```ts
const imageGenTool = defineTool("generate_image", {
  parameters: z.object({
    prompt: z.string(),
    style: z.enum(["realistic", "illustration", "cartoon"]).optional(),
    aspectRatio: z.enum(["1:1", "3:4", "4:3", "9:16", "16:9"]).optional(),
  }),
  async execute({ prompt, style, aspectRatio }, ctx) {
    const agent = await getAgent(ctx.agentId)
    if (!agent.capabilities.imageGen?.enabled) {
      return { output: "This agent does not have image generation capability." }
    }
    const url = await generateImage(agent.capabilities.imageGen, prompt)
    return { output: url, metadata: { type: "image", prompt } }
  },
})
```

---

## Skill 体系设计

### 没有本地文件操作，Skill 还有用吗

**完全有用。** Skill 的本质是"按需注入的结构化知识"。文件操作只是 LLM 的"手"，Skill 是 LLM "脑子里多了一本手册"。

在内容创作场景里，Skill 的价值甚至更大：

| OpenCode 的 Skill 用法        | 我们平台的 Skill 用法                            |
| ----------------------------- | ------------------------------------------------ |
| 加载编码规范，指导代码编写    | 加载小红书爆款公式，指导图文创作                 |
| 加载 API 文档，指导接口调用   | 加载分镜模板，指导视频脚本拆解                   |
| 加载 git 工作流，指导版本管理 | 加载平台规则（字数/标签/发布时间），指导内容合规 |

LLM 读完 Skill 之后的"手"不同——OpenCode 是写文件，我们是生成文本、调用生图、输出结构化内容。但 Skill 作为知识注入的作用完全一样。

### Skill 的三个层次

**第一层：平台规则 Skill**

每个内容平台有自己的规则，这是最基础的 Skill。

```markdown
---
name: xiaohongshu-rules
description: 小红书平台发布规则和内容规范
category: platform
---

# 小红书内容规范

## 标题

- 字数限制：20 字以内
- 必须包含 emoji
- 使用数字开头效果更好（如"3个方法"、"5分钟学会"）

## 正文

- 字数：300-800 字最佳
- 分段清晰，每段不超过 3 行
- 关键词自然融入，不堆砌

## 图片

- 首图决定点击率，必须精心设计
- 尺寸：3:4 竖版最佳（1080×1440）
- 张数：6-9 张效果最好

## 标签

- 数量：5-10 个
- 混合使用大词（#穿搭）和长尾词（#小个子秋冬穿搭）
```

**第二层：创作方法论 Skill**

"怎么写出好内容"的知识。

```markdown
---
name: viral-copywriting
description: 加载爆款文案写作公式和技巧
category: methodology
---

# 爆款文案公式

## AIDA 公式

- Attention（注意）：用悬念/冲突/数字抓眼球
- Interest（兴趣）：抛出痛点，引发共鸣
- Desire（渴望）：展示解决方案的效果
- Action（行动）：明确的 CTA

## 标题公式

- 数字 + 关键词 + 情绪词："5个让你月瘦10斤的习惯，第3个太绝了"
- 对比反差："月薪3千和月薪3万的人，早餐差距有多大"
- 提问式："为什么你的笔记没人看？可能忽略了这一点"

## 结构模板

- 总分总：观点→论据→总结
- 清单体：3/5/7/10 个要点
- 故事线：背景→冲突→转折→结局
```

**第三层：风格 Skill**

特定的创作风格、语气、人设。

```markdown
---
name: style-warm-sister
description: 温暖知心姐姐风格，适合情感/生活类内容
category: style
---

# 风格：温暖知心姐姐

## 语气

- 亲切，像和朋友聊天
- 用"姐妹"、"宝子"等称呼
- 适度使用 emoji，不过度

## 句式

- 短句为主，不写长难句
- 多用"你有没有过这种感觉..."引发共鸣
- 结尾用鼓励句："你值得更好的"

## 禁忌

- 不说教
- 不用"应该"、"必须"
- 不贬低任何人
```

### Skill 的三种加载方式

在 OpenCode 里 Skill 只有一种用法：LLM 调用 SkillTool。我们扩展为三种：

| 方式                      | 时机                           | token 消耗                  | 适用场景                 |
| ------------------------- | ------------------------------ | --------------------------- | ------------------------ |
| **预加载（preloaded）**   | Agent 启动时注入 system prompt | 每轮都消耗                  | 平台规则（必须时刻遵守） |
| **按需加载（available）** | LLM 调用 SkillTool 时注入      | 只在需要时消耗              | 方法论、风格（按需切换） |
| **Bundle 预配置**         | 用户启用 Bundle 时自动分配     | 由 preloaded/available 决定 | 用户无感，开箱即用       |

Agent 定义中对应的字段：

```ts
{
  name: "xiaohongshu-writer",
  skills: {
    preloaded: ["xiaohongshu-rules"],                        // 自动注入 system prompt
    available: ["viral-copywriting", "style-warm-sister"],    // LLM 可按需加载
  },
}
```

`xiaohongshu-rules` 每轮都在上下文里（agent 永远知道平台规则），方法论和风格 Skill 按需加载（省 token）。

---

## 轻量引擎设计

核心只有 4 个模块，总计约 400 行。

### 模块一：Agent Loop（~150 行）

```ts
async function loop(sessionId: string, agent: Agent) {
  while (true) {
    const messages = await loadMessages(sessionId)
    const system = buildSystemPrompt(agent) // 包含 preloaded skills
    const tools = resolveTools(agent)

    const result = await streamText({
      model: getModel(agent.model),
      system,
      messages,
      tools,
    })

    for await (const chunk of result.fullStream) {
      if (chunk.type === "tool-call") {
        const output = await executeTool(chunk, sessionId, agent)
        await saveToolResult(sessionId, chunk.toolCallId, output)
      }
      // 推送到前端（SSE）
      pushToClient(sessionId, chunk)
    }

    // 处理 agent 输出中的图片生成
    if (agent.capabilities.imageGen?.enabled) {
      await processImageGeneration(agent, result.text, sessionId)
    }

    if (result.finishReason !== "tool-calls") break
  }
}
```

`buildSystemPrompt(agent)` 自动注入 `agent.skills.preloaded` 的内容。

### 模块二：SubAgent 委派（~100 行）

```ts
const taskTool = defineTool("task", {
  parameters: z.object({
    prompt: z.string(),
    agent: z.string(),
  }),
  async execute({ prompt, agent: agentName }, ctx) {
    const subagent = await db.agent.findByName(agentName)

    const childSession = await db.session.create({
      parentId: ctx.sessionId,
      agent: subagent,
    })

    // 递归调用 loop
    const result = await loop(childSession.id, subagent)

    return {
      output: result.lastText,
      metadata: { sessionId: childSession.id },
    }
  },
})
```

### 模块三：Skill 加载（~50 行）

```ts
const skillTool = defineTool("skill", {
  parameters: z.object({ name: z.string() }),
  async execute({ name }) {
    const skill = await db.skill.findByName(name)
    if (!skill) return { output: `Skill "${name}" not found` }
    return { output: `## Skill: ${skill.name}\n\n${skill.content}` }
  },
})
```

描述中动态注入 `agent.skills.available` 列表，让 LLM 知道能按需加载哪些 Skill。

### 模块四：工具过滤（~80 行）

```ts
function resolveTools(agent: Agent) {
  const all = getAllTools()
  // 根据 agent capabilities 注入/移除生图工具
  if (!agent.capabilities.imageGen?.enabled) {
    delete all["generate_image"]
  }
  return Object.fromEntries(
    Object.entries(all).filter(([name]) => {
      const rule = agent.permissions[name] ?? agent.permissions["*"]
      return rule !== "deny"
    }),
  )
}
```

---

## 数据模型

```
User
  └── Workspace
        ├── Agent[]
        │     ├── name: string
        │     ├── description: string         ← TaskTool 用来告诉 LLM 何时调用
        │     ├── prompt: string              ← system prompt
        │     ├── model: string               ← "anthropic/claude-sonnet-4-5"
        │     ├── mode: "primary" | "subagent" | "all"
        │     ├── modality: {
        │     │     input: ("text" | "image")[]
        │     │     output: ("text" | "image")[]
        │     │   }
        │     ├── capabilities: {
        │     │     imageGen?: { provider, model, enabled }
        │     │   }
        │     ├── skills: {
        │     │     preloaded: string[]        ← 自动注入 system prompt
        │     │     available: string[]        ← LLM 可按需加载
        │     │   }
        │     ├── permissions: Record<string, "allow" | "deny">
        │     ├── avatar: string, color: string, tags: string[]
        │     └── steps: number
        │
        ├── Skill[]
        │     ├── name: string
        │     ├── description: string
        │     ├── category: "platform" | "methodology" | "style" | "custom"
        │     └── content: string (markdown)
        │
        ├── Bundle[]
        │     ├── name: string
        │     ├── description: string
        │     ├── category: string            ← "xiaohongshu" | "webnovel" | "video"
        │     ├── agents: Agent[]
        │     └── skills: Skill[]
        │
        └── Session[]
              ├── parentId?: string           ← 子 agent 会话链接父会话
              ├── agentId: string
              ├── title: string
              └── Message[]
                    ├── role: "user" | "assistant"
                    ├── agentId: string
                    └── Part[]
                          ├── type: "text"        → 文本内容
                          ├── type: "image"       → 生图结果
                          ├── type: "tool"        → 工具调用 + 结果
                          └── type: "reasoning"   → 推理过程
```

---

## Bundle 示例

### 小红书图文团队

```ts
{
  name: "小红书图文创作团队",
  category: "xiaohongshu",
  description: "策划 + 文案 + 设计，一站式产出小红书图文",
  agents: [
    {
      name: "planner",
      mode: "primary",
      modality: { input: ["text", "image"], output: ["text"] },
      description: "内容策划，分析选题和竞品，拆解任务给团队",
      prompt: "你是一个小红书内容策划...",
      skills: {
        preloaded: ["xiaohongshu-rules"],
        available: ["viral-copywriting"],
      },
    },
    {
      name: "copywriter",
      mode: "subagent",
      modality: { input: ["text"], output: ["text"] },
      description: "Use for writing titles, captions, and hashtags",
      prompt: "你是一个小红书文案专家...",
      skills: {
        preloaded: ["xiaohongshu-rules"],
        available: ["viral-copywriting", "style-warm-sister"],
      },
    },
    {
      name: "designer",
      mode: "subagent",
      modality: { input: ["text"], output: ["text", "image"] },
      description: "ALWAYS use for cover images and content illustrations",
      capabilities: {
        imageGen: { provider: "nano-banana", model: "flux-schnell", enabled: true },
      },
      prompt: "你是一个小红书视觉设计师...",
      skills: {
        preloaded: ["xiaohongshu-rules"],
      },
    },
  ],
  skills: [
    {
      name: "xiaohongshu-rules",
      category: "platform",
      description: "小红书平台发布规则和内容规范",
      content: "# 小红书内容规范\n\n## 标题\n- 字数限制：20字以内...",
    },
    {
      name: "viral-copywriting",
      category: "methodology",
      description: "加载爆款文案写作公式和技巧",
      content: "# 爆款文案公式\n\n## AIDA 公式\n...",
    },
    {
      name: "style-warm-sister",
      category: "style",
      description: "温暖知心姐姐风格，适合情感/生活类内容",
      content: "# 风格：温暖知心姐姐\n\n## 语气\n...",
    },
  ],
}
```

### 网文创作团队

```ts
{
  name: "网文创作团队",
  category: "webnovel",
  description: "主编 + 大纲师 + 写手 + 校审，体系化产出长篇小说",
  agents: [
    {
      name: "chief-editor",
      mode: "primary",
      modality: { input: ["text"], output: ["text"] },
      description: "管理创作流程，把控整体方向、节奏和质量",
      skills: { preloaded: ["webnovel-structure"] },
    },
    {
      name: "outline-writer",
      mode: "subagent",
      modality: { input: ["text"], output: ["text"] },
      description: "Use for story outlines, world-building, and character design",
      skills: { available: ["story-arc-formulas", "character-templates"] },
    },
    {
      name: "chapter-writer",
      mode: "subagent",
      modality: { input: ["text"], output: ["text"] },
      description: "Use for writing chapter drafts based on outlines",
      skills: { available: ["dialogue-techniques", "pacing-guide"] },
    },
    {
      name: "proofreader",
      mode: "subagent",
      modality: { input: ["text"], output: ["text"] },
      description: "Use for checking plot consistency, grammar, and pacing",
    },
  ],
  skills: [
    { name: "webnovel-structure", category: "methodology", ... },
    { name: "story-arc-formulas", category: "methodology", ... },
    { name: "character-templates", category: "methodology", ... },
    { name: "dialogue-techniques", category: "style", ... },
    { name: "pacing-guide", category: "methodology", ... },
  ],
}
```

### 视频分镜团队

```ts
{
  name: "视频分镜创作团队",
  category: "video",
  description: "编剧 + 分镜师 + 配文，产出可执行的视频脚本",
  agents: [
    {
      name: "director",
      mode: "primary",
      modality: { input: ["text", "image"], output: ["text"] },
      description: "理解需求，规划视频整体结构和节奏",
      skills: { preloaded: ["video-structure-rules"] },
    },
    {
      name: "screenwriter",
      mode: "subagent",
      modality: { input: ["text"], output: ["text"] },
      description: "Use for scripts, dialogues, and voiceover text",
    },
    {
      name: "storyboard-artist",
      mode: "subagent",
      modality: { input: ["text"], output: ["text", "image"] },
      description: "ALWAYS use for generating storyboard frames and scene illustrations",
      capabilities: {
        imageGen: { provider: "nano-banana", model: "flux-schnell", enabled: true },
      },
      skills: { preloaded: ["storyboard-format"] },
    },
  ],
  skills: [
    { name: "video-structure-rules", category: "platform", ... },
    { name: "storyboard-format", category: "methodology", ... },
  ],
}
```

---

## Agent 定义的关键字段设计

### description 的写法

description 直接决定 LLM 是否会自主调用该 SubAgent。借鉴 OpenCode 的经验：

```
✅ "ALWAYS use for cover images and content illustrations"
✅ "Use for writing titles, captions, and hashtags"
✅ "Specialized in plot consistency checking, never writes new content"

❌ "A helpful writer"              ← 太模糊，LLM 不知道何时用
❌ "Designer"                      ← 太短
❌ ""                              ← 空的 → LLM 不会主动调用
```

加 **ALWAYS** 前缀会让 LLM 更积极地调用。

### permissions 的设计模式

```ts
// 纯分析 agent（不生产内容）
{ "*": "allow", "generate_image": "deny" }

// 只能生图的 agent
{ "*": "deny", "generate_image": "allow", "skill": "allow" }

// 禁止嵌套调用
{ "task": "deny" }
```

---

## Provider 接入

初期只支持 2-3 个主流 LLM provider + 1 个生图 provider：

```ts
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"

// LLM provider
function getModel(config: string) {
  const [provider, model] = config.split("/")
  switch (provider) {
    case "anthropic":
      return createAnthropic()(model)
    case "openai":
      return createOpenAI()(model)
    case "google":
      return createGoogle()(model)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// 生图 provider（独立于 LLM）
async function generateImage(config: ImageGenConfig, prompt: string) {
  switch (config.provider) {
    case "nano-banana":
      return await nanoBanana.generate({ model: config.model, prompt })
    // 未来可扩展更多生图 provider
  }
}
```

用户在 Workspace 设置中配置自己的 API key（LLM 和生图分开配置）。

---

## 技术栈

```
前端：    Next.js 15 + React 19 + Tailwind CSS
后端：    Next.js API Routes（或独立 Hono server）
数据库：  PostgreSQL（Prisma ORM）
实时通信： Server-Sent Events
AI 调用：  Vercel AI SDK（ai + @ai-sdk/anthropic + @ai-sdk/openai）
生图：    Nano Banana API
部署：    Vercel + Supabase（或 Railway + Neon）
```

---

## 前端页面结构

```
/                        → 登录 / 注册
/dashboard               → 工作台（Bundle 市场 + 最近会话）
/workspace/:id           → 工作空间
  /agents                → Agent 管理（列表 + 创建/编辑）
  /skills                → Skill 管理
  /bundles               → Bundle 管理
  /chat/:sessionId       → 主聊天界面
```

### 主聊天界面布局

```
┌──────────────────────────────────────────────────────────┐
│ Header: 项目名 | 当前团队 | 模型选择                        │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│ 团队成员  │  主聊天区域                                     │
│ 列表      │  ┌───────────────────────────────────────┐   │
│          │  │ 策划🟢: 分析完选题，委派任务...           │   │
│ [策划]🟢 │  │                                       │   │
│  纯文本   │  │ → 委派给文案："写 5 个标题方案"         │   │
│          │  │ → 委派给设计："生成封面图"              │   │
│ [文案]🔵 │  │                                       │   │
│  纯文本   │  │ 策划🟢: 团队产出如下...                 │   │
│          │  │  标题：xxx                             │   │
│ [设计]🟠 │  │  封面：[图片预览]                       │   │
│  可生图✨ │  └───────────────────────────────────────┘   │
│          │                                               │
│          │  ┌───────────────────────────────────────┐   │
│          │  │ 输入框          [发送] [上传参考图]     │   │
│          │  └───────────────────────────────────────┘   │
├──────────┴───────────────────────────────────────────────┤
│ SubAgent 工作面板（点击团队成员展开）                         │
│ ┌────────────────────┬────────────────────┐              │
│ │ 文案 🔵            │ 设计 🟠 ✨         │              │
│ │ 正在写标题方案...    │ 正在生成封面...     │              │
│ │ > 加载 Skill:       │ > 调用 Nano Banana │              │
│ │   爆款文案公式       │ > 生成中... 60%    │              │
│ │ > 产出：            │ > 产出：           │              │
│ │   1. 标题方案 A     │   [图片预览]       │              │
│ │   2. 标题方案 B     │                    │              │
│ └────────────────────┴────────────────────┘              │
└──────────────────────────────────────────────────────────┘
```

---

## SubAgent 实时可见性的实现

利用 SSE 事件流区分父子会话：

```ts
// 前端状态管理
const [sessions, setSessions] = useState<Map<string, Session>>()
const [agentStatus, setAgentStatus] = useState<Map<string, "idle" | "working">>()

// 监听 SSE
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  if (data.type === "session.created" && data.parentId) {
    // 子 agent 会话创建 → 激活对应面板，显示状态指示灯
    setAgentStatus((prev) => prev.set(data.agentId, "working"))
  }

  if (data.type === "message.part.updated") {
    const session = sessions.get(data.sessionId)
    if (session?.parentId) {
      // 这是子 agent 的工作进度 → 更新对应面板
      updateSubAgentPanel(data)
    } else {
      // 这是主 agent 的输出 → 更新主聊天
      updateMainChat(data)
    }
  }

  if (data.type === "message.part.updated" && data.part.type === "image") {
    // 图片生成完成 → 在面板和主聊天中展示
    renderImagePreview(data)
  }
}
```

---

## MVP 范围

### 必须有

| 功能              | 说明                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| 注册登录          | 基础多租户                                                                |
| Workspace         | 项目/团队空间                                                             |
| Agent 编辑器      | 表单 UI：name、prompt、model、modality、capabilities、permissions、avatar |
| Skill 编辑器      | markdown 编辑器：name、description、category、content                     |
| Bundle 一键启用   | 选择模板，一键创建整个团队                                                |
| 主聊天界面        | 和 primary agent 对话                                                     |
| SubAgent 工作面板 | 子 agent 工作实时可见                                                     |
| 生图集成          | Nano Banana 生图，在面板和聊天中展示                                      |
| 3 个预定义 Bundle | 小红书图文 / 网文创作 / 视频分镜                                          |
| API Key 管理      | 用户配置 LLM key + 生图 key                                               |

### 不做（留给后续版本）

| 功能                         | 原因              |
| ---------------------------- | ----------------- |
| 本地文件操作                 | 不是我们的场景    |
| MCP 支持                     | 太复杂，以后加    |
| Context compaction           | 初期对话长度有限  |
| Permission ask 模式          | 先只有 allow/deny |
| Plugin 系统                  | Bundle 已覆盖     |
| Agent/Skill 市场（公开分享） | V2 再做           |
| 协同编辑（多人同时操作）     | V2 再做           |
| 多语言生图 prompt 翻译       | V2 再做           |

---

## 护城河思考

引擎部分（agent loop + tool + subagent）任何人都能做，约 400 行代码。

**真正的壁垒是生态**：

1. **高质量预定义 Bundle** — 开箱即用的创作团队模板，prompt 和 Skill 调优到位
2. **垂直领域 Skill 库** — 小红书规则、网文套路、分镜模板等深度内容
3. **Agent/Skill 市场** — 用户创建和分享，形成网络效应（V2）
4. **拟人化交互体验** — SubAgent 实时面板、模态标识、生图进度可视化

所以引擎尽量简单，把精力放在：

- Agent/Skill 编辑体验做到极致（尤其是模态和生图能力的可视化配置）
- Bundle 的预设 prompt 和 Skill 质量做到极致
- 团队协作 + 生图的可视化体验做到极致
