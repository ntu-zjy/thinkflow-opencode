# 上下文管理

每次 LLM 调用的上下文如何拼接、裁剪和压缩。

---

## 理解全局流水线

每次 LLM 调用经过 6 个阶段的上下文处理：

```
1. 消息加载 → filterCompacted() 裁掉压缩边界之前的内容
2. 消息转换 → toModelMessage() 转为 AI SDK 格式
3. System prompt 组装 → 多层拼接
4. 工具过滤 → 按 agent 权限裁剪
5. Provider 变换 → 缓存控制、格式适配
6. 发送 → streamText()
```

---

## 阶段一：消息加载

### 从 Storage 读取

`MessageV2.stream(sessionID)` 从存储中读取当前会话的所有消息。它是一个异步生成器，**从新到旧**产出消息。

```ts
async function* stream(sessionID) {
  const list = await Storage.list(["message", sessionID])
  for (let i = list.length - 1; i >= 0; i--) {
    yield await get({ sessionID, messageID: list[i][2] })
  }
}
```

每条消息包含完整的 parts（text、tool、reasoning、file 等）。

---

### 裁掉压缩边界之前的内容

`filterCompacted()` 扫描消息流，找到最近的压缩边界并截断。

```ts
async function filterCompacted(stream) {
  const result = []
  const completed = new Set()

  for await (const msg of stream) {
    result.push(msg)

    // 找到已完成的压缩摘要 → 记录其 parentID
    if (msg.info.role === "assistant" && msg.info.summary && msg.info.finish) completed.add(msg.info.parentID)

    // 找到对应的压缩触发消息 → 停止
    if (msg.info.role === "user" && completed.has(msg.info.id) && msg.parts.some((p) => p.type === "compaction")) break
  }

  result.reverse() // 恢复时间顺序
  return result
}
```

**关键机制**：压缩不删除旧消息，而是在加载时跳过它们。压缩边界之前的消息仍在 Storage 里，但不会进入 LLM 上下文。

---

## 阶段二：消息转换

### toModelMessage()

将内部 `MessageV2.WithParts[]` 转为 AI SDK 的 `ModelMessage[]`。

**User 消息的转换**：

| 内部 Part             | 转为                                                           |
| --------------------- | -------------------------------------------------------------- |
| `text`（非 ignored）  | `{ type: "text", text }`                                       |
| `file`（非文本 MIME） | `{ type: "file", url, mediaType }`                             |
| `compaction`          | `{ type: "text", text: "What did we do so far?" }`             |
| `subtask`             | `{ type: "text", text: "The following tool was executed..." }` |

**Assistant 消息的转换**：

| 内部 Part           | 转为                                                             |
| ------------------- | ---------------------------------------------------------------- |
| `text`              | `{ type: "text", text }`                                         |
| `tool`（completed） | `{ type: "tool-xxx", state: "output-available", input, output }` |
| `tool`（error）     | `{ type: "tool-xxx", state: "output-error", error }`             |
| `reasoning`         | `{ type: "reasoning", text }`                                    |

**特殊处理**：

- **错误消息跳过**：有 error 的 assistant 消息被完全排除（除非是 AbortedError 且有部分工作）
- **已清理的工具输出**：如果 `part.state.time.compacted` 有值，输出替换为 `"[Old tool result content cleared]"`
- **工具附件**：如果工具返回了文件附件，在 tool result 之前注入一条合成 user 消息包含文件内容

---

## 阶段三：System Prompt 组装

System prompt 由多部分组装。在 `llm.ts` 中最终拼接。

```
system = [
  header,                    // [可选] Anthropic 身份前缀
  joined_content             // 以下所有内容 join("\n") 为一个字符串
]
```

`joined_content` 的组成顺序：

```
1. Agent prompt                  ← agent.prompt（自定义 agent 的 system prompt）
   或 Provider base prompt       ← 按模型族选择（Claude/GPT/Gemini/其他）

2. Environment block             ← <env> 工作目录、git、平台、日期 </env>

3. Custom instructions           ← AGENTS.md、CLAUDE.md（从项目到全局）
                                 ← config 中 instructions 指定的文件
                                 ← HTTP URL 内容

4. User system prompt            ← user.system（如果有）
```

**模型族选择逻辑**：

