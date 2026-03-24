# 完整生命周期

从用户选择 Agent 到 LLM 回复的每一步。

---

## 阶段一：Agent 注册

应用启动时，`Agent.state()` 构建完整的 agent 注册表。

```
1. 加载 Config（层叠合并）
2. 定义默认权限基线
3. 读取用户全局权限
4. 创建 7 个内置 agent，每个合并 defaults + agentOverrides + userPermission
5. 遍历 cfg.agent：
   - disable → 删除
   - 新 name → 创建（mode: "all", native: false）
   - 已有 → 覆盖字段 + 追加权限 + 深合并 options
6. 确保 Truncate.DIR 安全网
7. 排序（default_agent 排首位）
8. 缓存到 Instance.state()
```

---

## 阶段二：用户发送消息

```
1. 用户在 TUI 输入消息（可能包含 @file 或 @agent）

2. SessionPrompt.prompt(input) 被调用
   input = {
     sessionID, messageID, model,
     agent: "build",           ← 当前选择的 agent
     parts: [
       { type: "text", text: "重构 auth 模块" },
       { type: "file", url: "src/auth.ts" },
       { type: "agent", name: "explore" }  ← 如果用了 @agent
     ]
   }

3. createUserMessage() 处理每个 part：
   - text → 直接保留
   - file → 读取文件内容，转为合成文本
   - agent → 创建 AgentPart + 合成指令：
     "call the task tool with subagent: explore"
     设置 bypassAgentCheck = true

4. UserMessage 写入 Storage
5. Bus.publish(MessageV2.Event.Created)
```

---

## 阶段三：主循环

```
5. loop(sessionID) 启动

6. 消息扫描：
   - 找到 lastUser、lastAssistant、pending tasks

7. 检查退出条件：
   - 上一条 assistant 已完成且在 lastUser 之后 → 退出
   - 有 pending subtask → 走 subtask 路径
   - 有 pending compaction → 走 compaction 路径
   - context overflow → 创建 compaction

8. 正常处理：
   a. Agent.get(lastUser.agent) → 解析 agent 配置
   b. 检查 steps 上限
   c. insertReminders() → 注入 plan/build 模式提醒
```

---

## 阶段四：工具解析

```
9. resolveTools(input)：

   a. ToolRegistry.tools(providerID, agent) 获取所有工具
      对每个工具调用 tool.init({ agent })：

      - TaskTool.init({ agent: buildAgent })：
        过滤 mode !== "primary" 的 agent
        用 buildAgent.permission 检查 "task" + agentName
        → 生成可用 sub-agent 列表注入描述

      - SkillTool.init({ agent: buildAgent })：
        过滤 buildAgent.permission 对 "skill" 的访问
        → 生成可用 skill 列表注入描述

      - 其他工具的 init() 可能也用 agent 信息
        （如根据 agent 调整描述）

   b. PermissionNext.disabled() 检查：
      对 pattern "*" 是 deny 的工具 → 完全从列表移除
      LLM 看不到这些工具

   c. 创建 Tool.Context 工厂：
      ctx.ask() → PermissionNext.ask(agent.permission + session.permission)
      ctx.extra = { model, bypassAgentCheck }

   d. MCP 工具也同样包装权限检查

10. 最终工具列表传给 ai-sdk
```

---

## 阶段五：System Prompt 组装

```
11. 组装 system prompt（按顺序拼接）：

    [1] SystemPrompt.header(providerID)
        → Anthropic 需要特殊身份前缀

    [2] Agent.prompt
        → agent 的自定义 system prompt（如果有）

    [3] SystemPrompt.provider(model)
        → 按模型族选择 base prompt（GPT/Gemini/Claude/其他）

    [4] SystemPrompt.environment()
        → <env> 块：目录、git、平台、日期

    [5] SystemPrompt.custom()
        → AGENTS.md + CLAUDE.md（从项目到全局）
        → config 中的 instructions 文件
        → HTTP URL 内容

    [6] insertReminders() 产生的内容
        → plan 模式约束 / build 切换提示
```

---

## 阶段六：LLM 调用与工具执行

```
12. processor.process() 调用 LLM.stream()
    → ai-sdk streamText() 开始流式返回

13. 流式处理每个 chunk：

    text-delta：
      → 追加到 TextPart
      → Bus.publish(PartUpdated) → SSE → Client 实时渲染

    tool-call：
      → 找到对应工具定义
      → Zod 校验参数
      → Plugin.trigger("tool.execute.before")
      → 权限检查 ctx.ask()
        → "allow" → 继续
        → "ask" → 发事件等用户确认
        → "deny" → 抛 DeniedError
      → tool.execute(args, ctx)
      → Truncate.output() 截断输出
      → Plugin.trigger("tool.execute.after")
      → 存储 ToolPart
      → Bus.publish(PartUpdated)

    reasoning：
      → 追加到 ReasoningPart

14. step-finish：更新 token 用量和费用

15. 判断继续：
    - finish_reason === "tool-calls" → 回到步骤 6（继续循环）
    - 否则 → 退出循环
```

---

## 阶段七：SubAgent 执行（如果触发）

```
16. 如果 LLM 调用了 TaskTool：

    a. 权限检查（除非 bypassAgentCheck）
    b. Agent.get(subagent_type) 解析子 agent
    c. 创建子 Session（parentID = 当前 session）
    d. 设置子 session 权限限制
    e. 解析子 agent 的模型
    f. 订阅子 session 事件（进度跟踪）

    g. 递归调用 SessionPrompt.prompt()：
       → 子 agent 运行自己的完整循环
       → 子 agent 有自己的 prompt + tools + permissions
       → 子 agent 可能调用多个工具
       → 子 agent 完成后返回结果

    h. 收集子 session 的工具摘要 + 最终文本
    i. 作为 ToolPart 返回给父循环
    j. 父循环继续处理
```

---

## 阶段八：Skill 加载（如果触发）

```
17. 如果 LLM 调用了 SkillTool：

    a. Skill.get(name) 查找 skill
    b. 权限检查
    c. 读取 SKILL.md 内容
    d. 返回 "## Skill: name\n\n内容"
    e. 内容作为 tool result 注入上下文
    f. LLM 在后续回复中使用 skill 知识
```

---

## 完整时序图

```
User          TUI/Client        Server           LLM            SubAgent
  |               |                |               |               |
  |-- message --> |                |               |               |
  |               |-- POST /msg -->|               |               |
  |               |                |-- prompt() -->|               |
  |               |                |   resolve tools               |
  |               |                |   build system prompt         |
  |               |                |-- stream() -->|               |
  |               |<-- SSE text ---|<-- text ------|               |
  |               |<-- SSE text ---|<-- text ------|               |
  |               |                |<-- tool call -|               |
  |               |<-- SSE tool ---|   execute     |               |
  |               |                |-- tool result>|               |
  |               |                |<-- task call -|               |
  |               |                |   create session              |
  |               |                |-- prompt() -------> loop() -->|
  |               |<-- SSE sub ----|<----------- progress ---------|
  |               |                |<----------- result -----------|
  |               |                |-- task result>|               |
  |               |                |<-- text ------|               |
  |               |<-- SSE done ---|               |               |
  |<-- render ----|               |               |               |
```
