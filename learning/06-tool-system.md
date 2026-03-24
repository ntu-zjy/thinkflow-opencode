# Tool 系统

工具如何定义、注册和执行。

---

## 理解 Tool.define

每个工具用 `Tool.define(id, init)` 创建。`init` 返回描述、参数 schema 和执行函数。

```ts
export const ReadTool = Tool.define("read", async () => ({
  description: "Read a file from the filesystem",
  parameters: z.object({
    filePath: z.string(),
    offset: z.number().optional(),
    limit: z.number().optional(),
  }),
  async execute(params, ctx) {
    const content = await Bun.file(params.filePath).text()
    return {
      title: params.filePath,
      output: content,
    }
  },
}))
```

---

## 看懂 init 的懒加载

`init` 可以是函数或静态值。`Tool.define` 会统一包装为 async thunk。

这意味着工具的描述和 prompt 可以根据当前 agent 动态调整。

```ts
Tool.define("bash", async (initCtx) => {
  // initCtx.agent 包含当前 agent 信息
  // 可以根据不同 agent 返回不同的 description
  return { ... }
})
```

---

## 理解执行上下文

`execute` 的第二个参数是 `Tool.Context`，包含：

```ts
interface Context {
  sessionID: string // 当前会话
  messageID: string // 当前消息
  agent: Agent.Info // 当前 agent
  abort: AbortSignal // 中断信号
  metadata(data: object) // 更新工具元数据
  permission: {
    ask(question: string) // 请求用户授权
  }
}
```

---

## 掌握输出截断

`Tool.define` 的包装会自动对 `execute` 的返回值做截断处理。

```ts
// 如果 output 超过 token 限制
Truncate.output(output, maxTokens)
// → 截断后的文本 + "[truncated]" 标记
```

如果工具自己处理了截断（返回 `metadata.truncated`），自动截断会跳过。

---

## 理解 ToolRegistry

`ToolRegistry` 发现和管理所有可用工具。

```ts
const tools = await ToolRegistry.tools()
// → Map<string, Tool.Info>
```

工具来源有三个：

1. **内置工具**：bash、read、write、edit、grep、glob 等
2. **自定义工具**：`.opencode/tools/` 目录下的 .ts/.js 文件
3. **插件工具**：通过 Plugin 系统注册

---

## 看懂 MCP 工具

MCP（Model Context Protocol）server 也提供工具。它们和内置工具统一暴露给 LLM。

```ts
const allTools = [
  ...builtinTools,
  ...customTools,
  ...mcpTools, // 从 MCP server 动态获取
]
```

MCP 工具的特殊之处在于它们的 schema 是运行时从外部 server 获取的。

---

## 理解权限系统

每个工具调用都经过 `PermissionNext.ask()` 检查。

```
工具调用 → 匹配权限规则 → allow | deny | ask
                                        |
                                    用户选择
                                  once | always | reject
```

规则在 config 里定义，支持按工具名和文件 pattern 匹配。

```json
{
  "permission": {
    "bash": "ask",
    "edit": "ask",
    "read": "allow"
  }
}
```

---

## 认识内置工具

| 工具                 | 功能            | 关键特性           |
| -------------------- | --------------- | ------------------ |
| `bash`               | 执行 shell 命令 | tree-sitter 解析   |
| `read`               | 读取文件        | 支持行范围         |
| `write`              | 创建文件        | 完整文件写入       |
| `edit`               | 编辑文件        | search-and-replace |
| `multiedit`          | 批量编辑        | 多文件同时修改     |
| `grep`               | 内容搜索        | 基于 ripgrep       |
| `glob`               | 文件匹配        | 模式匹配           |
| `task`               | 子 agent 委派   | 启动 sub-agent     |
| `webfetch`           | 获取网页        | HTML → Markdown    |
| `question`           | 询问用户        | 中断等待输入       |
| `todowrite/todoread` | 待办管理        | 任务跟踪           |
| `lsp`                | LSP 操作        | 代码智能           |
| `batch`              | 批量执行        | 并行工具调用       |

---

## 关键文件

| 文件                     | 内容                       |
| ------------------------ | -------------------------- |
| `src/tool/tool.ts`       | Tool.define + Context 类型 |
| `src/tool/registry.ts`   | ToolRegistry 发现和管理    |
| `src/tool/bash.ts`       | Bash 工具实现              |
| `src/tool/edit.ts`       | 文件编辑工具               |
| `src/tool/task.ts`       | 子 agent 委派              |
| `src/permission/next.ts` | 权限系统                   |

---

## 动手验证

1. 读 `tool/tool.ts`（不到 100 行），理解 `define` 的包装逻辑
2. 读 `tool/bash.ts`，看一个完整工具的实现
3. 在 `.opencode/tools/` 下创建一个自定义工具，验证它能被发现