```ts
function provider(model) {
  if (model.includes("gpt-5")) return PROMPT_CODEX
  if (model.includes("gpt-") || model.includes("o1") || model.includes("o3")) return PROMPT_BEAST
  if (model.includes("gemini-")) return PROMPT_GEMINI
  if (model.includes("claude")) return PROMPT_ANTHROPIC
  return PROMPT_ANTHROPIC_WITHOUT_TODO // 默认（qwen 等）
}
```

每种 base prompt 针对模型特性优化了工具使用指令。

---

## 阶段四：工具过滤

工具经过两层过滤后进入 LLM 可见范围。

### Init 时过滤（LLM 看不到的工具）

```ts
// PermissionNext.disabled() 检查：
// 对 pattern "*" 是 deny 的工具 → 完全移除
const disabled = PermissionNext.disabled(toolIds, agent.permission)
for (const tool of toolIds) {
  if (disabled.has(tool)) delete tools[tool]
}
```

### 用户级禁用

```ts
// 用户在 config 或 input 中显式禁用
if (user.tools?.[tool] === false) delete tools[tool]
```

最终传给 `streamText()` 的 `tools` 只包含当前 agent 可见且允许的工具。

---

## 阶段五：Provider 变换

消息在发送前经过 provider 特定的变换管线。

### 三步变换

```
unsupportedParts()  → 替换模型不支持的文件/图片格式
normalizeMessages() → 修复 provider 特定的消息格式问题
applyCaching()      → 注入缓存控制标记（仅 Anthropic 系）
```

---

### 不支持的媒体类型

如果模型不支持某种输入（图片、音频、PDF），替换为错误文本：

```
"ERROR: Cannot read image.png (this model does not support image input).
Inform the user."
```

---

### Provider 消息格式修复

| Provider               | 修复内容                                                      |
| ---------------------- | ------------------------------------------------------------- |
| Anthropic              | 过滤空消息和空 parts                                          |
| Claude                 | toolCallId 只保留 `[a-zA-Z0-9_-]`                             |
| Mistral                | toolCallId 限 9 字符；tool→user 之间注入 `"Done."`            |
| reasoning_content 模型 | 把推理内容从 content 移到 `providerOptions.reasoning_content` |

---

### Anthropic 缓存控制

对 **前 2 条 system 消息** 和 **最后 2 条对话消息** 注入缓存标记：

```ts
// system prompt 的第一和第二部分
// + 对话中最近的两条消息
→ providerOptions.anthropic.cacheControl = { type: "ephemeral" }
```

这让 Anthropic 缓存 system prompt（不随对话变化）和最近的上下文（下一轮大概率复用）。

---

## 阶段六：最终发送

`streamText()` 的消息数组结构：

```ts
messages: [
  // System prompt
  { role: "system", content: header },           // Anthropic 身份前缀
  { role: "system", content: joined_content },    // Agent + env + rules

  // 完整对话历史（经过 filterCompacted + toModelMessage）
  { role: "user", content: [...] },
  { role: "assistant", content: [...] },
  { role: "user", content: [...] },
  { role: "assistant", content: [...] },
  // ...

  // [可选] 达到 max steps 时的强制终止消息
  { role: "assistant", content: MAX_STEPS_TEXT }
]
```

---

## 上下文裁剪：三道防线

### 第一道：工具输出截断（生产时）

每个工具执行后，输出超过限制就截断。

```
限制：2000 行 或 50KB（取先到的）
```

截断后原始内容写入磁盘，给 LLM 返回预览 + 提示：

```
[前 2000 行预览]

...15000 lines truncated...

Use Grep to search the full content or Read with offset/limit
to view specific sections.
```

如果 agent 有 task 工具权限，提示改为建议委派给 explore agent 处理。

---

### 第二道：修剪（prune，轻量）

在循环结束后，`prune()` 清理旧的工具输出。

```
扫描策略（从新到旧）：
  - 跳过最近 1 轮（保护当前对话）
  - 前 40K tokens 的工具输出受保护
  - 超出 40K 的旧工具输出 → 标记为 compacted
  - 被标记的输出在下次加载时替换为 "[Old tool result content cleared]"
  - 至少积累 20K tokens 可清理才执行
```

`skill` 工具的输出永远不被修剪。

---

### 第三道：压缩（compaction，重量）

当上下文窗口即将溢出时触发。

**溢出检测**：

```ts
function isOverflow(tokens, model) {
  const count = tokens.input + tokens.cache.read + tokens.output
  const output = Math.min(model.limit.output, 32000)
  const usable = model.limit.context - output
  return count > usable
}
```

用上一次 LLM 调用的实际 token 消耗与 `(上下文窗口 - 输出预留)` 比较。

