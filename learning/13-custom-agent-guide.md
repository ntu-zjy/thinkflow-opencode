# 自定义 Agent 实战

从零创建自定义 Agent 的完整指南。

---

## 两种定义方式

### 方式一：JSON config

在 `opencode.json` 里定义：

```json
{
  "agent": {
    "reviewer": {
      "description": "Reviews code for best practices and security issues",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "You are a senior code reviewer...",
      "mode": "all",
      "permission": {
        "write": "deny",
        "edit": "deny",
        "bash": "deny"
      },
      "color": "#E67E22"
    }
  }
}
```

### 方式二：Markdown 文件

在 `.opencode/agent/reviewer.md`：

```markdown
---
description: Reviews code for best practices and security issues
model: anthropic/claude-sonnet-4-5
mode: all
color: "#E67E22"
permission:
  write: deny
  edit: deny
  bash: deny
---

You are a senior code reviewer. Focus on:

1. Security vulnerabilities
2. Performance bottlenecks
3. Code maintainability

When reviewing, always reference the specific file and line number.
Never suggest changes directly — only describe what should change.
```

Markdown 正文就是 `prompt` 字段。Markdown 方式更适合长 prompt。

---

## 理解每个字段

| 字段          | 类型    | 说明                                     |
| ------------- | ------- | ---------------------------------------- |
| `description` | string  | **关键**——TaskTool 用它告诉 LLM 何时调用 |
| `model`       | string  | 绑定模型，格式 `provider/model`          |
| `prompt`      | string  | system prompt 内容                       |
| `mode`        | enum    | `primary`/`subagent`/`all`               |
| `permission`  | object  | 工具权限覆盖                             |
| `color`       | string  | hex 颜色，UI 展示用                      |
| `steps`       | number  | 最大迭代次数                             |
| `temperature` | number  | 采样温度                                 |
| `top_p`       | number  | Top-P 采样                               |
| `hidden`      | boolean | 是否隐藏                                 |
| `disable`     | boolean | 禁用内置 agent                           |
| `options`     | object  | 任意扩展选项                             |

---

## 写好 description

description 直接影响 LLM 是否会自主调用你的 agent。好的 description 应该：

```
✅ "ALWAYS use this when writing documentation or README files"
✅ "Use for database schema changes and migration scripts"
✅ "Specialized in React component refactoring and optimization"

❌ "A helpful agent"          ← 太模糊
❌ "Code reviewer"            ← 没说何时用
❌ ""                         ← 空的 → LLM 被告知 "only call manually"
```

加 **ALWAYS** 前缀会让 LLM 更积极地调用。

---

## 设计权限

### 只读 agent（review/analyze）

```json
{
  "permission": {
    "write": "deny",
    "edit": "deny",
    "bash": "deny",
    "multiedit": "deny"
  }
}
```

### 单工具 agent（专用）

```json
{
  "permission": {
    "*": "deny",
    "github-pr-search": "allow"
  }
}
```

先 `*: deny` 全部禁止，再逐个放行。

### 受限写入 agent

```json
{
  "permission": {
    "edit": {
      "*": "allow",
      "*.lock": "deny",
      "*.env": "deny"
    },
    "bash": "ask"
  }
}
```

---

## 控制工具可见性

权限不仅影响执行时检查，还影响 **LLM 是否能看到工具**。

```ts
// PermissionNext.disabled() 检查
// 如果某工具对 pattern "*" 是 deny，它会从 LLM 的工具列表中完全移除
```

所以 `"bash": "deny"` 等于 LLM 完全不知道 bash 工具的存在。

而 `"bash": "ask"` 意味着 LLM 能看到 bash，调用时需要用户确认。

---

## 控制子 agent 嵌套

默认情况下子 agent 不能再调用 task tool。但可以放行：

```json
{
  "agent": {
    "orchestrator": {
      "description": "Coordinates multiple agents for complex tasks",
      "mode": "subagent",
      "permission": {
        "task": {
          "*": "allow",
          "orchestrator": "deny"
        }
      }
    }
  }
}
```

这个 agent 可以调用其他子 agent，但不能调用自己（防止无限递归）。

---

## 控制 skill 可用性

```json
{
  "agent": {
    "minimal": {
      "permission": {
        "skill": "deny"
      }
    },
    "full": {
      "permission": {
        "skill": {
          "*": "allow",
          "dangerous": "deny"
        }
      }
    }
  }
}
```

---

## 实战示例

### 文档写作 agent

`.opencode/agent/docs.md`：

```markdown
---
description: ALWAYS use this when writing docs
color: "#38A3EE"
mode: all
---

You are an expert technical documentation writer.

Rules:

- Keep paragraphs under 2 sentences
- Use imperative mood for section titles
- Code snippets must be runnable
- Never add trailing semicolons in JS/TS examples
```

### API 测试 agent

`.opencode/agent/api-test.md`：

```markdown
---
description: Use when testing REST APIs or writing API test cases
model: anthropic/claude-sonnet-4-5
mode: subagent
permission:
  write: deny
  edit: deny
---

You are an API testing specialist.

Focus on:

- Edge cases and error handling
- Authentication and authorization
- Rate limiting behavior
- Response schema validation

Use bash with curl to test endpoints. Report results in a table.
```

### 安全审计 agent

```json
{
  "agent": {
    "security": {
      "description": "Use for security audits and vulnerability analysis",
      "mode": "subagent",
      "prompt": "You are a security expert...",
      "permission": {
        "write": "deny",
        "edit": "deny",
        "bash": {
          "*": "ask"
        }
      },
      "steps": 20
    }
  }
}
```

---

## Markdown 文件放置位置

| 位置                         | 作用域           |
| ---------------------------- | ---------------- |
| `.opencode/agent/`           | 当前项目         |
| `~/.config/opencode/agent/`  | 全局（所有项目） |
| `OPENCODE_CONFIG_DIR/agent/` | 自定义目录       |

支持嵌套目录。文件名（去除 `.md`）就是 agent 名称。

```
.opencode/agent/
  docs.md           → agent name: "docs"
  testing/
    unit.md         → agent name: "testing/unit"
```

---

## 调试技巧

1. **看 Agent 列表**：运行后按模型选择快捷键，看自定义 agent 是否出现
2. **看 TaskTool 描述**：在子 agent 场景下，检查你的 agent 是否在可用列表中
3. **看权限**：如果工具没出现，检查权限规则是否意外 deny 了
4. **看 mode**：`primary` agent 不会出现在 TaskTool 里

---

## 关键文件

| 文件                     | 内容                      |
| ------------------------ | ------------------------- |
| `src/agent/agent.ts`     | Agent 注册和合并逻辑      |
| `src/config/config.ts`   | loadAgent() markdown 解析 |
| `src/config/markdown.ts` | YAML frontmatter 解析     |
| `src/tool/task.ts`       | SubAgent 过滤和描述注入   |
| `src/permission/next.ts` | 权限评估                  |
