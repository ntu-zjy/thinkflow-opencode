# OpenCode 工具系统架构

本文档详细介绍 OpenCode 中工具（Tool）系统的实现原理和架构设计。

## 目录

1. [概述](#概述)
2. [核心接口](#核心接口)
3. [工具注册机制](#工具注册机制)
4. [权限系统](#权限系统)
5. [内置工具详解](#内置工具详解)
6. [输出截断机制](#输出截断机制)
7. [自定义工具开发](#自定义工具开发)
8. [插件系统集成](#插件系统集成)

---

## 概述

OpenCode 的工具系统是一个可扩展的框架，允许 AI Agent 执行各种操作：文件读写、命令执行、代码搜索等。整个系统围绕以下核心概念构建：

- **Tool.Info**: 工具定义接口
- **Tool.Context**: 工具执行上下文
- **ToolRegistry**: 工具注册中心
- **PermissionNext**: 权限控制系统

源码位置: `packages/opencode/src/tool/`

---

## 核心接口

### Tool.Info - 工具定义接口

```typescript
// packages/opencode/src/tool/tool.ts
export interface Info<Parameters extends z.ZodType, M extends Metadata> {
  id: string
  init: (ctx?: InitContext) => Promise<{
    description: string              // 工具描述（供 LLM 理解）
    parameters: Parameters     // Zod schema 定义参数
    execute(
      args: z.infer<Parameters>,
      ctx: Context,
    ): Promise<{
   title: string        // 执行结果标题
  metadata: M            // 元数据（供 UI 展示）
    output: string  // 输出内容（返回给 LLM）
      attachments?: MessageV2.FilePart[]   // 附件（图片、PDF 等）
    }>
    formatValidationError?(error: z.ZodError): string
  }>
}
```

### Tool.Context - 执行上下文

```typescript
export type Context<M extends Metadata> = {
  sessionID: string             // 当前会话 ID
  messageID: string              // 当前消息 ID
  agent: string             // 当前 Agent 名称
  abort: AbortSignal           // 取消信号
  callID?: string   // 工具调用 ID
  extra?: { [key: string]: any }    // 额外参数

  // 更新元数据（实时反馈给 UI）
  metadata(input: { title?: string; metadata?: M }): void

  // 请求用户授权
  ask(input: Omit<PermissionNext.Request, "id" | "sessionID" | "tool">): Promise<void>
}
```

### Tool.define - 工具定义辅助函数

```typescript
export function define<Parameters extends z.ZodType, Result extends Metadata>(
  id: string,
  init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>,
): Info<Parameters, Result>
```

`Tool.define` 是创建工具的标准方式，它会：
1. 自动验证输入参数（通过 Zod schema）
2. 自动处理输出截断
3. 统一错误处理格式

---

## 工具注册机制

### ToolRegistry - 注册中心

```typescript
// packages/opencode/src/tool/registry.ts
export namespace ToolRegistry {
  // 获取所有可用工具
  export async function tools(providerID: string, agent?: Agent.Info)

  // 注册自定义工具
  export async function register(tool: Tool.Info)

  // 获取所有工具 ID
  export async function ids()
}
```

### 工具加载流程

1. **内置工具**: 直接在 `registry.ts` 中静态导入
2. **自定义工具**: 从配置目录 `{tool,tools}/*.{js,ts}` 动态加载
3. **插件工具**: 通过 `Plugin.list()` 获取插件定义的工具

```typescript
// 内置工具列表
const builtinTools = [
  InvalidTool,  // 无效工具（用于错误处理）
  QuestionTool,      // 向用户提问
  BashTool,     // 执行 Shell 命令
  ReadTool,     // 读取文件
  GlobTool,      // 文件模式匹配
  GrepTool,      // 内容搜索
  EditTool,   // 编辑文件
  WriteTool,         // 写入文件
  TaskTool,// 子任务/子 Agent
  WebFetchTool,      // 获取网页内容
  TodoWriteTool,     // 写入待办事项
  TodoReadTool,      // 读取待办事项
  WebSearchTool,     // 网页搜索
  CodeSearchTool,    // 代码搜索
  SkillTool,         // 技能调用
  // 实验性工具（需要 Flag 开启）
  LspTool,      // LSP 工具
  BatchTool,         // 批量操作
  PlanEnterTool,     // 进入计划模式
  PlanExitTool,      // 退出计划模式
]
```

### 工具过滤

根据不同条件过滤可用工具：

```typescript
// 根据客户端类型过滤
if (["app", "cli", "desktop"].includes(Flag.OPENCODE_CLIENT)) {
  tools.push(QuestionTool)
}

// 根据 Provider 过滤（websearch/codesearch 需要特定 Provider）
if (t.id === "codesearch" || t.id === "websearch") {
  return providerID === "opencode" || Flag.OPENCODE_ENABLE_EXA
}

// 根据实验性 Flag 过滤
if (Flag.OPENCODE_EXPERIMENTAL_LSP_TOOL) {
  tools.push(LspTool)
}
```

---

## 权限系统

### 权限请求流程

每个工具在执行敏感操作前，必须通过 `ctx.ask()` 请求权限：

```typescript
await ctx.ask({
  permission: "bash",           // 权限类型
  patterns: ["git status"],     // 具体操作模式
  always: ["git*"],    // "始终允许"的模式
  metadata: { ... },      // 展示给用户的信息
})
```

### 权限规则 (PermissionNext.Rule)

```typescript
type Rule = {
  permission: string// 权限类型: bash, edit, read, glob, grep, etc.
  pattern: string      // 匹配模式（支持通配符）
  action: "allow" | "deny" | "ask"
}
```

### 权限评估逻辑

```typescript
// packages/opencode/src/permission/next.ts
export function evaluate(permission: string, pattern: string, ...rulesets: Ruleset[]): Rule {
  const merged = merge(...rulesets)
  // 查找最后一个匹配的规则（后定义的规则优先级更高）
  const match = merged.findLast(
    (rule) => Wildcard.match(permission, rule.permission) &&
     Wildcard.match(pattern, rule.pattern),
  )
  return match ?? { action: "ask", permission, pattern: "*" }
}
```

### 权限类型

| 权限类型 | 描述 | 对应工具 |
|---------|------|---------|
| `bash` | 执行 Shell 命令 | BashTool |
| `edit` | 编辑/写入文件 | EditTool, WriteTool, PatchTool |
| `read` | 读取文件 | ReadTool |
| `glob` | 文件搜索 | GlobTool |
| `grep` | 内容搜索 | GrepTool |
| `webfetch` | 获取网页 | WebFetchTool |
| `task` | 启动子 Agent | TaskTool |
| `external_directory` | 访问项目外目录 | 多个工具共用 |

---

## 内置工具详解

### BashTool - Shell 命令执行

**文件**: `packages/opencode/src/tool/bash.ts`

**核心特性**:
- 使用 Tree-sitter 解析命令，提取目录和命令模式
- 自动检测危险操作（cd, rm, cp 等）并请求权限
- 支持超时控制（默认 2 分钟）
- 实时输出流式更新

**关键实现**:

```typescript
// 使用 Tree-sitter 解析 Bash 命令
const parser = lazy(async () => {
  const { Parser } = await import("web-tree-sitter")
  // ... 初始化 Bash 语言解析器
})

// 解析命令提取操作模式
const tree = await parser().then((p) => p.parse(params.command))
for (const node of tree.rootNode.descendantsOfType("command")) {
  // 提取命令名和参数
  // 检查是否涉及项目外目录
}

// 执行命令
const proc = spawn(params.command, {
  shell,
  cwd,
  stdio: ["ignore", "pipe", "pipe"],
})

// 实时更新输出
proc.stdout?.on("data", (chunk) => {
  output += chunk.toString()
  ctx.metadata({ metadata: { output, description } })
})
```

### EditTool - 文件编辑

**文件**: `packages/opencode/src/tool/edit.ts`

**核心特性**:
- 多种模糊匹配策略（容错性强）
- 集成 LSP 诊断
- 自动生成 diff

**替换器链（Replacer Chain）**:

```typescript
const replacers = [
  SimpleReplacer,      // 精确匹配
  LineTrimmedReplacer,          // 忽略行首尾空白
  BlockAnchorReplacer,     // 首尾行锚定匹配
  WhitespaceNormalizedReplacer, // 空白标准化
  IndentationFlexibleReplacer,  // 缩进灵活匹配
  EscapeNormalizedReplacer,     // 转义字符标准化
  TrimmedBoundaryReplacer,  // 边界裁剪匹配
  ContextAwareReplacer,         // 上下文感知匹配
  MultiOccurrenceReplacer,      // 多处匹配
]

// 依次尝试每个替换器，直到找到匹配
for (const replacer of replacers) {
  for (const search of replacer(content, oldString)) {
 // 找到匹配，执行替换
  }
}
```

**BlockAnchorReplacer 算法**:
1. 用搜索块的首行和末行作为"锚点"
2. 在原文件中找到匹配的锚点对
3. 使用 Levenshtein 距离计算中间行的相似度
4. 选择相似度最高的候选块

### ReadTool - 文件读取

**文件**: `packages/opencode/src/tool/read.ts`

**核心特性**:
- 支持图片和 PDF（返回 base64 附件）
- 自动检测二进制文件
- 支持偏移量和行数限制
- 输出带行号格式

```typescript
// 图片/PDF 处理
if (isImage || isPdf) {
  return {
    attachments: [{
      type: "file",
      mime,
      url: `data:${mime};base64,${Buffer.from(await file.bytes()).toString("base64")}`,
    }],
  }
}

// 二进制文件检测
async function isBinaryFile(filepath: string, file: Bun.BunFile): Promise<boolean> {
  // 1. 检查文件扩展名（.zip, .exe 等）
  // 2. 检查前 4096 字节中的 null 字符
  // 3. 检查非打印字符比例（>30% 视为二进制）
}

// 输出格式
// 00001| 第一行内容
// 00002| 第二行内容
```

### TaskTool - 子 Agent 任务

**文件**: `packages/opencode/src/tool/task.ts`

**核心特性**:
- 创建子会话执行复杂任务
- 支持不同类型的子 Agent
- 实时同步工具调用状态

```typescript
// 创建子会话
const session = await Session.create({
  parentID: ctx.sessionID,
  title: params.description + ` (@${agent.name} subagent)`,
  permission: [
    // 子 Agent 默认禁用某些工具
 { permission: "todowrite", pattern: "*", action: "deny" },
    { permission: "todoread", pattern: "*", action: "deny" },
  ],
})

// 执行子任务
const result = await SessionPrompt.prompt({
  sessionID: session.id,
  model: { modelID, providerID },
  agent: agent.name,
  parts: promptParts,
})
```

### GlobTool / GrepTool - 文件搜索

**文件**: `packages/opencode/src/tool/glob.ts`, `packages/opencode/src/tool/grep.ts`

两者都基于 `ripgrep`：

```typescript
// GlobTool - 文件名匹配
for await (const file of Ripgrep.files({
  cwd: search,
  glob: [params.pattern],
})) {
  files.push({ path: full, mtime: stats })
}
// 按修改时间排序
files.sort((a, b) => b.mtime - a.mtime)

// GrepTool - 内容搜索
const args = ["-nH", "--hidden", "--follow", "--field-match-separator=|", "--regexp", params.pattern]
const proc = Bun.spawn([rgPath, ...args])
```

### WebFetchTool - 网页获取

**文件**: `packages/opencode/src/tool/webfetch.ts`

**核心特性**:
- 支持 text/markdown/html 格式
- HTML 自动转 Markdown（使用 Turndown）
- 响应大小限制（5MB）

```typescript
// HTML 转 Markdown
function convertHTMLToMarkdown(html: string): string {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  })
  turndownService.remove(["script", "style", "meta", "link"])
  return turndownService.turndown(html)
}
```

---

## 输出截断机制

**文件**: `packages/opencode/src/tool/truncation.ts`

当工具输出过大时，自动截断并保存完整内容到文件：

```typescript
export namespace Truncate {
  export const MAX_LINES = 2000
  export const MAX_BYTES = 50 * 1024  // 50KB

  export async function output(text: string, options: Options, agent?: Agent.Info): Promise<Result> {
    // 检查是否需要截断
    if (lines.length <= maxLines && totalBytes <= maxBytes) {
      return { content: text, truncated: false }
    }

    // 保存完整输出到文件
    const filepath = path.join(DIR, Identifier.ascending("tool"))
    await Bun.write(filepath, text)

    // 返回截断后的内容 + 提示
    const hint = hasTaskTool(agent)
      ? `Full output saved to: ${filepath}\nUse Task tool to have explore agent process this file.`
      : `Full output saved to: ${filepath}\nUse Grep/Read with offset/limit to view sections.`

    return { content: preview + hint, truncated: true, outputPath: filepath }
  }
}
```

---

## 自定义工具开发

### 方式一：配置目录工具

在项目 `.opencode/tool/` 或 `~/.config/opencode/tool/` 下创建工具文件：

```typescript
// .opencode/tool/mytool.ts
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "我的自定义工具",
  args: {
    input: tool.schema.string().describe("输入参数"),
  },
  async execute(args, ctx) {
    // 请求权限（可选）
    await ctx.ask({
      permission: "mytool",
      patterns: [args.input],
      always: ["*"],
      metadata: {},
    })

    // 执行逻辑
    return `处理结果: ${args.input}`
  },
})
```

### 方式二：插件工具

```typescript
// my-plugin.ts
import type { Plugin } from "@opencode-ai/plugin"

const plugin: Plugin = async (input) => {
  return {
    tool: {
    "my-tool": {
        description: "插件工具",
        args: {
     param: input.$.z.string(),
        },
        async execute(args, ctx) {
     return `结果: ${args.param}`
        },
      },
    },
  }
}

export default plugin
```

### ToolContext API

```typescript
interface ToolContext {
  sessionID: string
  messageID: string
  agent: string
  abort: AbortSignal

  // 更新工具状态（实时反馈给 UI）
  metadata(input: { title?: string; metadata?: any }): void

  // 请求用户授权
  ask(input: {
    permission: string      // 权限类型
    patterns: string[]  // 操作模式
  always: string[]        // "始终允许"的模式
    metadata: any           // 展示信息
  }): Promise<void>
}
```

---

## 插件系统集成

### 插件 Hooks

插件可以通过 hooks 介入工具执行流程：

```typescript
interface Hooks {
  // 工具执行前
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>

  // 工具执行后
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>

  // 权限请求
  "permission.ask"?: (
  input: Permission,
    output: { status: "ask" | "deny" | "allow" },
  ) => Promise<void>
}
```

### 工具从插件加载

```typescript
// packages/opencode/src/tool/registry.ts
function fromPlugin(id: string, def: ToolDefinition): Tool.Info {
  return {
    id,
    init: async (initCtx) => ({
      parameters: z.object(def.args),
      description: def.description,
      execute: async (args, ctx) => {
        const result = await def.execute(args, ctx)
  const out = await Truncate.output(result, {}, initCtx?.agent)
        return {
          title: "",
          output: out.truncated ? out.content : result,
  metadata: { truncated: out.truncated },
        }
      },
    }),
  }
}
```

---

## 总结

OpenCode 工具系统的核心设计原则：

1. **类型安全**: 使用 Zod schema 定义参数，确保运行时类型安全
2. **权限控制**: 所有敏感操作都需要用户授权
3. **容错性**: 编辑工具使用多种匹配策略，提高成功率
4. **可扩展**: 支持配置目录工具和插件工具
5. **实时反馈**: 通过 `ctx.metadata()` 实时更新执行状态
6. **输出管理**: 自动截断大输出，保存完整内容供后续访问

关键源文件：
- `packages/opencode/src/tool/tool.ts` - 核心接口定义
- `packages/opencode/src/tool/registry.ts` - 工具注册中心
- `packages/opencode/src/permission/next.ts` - 权限系统
- `packages/plugin/src/tool.ts` - 插件工具定义