**压缩流程**：

```
1. 检测到溢出
2. 创建 compaction 触发消息（user message + CompactionPart）
3. loop() 检测到 CompactionPart
4. 把完整对话历史发给 compaction agent
5. compaction agent 生成摘要（summary: true 的 assistant 消息）
6. 下次加载消息时，filterCompacted() 只返回摘要之后的消息
```

压缩 prompt 要求生成的摘要包含：做了什么、正在做什么、涉及的文件、下一步计划。

---

## 排队消息的处理

用户在 agent 忙碌时发送的消息不会启动新循环，而是等待当前循环结束。

当循环继续时，这些消息被包裹在 `<system-reminder>` 标签中：

```xml
<system-reminder>
The user sent this message while you were working.
Address what the user said and then continue with your current task.

用户的消息内容
</system-reminder>
```

---

## Plan/Build 模式提醒

`insertReminders()` 在消息数组末尾追加模式切换上下文：

- **Plan 模式**：追加只读约束 prompt，禁止任何文件修改
- **Plan → Build 切换**：追加计划文件内容，告诉 LLM 按计划执行
- **Build → Plan 切换**（实验性）：注入多阶段规划工作流

---

## maxOutputTokens 计算

```ts
// 基础值
output = Math.min(model.limit.output, 32000)

// Anthropic 的 thinking 特殊处理：
// thinking budget + text output 不能超过模型上限
if (anthropic && thinking_budget) {
  output = Math.min(
    model.limit.output,
    thinking_budget + 16000, // 确保至少 16K 给文本
  )
}
```

---

## 完整上下文示意图

```
┌──────────────────────────────────────────────────┐
│ System Messages                                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ [Anthropic Header]  ← 缓存 ephemeral         │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Agent Prompt / Provider Base Prompt           │ │
│ │ + Environment <env>...</env>                  │ │
│ │ + AGENTS.md / CLAUDE.md                       │ │
│ │ + config instructions      ← 缓存 ephemeral  │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Conversation Messages                             │
│ ┌──────────────────────────────────────────────┐ │
│ │ [压缩摘要 - summary: true]                    │ │
│ │ "We worked on auth module, modified 3 files"  │ │
│ ├──────────────────────────────────────────────┤ │
│ │ User: "继续重构 config 部分"                    │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Assistant:                                     │ │
│ │   [text] "我来看看 config..."                   │ │
│ │   [tool:read] config.ts → 文件内容             │ │
│ │   [tool:edit] config.ts → 修改结果             │ │
│ │   [tool:bash] "bun test" → [已清理]            │ │
│ │   [text] "重构完成"                             │ │
│ ├──────────────────────────────────────────────┤ │
│ │ User: "看看测试通过了吗"                        │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Assistant:                          ← 缓存    │ │
│ │   [tool:bash] "bun test" → 测试输出            │ │
│ │   [text] "全部通过"                 ← 缓存     │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ [可选] MAX_STEPS 强制终止消息                      │
└──────────────────────────────────────────────────┘
  ↑ 前 2 system + 后 2 conversation 带缓存标记
  ↑ 被修剪的工具输出显示为 "[Old tool result content cleared]"
  ↑ 压缩边界之前的消息完全不加载
```

---

## 关键文件

| 文件                        | 内容                                             |
| --------------------------- | ------------------------------------------------ |
| `src/session/prompt.ts`     | 主循环、消息加载、工具解析、排队消息处理         |
| `src/session/processor.ts`  | LLM 流式调用、token 跟踪、溢出检测               |
| `src/session/llm.ts`        | streamText() 参数组装、system prompt 拼接        |
| `src/session/system.ts`     | System prompt 各层组装                           |
| `src/session/message-v2.ts` | 消息 schema、toModelMessage()、filterCompacted() |
| `src/session/compaction.ts` | 溢出检测、修剪、压缩                             |
| `src/provider/transform.ts` | Provider 消息变换、缓存控制                      |
| `src/tool/truncation.ts`    | 工具输出截断                                     |

---

## 动手验证

1. 在 `filterCompacted()` 加 log，看压缩边界如何确定
2. 在 `toModelMessage()` 加 log，打印最终传给 LLM 的消息数组长度
3. 在 `isOverflow()` 加 log，看 token 计数和上下文窗口的比较
4. 发一条很长的消息触发截断，看 `Truncate.output()` 的效果
5. 多轮对话触发压缩，观察 `prune()` → `process()` 的完整流程
