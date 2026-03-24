# Agent 深度解析

Agent 的定义、注册、权限合并和完整生命周期。

---

## 理解 Agent.Info

每个 Agent 的运行时类型：

```ts
{
  name: string              // 唯一标识，如 "build"
  description?: string      // 描述何时使用（显示在 TaskTool 里）
  mode: "primary" | "subagent" | "all"
  native?: boolean          // 内置 or 用户定义
  hidden?: boolean          // 是否隐藏
  model?: {                 // 绑定的模型
    modelID: string
    providerID: string
  }
  prompt?: string           // 自定义 system prompt
  permission: Ruleset       // 权限规则数组
  temperature?: number
  topP?: number
  steps?: number            // 最大迭代次数
  options: Record<string, any>
  color?: string            // UI 颜色
}
```

---

## 认识三种 mode

| mode       | 用户可选 | TaskTool 可用 | 典型用途                      |
| ---------- | -------- | ------------- | ----------------------------- |
| `primary`  | ✅       | ❌            | build、plan、隐藏的内部 agent |
| `subagent` | ❌       | ✅            | explore、general              |
| `all`      | ✅       | ✅            | 用户自定义的多功能 agent      |

**过滤逻辑**：

- TaskTool 初始化时：`agents.filter(a => a.mode !== "primary")`
- UI agent 选择器：显示 primary + all，排除 hidden

---

## 看懂 7 个内置 Agent

```
build       primary    默认编码 agent，所有工具可用
plan        primary    只读规划，禁止 edit/write/bash
general     subagent   多用途子 agent，禁止 todo
explore     subagent   代码探索，只能用 grep/glob/read/list/bash
compaction  primary    上下文压缩，隐藏，禁用所有工具
title       primary    标题生成，隐藏，temperature 0.5
summary     primary    摘要生成，隐藏
```

---

## 掌握权限基线

每个 agent 的权限从这个基线出发：

```ts
const defaults = {
  "*": "allow", // 默认全部允许
  doom_loop: "ask", // 死循环检测需确认
  question: "deny", // 默认禁止提问工具
  plan_enter: "deny", // 默认禁止进入 plan
  plan_exit: "deny", // 默认禁止退出 plan
  read: {
    "*": "allow",
    "*.env": "ask", // .env 文件需确认
    "*.env.*": "ask",
    "*.env.example": "allow",
  },
  external_directory: { "*": "ask" },
}
```

---

## 理解权限合并顺序

权限用 **last-match-wins** 语义，后面的规则覆盖前面的。

```
第 1 层：默认基线（最低优先级）
  { "*": "allow", question: "deny", ... }
    ↓
第 2 层：Agent 专属覆盖
  如 explore: { "*": "deny", grep: "allow", ... }
    ↓
第 3 层：用户全局配置
  如 { bash: "ask", edit: { "*.lock": "deny" } }
    ↓
第 4 层：config 中 agent 的 permission 覆盖
  如 agent.explore.permission: { bash: "ask" }
    ↓
第 5 层：安全网（Truncate.DIR 始终允许）
    ↓
第 6 层：Session 级权限（运行时）
  TaskTool 设置: { todowrite: "deny", task: "deny" }
    ↓
第 7 层：用户存储的审批（"always allow"）
```

合并过程实际上是把所有层 **拼接** 成一个扁平数组，然后 `findLast()` 匹配。

```ts
// 伪代码
PermissionNext.merge(defaults, agentSpecific, userConfig)
// → [...defaults, ...agentSpecific, ...userConfig]
// evaluate 时从后往前找第一个匹配的
```

---

## 看懂 Config 覆盖逻辑

用户在 `opencode.json` 定义的 agent 怎样与内置 agent 合并：

```ts
for (const [name, value] of Object.entries(cfg.agent)) {
  // 1. disable: true → 直接删除
  if (value.disable) {
    delete agents[name]
    continue
  }

  // 2. 不存在 → 创建新 agent
  if (!agents[name]) {
    agents[name] = {
      mode: "all",
      native: false,
      permission: merge(defaults, userPermission),
    }
  }

  // 3. 覆盖字段（config 优先于内置）
  item.model = value.model ?? item.model
  item.prompt = value.prompt ?? item.prompt
  item.description = value.description ?? item.description
  item.steps = value.steps ?? item.steps
  // ...

  // 4. 权限追加合并
  item.permission = merge(item.permission, fromConfig(value.permission ?? {}))

  // 5. options 深合并
  item.options = mergeDeep(item.options, value.options)
}
```

关键点：**用户 config 的字段用 `??` 合并**，意味着 config 中设了就覆盖，没设就保留原值。

---

## 认识 explore Agent 的权限

explore 是最有代表性的受限 agent：

```ts
// explore 的权限：只保留搜索类工具
{
  "*": "deny",           // 先全部禁止
  grep: "allow",         // 然后逐个放行
  glob: "allow",
  list: "allow",
  bash: "allow",
  webfetch: "allow",
  websearch: "allow",
  codesearch: "allow",
  read: "allow"
}
```

因为 `*: deny` 在前，再逐个 allow，所以 explore 看不到 write/edit/task 等工具。

---

## 关键文件

| 文件                            | 内容                                                |
| ------------------------------- | --------------------------------------------------- |
| `src/agent/agent.ts`            | Agent 注册表、7 个内置 agent、权限基线、config 覆盖 |
| `src/permission/next.ts`        | 权限评估、ask/reply 流程、last-match-wins           |
| `src/agent/prompt/generate.txt` | 用 LLM 自动生成 agent 配置的 meta-prompt            |

---

## 动手验证

1. 在 `agent.ts` 搜索 `PermissionNext.merge`，追踪每个 agent 的权限合并链
2. 在 config 里 `"agent": { "build": { "permission": { "bash": "ask" } } }` 覆盖默认权限
3. 用 `"agent": { "build": { "disable": true } }` 禁用内置 agent 看效果
4. 创建一个 `mode: "all"` 的自定义 agent，验证它同时出现在 UI 选择器和 TaskTool 列表里
