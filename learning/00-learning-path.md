# OpenCode 学习路径

从零到像素级复刻的系统性学习计划。

---

## 前置知识

开始前确保你熟悉以下技术栈：

- **TypeScript** — 命名空间、泛型、条件类型、模板字面量类型
- **Zod v4** — schema 定义、类型推导、discriminated union
- **Bun** — 运行时 API（`Bun.file()`、`Bun.write()`）、workspace
- **SolidJS** — 响应式原语（signal、store、memo）、context provider
- **Hono** — 路由、中间件、OpenAPI 集成

---

## 学习路线

按顺序推进，每个阶段都有对应的深入文档。

### 基础篇

| 阶段 | 主题                                      | 核心文件                                        | 目标                              |
| ---- | ----------------------------------------- | ----------------------------------------------- | --------------------------------- |
| 1    | [架构总览](./01-architecture.md)          | `package.json`, 各 package 入口                 | 理解全貌和模块边界                |
| 2    | [实例与状态](./02-instance-state.md)      | `project/instance.ts`, `project/state.ts`       | 掌握 AsyncLocalStorage 作用域机制 |
| 3    | [存储与配置](./03-storage-config.md)      | `storage/storage.ts`, `config/config.ts`        | 理解数据持久化和配置层叠          |
| 4    | [事件总线](./04-event-bus.md)             | `bus/bus-event.ts`, `bus/index.ts`              | 掌握模块间通信机制                |
| 5    | [Provider 体系](./05-provider.md)         | `provider/provider.ts`, `provider/transform.ts` | 理解多模型接入架构                |
| 6    | [Tool 系统](./06-tool-system.md)          | `tool/tool.ts`, `tool/registry.ts`              | 掌握工具定义和注册                |
| 7    | [Agent 与会话循环](./07-agent-session.md) | `agent/agent.ts`, `session/prompt.ts`           | 理解核心 agentic loop             |
| 8    | [TUI 与客户端](./08-tui-client.md)        | `cli/cmd/tui/app.tsx`, `packages/app`           | 掌握 UI 渲染和状态同步            |
| 9    | [设计模式速查](./09-patterns.md)          | 贯穿全项目                                      | 内化代码风格和惯用写法            |

### 深入篇：Agent / SubAgent / Skill

| 阶段 | 主题                                            | 核心文件                               | 目标                                |
| ---- | ----------------------------------------------- | -------------------------------------- | ----------------------------------- |
| 10   | [Agent 深度解析](./10-agent-deep-dive.md)       | `agent/agent.ts`, `permission/next.ts` | 掌握 Agent 定义、权限基线和合并链   |
| 11   | [SubAgent 深度解析](./11-subagent-deep-dive.md) | `tool/task.ts`, `session/prompt.ts`    | 掌握子会话创建、任务委派和结果回传  |
| 12   | [Skill 深度解析](./12-skill-deep-dive.md)       | `skill/skill.ts`, `tool/skill.ts`      | 掌握 Skill 发现、按需加载和权限控制 |
| 13   | [自定义 Agent 实战](./13-custom-agent-guide.md) | `.opencode/agent/`, `config/config.ts` | 能独立创建各类自定义 Agent          |
| 14   | [完整生命周期](./14-lifecycle-diagram.md)       | 全链路                                 | 追踪从用户输入到 LLM 回复的每一步   |

### 深入篇：上下文管理

| 阶段 | 主题                                     | 核心文件                                     | 目标                                   |
| ---- | ---------------------------------------- | -------------------------------------------- | -------------------------------------- |
| 15   | [上下文管理](./15-context-management.md) | `prompt.ts`, `compaction.ts`, `transform.ts` | 理解上下文拼接、裁剪、压缩的完整流水线 |

### 产品篇：MVP 方案

| 阶段 | 主题                                           | 内容                             | 目标                         |
| ---- | ---------------------------------------------- | -------------------------------- | ---------------------------- |
| 20   | [MVP 产品方案](./20-mvp-plan.md)               | 架构、数据模型、UI、技术栈、范围 | 明确产品方向和第一版实现方案 |
| 21   | [邀请码与积分体系](./21-invite-and-credits.md) | 邀请码、积分、充值、支付、风控   | 设计用户增长和商业化基础设施 |

---

## 学习策略

**第一遍**：通读所有文档，建立心智模型。不要急着看源码。

**第二遍**：对照文档读源码。每个模块从入口文件开始，沿着导入链条追踪。

**第三遍**：做修改实验。比如添加一个自定义 tool、创建一个新 agent、修改 TUI 组件。

**第四遍**：尝试复刻一个简化版本。从 Instance + Storage + Bus 三件套开始，逐步叠加功能。

---

## 关键洞察

在开始前记住这几点：

- 整个项目用 **namespace** 替代 class，用 **`fn()` 包装器** 替代 try/catch
- 所有状态通过 **AsyncLocalStorage** 按项目目录隔离
- 数据层是纯 **JSON 文件**，没有数据库
- 客户端（TUI/Web/Desktop）通过 **SSE + REST API** 与 server 通信
- 每个数据类型都先定义 **Zod schema**，再推导 TypeScript 类型
