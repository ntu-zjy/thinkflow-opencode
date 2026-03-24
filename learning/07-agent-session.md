# Agent 与会话循环

核心 agentic loop 如何运转。

---

## 理解 Agent 定义

Agent 是 LLM 的角色配置。每个 agent 有独立的 prompt、model、permission 和可用工具。

```ts
// 内置 agent 示例
{
  build: {
    name: "build",
    description: "General purpose coding agent",
    mode: "primary",        // 顶级 agent
    permission: { ... },
    steps: Infinity
  },
  plan: {
    name: "plan",
    description: "Planning agent, cannot modify files",
    mode: "primary",
    permission: {
      write: "deny",
      edit: "deny",
      bash: "deny"
    }
  },
  explore: {
    name: "explore",
    description: "Fast codebase exploration agent",
    mode: "subagent"        // 只能被其他 agent 委派
  }
}
```

---

## 理解 Agent 类型

Agent 分两类：

- **primary**：用户直接使用，如 build、plan
- **subagent**：只能被 `task` 工具委派，如 explore、general

用户在 TUI 里用 Tab 键切换 primary agent。sub-agent 通过 `task` 工具调用。

---

## 看懂用户自定义 Agent

用户可以通过 config 或 markdown 文件定义自己的 agent。

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "You are a code reviewer...",
      "tools": {
        "write": false,
        "edit": false
      }
    }
  }
}
```

也可以用 markdown 文件（`.opencode/agent/code-reviewer.md`）。

---

## 理解会话结构

Session 是一次完整的对话。核心 schema：

```ts
Session.Info = {
  id: string              // ULID
  slug: string            // 人类可读标识
  projectID: string       // 所属项目
  parentID?: string       // 父会话（sub-agent 场景）
  title: string           // 自动生成的标题
  summary?: object        // 摘要信息
  share?: object          // 分享信息
  version: number         // 乐观锁版本号
}
```

会话支持 fork（分叉）、compact（压缩上下文）和 revert（撤销）。

---

## 掌握核心循环

`SessionPrompt.loop()` 是整个项目的心脏。简化流程：

```
loop(sessionID):
    |
    ├── 1. 从 Storage 加载所有消息
    |
    ├── 2. 解析当前 agent 配置
    |
    ├── 3. 解析可用工具（ToolRegistry + MCP）
    |
    ├── 4. 构建 system prompt：
    |       - SystemPrompt.header()     ← provider 特定前缀
    |       - Agent.prompt              ← agent 专属指令
    |       - SystemPrompt.environment()← 环境信息
    |       - SystemPrompt.custom()     ← AGENTS.md 等规则文件
    |
    ├── 5. 调用 SessionProcessor.process()：
    |       └── LLM.stream()            ← ai-sdk streamText()
    |           ├── text-delta → TextPart
    |           ├── reasoning → ReasoningPart
    |           └── tool-call → 执行工具 → ToolPart
    |
    ├── 6. 判断结果：
    |       - 有 tool call → 继续循环（回到步骤 1）
    |       - 上下文溢出 → 触发 compaction
    |       - assistant 完成 → 退出循环
    |
    └── 返回结果
```

---

## 理解流式处理

`SessionProcessor` 处理 LLM 的流式输出。每个 chunk 被分类为不同的 Part。

```ts
// 简化版
for await (const chunk of stream) {
  switch (chunk.type) {
    case "text-delta":
      // 追加文本到当前 TextPart
      Bus.publish(MessageV2.Event.PartUpdated, { part })
      break
    case "tool-call":
      // 执行工具
      const result = await tool.execute(chunk.args, ctx)
      // 存储 ToolPart
      Bus.publish(MessageV2.Event.PartUpdated, { part })
      break
    case "reasoning":
      // 追加推理内容到 ReasoningPart
      break
  }
}
```

每个 Part 的变更都通过 Bus 发布，Client 实时接收并渲染。

---

## 理解 Compaction

当上下文窗口满了，触发自动压缩。

```
1. 检测到 token 用量接近 context limit
2. 启动 compaction agent
3. compaction agent 总结之前的对话
4. 用摘要替换原始消息
5. 继续对话
```

---

## 理解 System Prompt

System prompt 由多个部分组装：

```
[Provider Header]          ← 部分 provider 需要特殊开头
[Agent Prompt]             ← agent 的角色定义
[Provider Base Prompt]     ← 按模型族选择（GPT/Gemini/Claude）
[Environment Block]        ← 工作目录、git 状态、日期
[Custom Rules]             ← AGENTS.md、CLAUDE.md 等
[Instructions]             ← config 中指定的额外指令文件
```

不同 provider 使用不同的 base prompt（存在 `session/prompt/*.txt`）。

---

## 关键文件

| 文件                        | 内容                             |
| --------------------------- | -------------------------------- |
| `src/agent/agent.ts`        | Agent 定义、内置 agent、用户覆盖 |
| `src/session/prompt.ts`     | 核心循环 `loop()` + `prompt()`   |
| `src/session/processor.ts`  | 流式处理                         |
| `src/session/llm.ts`        | LLM 调用封装                     |
| `src/session/system.ts`     | System prompt 组装               |
| `src/session/index.ts`      | Session CRUD                     |
| `src/session/compaction.ts` | 上下文压缩                       |
| `src/session/revert.ts`     | 撤销/重做                        |

---

## 动手验证

1. 在 `prompt.ts` 的 `loop()` 里加 log，追踪每次循环的 tool call 情况
2. 在 `system.ts` 里打印组装后的完整 system prompt
3. 触发 compaction（发一条很长的消息），观察压缩过程
