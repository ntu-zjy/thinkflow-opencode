# SubAgent 深度解析

TaskTool 如何创建子会话、委派任务和传递结果。

---

## 理解调用入口

SubAgent 通过 `TaskTool`（`src/tool/task.ts`）调用。它的触发方式有两种：

1. **LLM 自主调用**：LLM 决定需要子 agent 帮忙，调用 task tool
2. **用户 `@agent` 引用**：用户输入 `@explore` 时自动触发

两者的区别在于 `bypassAgentCheck`。用户触发时跳过权限检查。

---

## 看懂 Init 时的 Agent 过滤

TaskTool 初始化时决定哪些 sub-agent 对 LLM 可见：

```ts
// task.ts init()
const agents = Agent.list().filter((a) => {
  // 1. 排除 primary-only agent
  if (a.mode === "primary") return false

  // 2. 如果有 caller agent 信息，检查权限
  if (ctx?.agent) {
    const result = PermissionNext.evaluate("task", a.name, ctx.agent.permission)
    if (result.action === "deny") return false
  }
  return true
})
```

然后把可用 agent 列表注入到 tool 描述里：

```
Available agent types and the tools they have access to:
- general: Multi-purpose task worker
- explore: Fast codebase explorer
- docs: ALWAYS use this when writing docs
```

没有 description 的 agent 会显示 `"This subagent should only be called manually by the user."`——告诉 LLM 不要自己调用。

---

## 掌握参数

```ts
{
  description: string       // 3-5 个词的任务描述
  prompt: string            // 完整的任务指令
  subagent_type: string     // agent 名称
  session_id?: string       // 续接现有 session
  command?: string          // 触发命令名
}
```

---

## 追踪完整执行流程

### 步骤 1：权限检查

```ts
// 除非用户显式 @agent，否则检查权限
if (!ctx.extra?.bypassAgentCheck) {
  await ctx.ask({
    permission: "task",
    patterns: [params.subagent_type],
  })
}
```

### 步骤 2：创建子会话

```ts
const session = await Session.create({
  parentID: ctx.sessionID, // 链接到父会话
  title: `${description} (@${agentName} subagent)`,
})
```

子会话带有**限制性权限**：

```ts
const sessionPermission = [
  { permission: "todowrite", pattern: "*", action: "deny" },
  { permission: "todoread", pattern: "*", action: "deny" },
  // 如果 agent 没有 task 权限，也禁止
  { permission: "task", pattern: "*", action: "deny" },
]
```

这防止子 agent 修改 todo 列表或无限嵌套。

### 步骤 3：模型解析

```ts
// 优先用 agent 绑定的模型，否则继承父会话的
const model = agent.model
  ? `${agent.model.providerID}/${agent.model.modelID}`
  : `${parentMsg.providerID}/${parentMsg.modelID}`
```

### 步骤 4：进度跟踪

父会话订阅子会话的 Part 更新事件：

```ts
Bus.subscribe(MessageV2.Event.PartUpdated, (event) => {
  if (event.info.sessionID !== childSessionID) return
  if (event.info.type !== "tool") return
  // 收集子 agent 的工具调用摘要
  summary.push({
    tool: event.info.tool,
    title: event.info.title,
    state: event.info.state,
  })
  // 更新父 task tool 的元数据
  ctx.metadata({ summary })
})
```

这让 TUI 能实时显示子 agent 的工作进展。

### 步骤 5：执行子 agent

```ts
await SessionPrompt.prompt({
  sessionID: childSession.id,
  messageID: newMessageID,
  model: resolvedModel,
  agent: agentName,
  parts: resolvedParts,
  tools: {
    todowrite: false,
    todoread: false,
    task: false, // 如果不允许嵌套
  },
})
```

这里递归调用了 `SessionPrompt.prompt()`——子 agent 运行自己的完整循环。

### 步骤 6：结果回传

```ts
// 收集子会话所有 assistant 消息的工具摘要
const toolParts = childMessages
  .filter((m) => m.role === "assistant")
  .flatMap((m) => m.parts.filter((p) => p.type === "tool"))

// 取最后一条文本作为结果
const lastText = lastAssistant.parts.filter((p) => p.type === "text").pop()

return {
  title: description,
  output: lastText + `\n<task_metadata>\nsession_id: ${session.id}\n</task_metadata>`,
  metadata: { summary: toolParts, sessionId: session.id },
}
```

`<task_metadata>` 标签让后续对话可以通过 `session_id` 续接子 agent 会话。

---

## 理解取消传播

父的 abort signal 会传播到子会话：

```ts
ctx.abort.addEventListener("abort", () => {
  SessionPrompt.cancel(childSession.id)
})
```

用户在 TUI 按 Escape 时，父子会话同时中断。

---

## 理解 @agent 触发路径

用户输入 `@explore look at the auth module` 时的流程：

```
1. resolvePromptParts() 检测到 @explore
2. 不是文件路径 → 尝试 Agent.get("explore")
3. 匹配成功 → 创建 AgentPart

4. createUserMessage() 处理 AgentPart：
   → 生成合成文本：
   "Use the above message and context to generate a prompt
    and call the task tool with subagent: explore"
   → 设置 bypassAgentCheck = true

5. loop() 正常运行
6. LLM 看到指令后调用 TaskTool
7. TaskTool 检测到 bypassAgentCheck，跳过权限检查
8. 子 agent 会话创建并执行
```

---

## 理解 Slash Command 的 subtask 路由

Slash command 可以自动路由到 sub-agent：

```ts
// prompt.ts command() 函数
if (agent.mode === "subagent" && command.subtask !== false) {
  // 作为 subtask 执行，而非直接 prompt
  return createSubtaskPart(agentName, promptText)
}
```

subtask part 会在下一轮 `loop()` 被检测到，然后走 TaskTool 路径。

---

## 关键文件

| 文件                    | 内容                         |
| ----------------------- | ---------------------------- |
| `src/tool/task.ts`      | TaskTool 完整实现            |
| `src/tool/task.txt`     | TaskTool 描述模板            |
| `src/session/prompt.ts` | 子 agent 创建和 @agent 路由  |
| `src/session/index.ts`  | Session.create()（parentID） |

---

## 动手验证

1. 在 TUI 里输入 `@explore how does the config system work`，观察子会话创建
2. 在 `task.ts` 的 `execute` 里加 log，追踪子会话权限
3. 创建一个自定义 subagent，验证它出现在 TaskTool 的可用列表里
4. 用 `session_id` 参数续接一个已有的子 agent 会话
