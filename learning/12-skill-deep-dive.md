# Skill 深度解析

Skill 如何被发现、加载和注入到 agent 上下文中。

---

## 理解 Skill 的本质

Skill 是一份 markdown 文件（`SKILL.md`），包含 YAML frontmatter（name + description）和正文内容。当 LLM 调用 SkillTool 时，文件内容被完整注入到对话上下文中。

Skill 不是代码，而是 **结构化知识注入**。

---

## 看懂 Skill.Info

```ts
{
  name: string // 唯一标识，如 "session-memory"
  description: string // 描述何时使用
  location: string // SKILL.md 的绝对路径
}
```

---

## 掌握发现机制

Skill 从两类目录中扫描：

### Claude 兼容 skill

```
搜索 pattern: skills/**/SKILL.md
搜索目录：
  - 从项目目录向上遍历到 worktree 的每个 .claude/ 目录
  - ~/.claude/
```

可通过 `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` 环境变量禁用。

### OpenCode skill

```
搜索 pattern: {skill,skills}/**/SKILL.md
搜索目录：
  - 所有 config 目录（.opencode/、~/.config/opencode/ 等）
```

---

## 理解 SKILL.md 格式

```markdown
---
name: session-memory
description: Track session context and save logs
---

# Session Memory

具体指令和知识内容...
```

frontmatter 必须有 `name` 和 `description`。如果缺少，该文件被跳过。

正文就是要注入给 LLM 的完整内容。

---

## 看懂 SkillTool 初始化

SkillTool 在初始化时做两件事：

### 1. 按权限过滤

```ts
const skills = await Skill.all()
const accessible = skills.filter((s) => {
  if (!ctx?.agent) return true
  const result = PermissionNext.evaluate("skill", s.name, ctx.agent.permission)
  return result.action !== "deny"
})
```

如果 agent 的权限规则里 `skill: { "session-memory": "deny" }`，该 skill 对此 agent 不可见。

### 2. 注入到描述

```xml
Load a skill to get detailed instructions for a specific task.
Skills provide specialized knowledge and step-by-step guidance.
<available_skills>
  <skill>
    <name>session-memory</name>
    <description>Track session context and save logs</description>
  </skill>
  <skill>
    <name>frontend-design</name>
    <description>Create production-grade frontend interfaces</description>
  </skill>
</available_skills>
```

LLM 看到这个列表后，根据 name 和 description 决定是否加载某个 skill。

---

## 追踪执行流程

```
1. LLM 决定需要 skill → 调用 SkillTool({ name: "session-memory" })

2. SkillTool.execute()：
   a. Skill.get("session-memory") → 查找 Skill.Info
   b. ctx.ask({ permission: "skill", patterns: ["session-memory"] })
      → 权限检查
   c. ConfigMarkdown.parse(skill.location) → 读取 SKILL.md
   d. 返回内容：

      ## Skill: session-memory

      **Base directory**: /path/to/skill/dir

      [SKILL.md 正文内容]

3. 内容被作为 tool result 注入到对话上下文
4. LLM 根据 skill 内容执行后续操作
```

---

## 创建自定义 Skill

### 项目级 skill

```
.opencode/
  skills/
    code-review/
      SKILL.md
```

```markdown
---
name: code-review
description: Perform thorough code reviews following team standards
---

# Code Review Skill

## 检查清单

1. 安全性：检查注入、XSS、CSRF
2. 性能：避免 N+1 查询、不必要的重渲染
3. 可维护性：命名规范、单一职责
   ...
```

### 全局 skill

```
~/.config/opencode/
  skills/
    git-workflow/
      SKILL.md
```

### Claude 兼容 skill

```
~/.claude/
  skills/
    my-skill/
      SKILL.md
```

---

## 理解 Skill 与 Agent Prompt 的区别

|            | Agent Prompt                              | Skill                                 |
| ---------- | ----------------------------------------- | ------------------------------------- |
| 注入时机   | Agent 启动时，作为 system prompt 的一部分 | LLM 主动调用时，作为 tool result 注入 |
| 作用范围   | 整个会话的每次 LLM 调用                   | 只影响调用后的上下文                  |
| token 消耗 | 每轮都消耗                                | 只在需要时消耗                        |
| 典型用途   | 角色定义、行为约束                        | 专项知识、操作手册                    |
| 触发方式   | 自动                                      | LLM 判断后主动加载                    |

Skill 的优势在于**按需加载**——不会浪费每轮的 token。

---

## 理解 Skill 的权限控制

可以在 agent config 里控制哪些 skill 可用：

```json
{
  "agent": {
    "build": {
      "permission": {
        "skill": {
          "*": "allow",
          "dangerous-skill": "deny"
        }
      }
    },
    "explore": {
      "permission": {
        "skill": "deny"
      }
    }
  }
}
```

explore agent 禁用所有 skill，build agent 禁用特定 skill。

---

## 关键文件

| 文件                     | 内容                   |
| ------------------------ | ---------------------- |
| `src/skill/skill.ts`     | Skill 发现、解析、缓存 |
| `src/tool/skill.ts`      | SkillTool 实现         |
| `src/config/markdown.ts` | YAML frontmatter 解析  |

---

## 动手验证

1. 在 `.opencode/skills/test/SKILL.md` 创建一个简单 skill
2. 启动 OpenCode，输入 "load the test skill"，验证 LLM 调用了 SkillTool
3. 在 agent 权限里禁用该 skill，验证它从 SkillTool 描述中消失
4. 查看 `~/.claude/` 目录，了解 Claude Code 兼容 skill 的实际文件
