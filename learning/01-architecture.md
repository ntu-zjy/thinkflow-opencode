# 架构总览

OpenCode 的全局视角：monorepo 结构、技术栈和数据流。

---

## 理解定位

OpenCode 是一个开源 AI 编码代理。它的核心是一个 **client/server 架构**——server 负责 AI 推理和工具执行，client 负责 UI 渲染。

TUI、Web、Desktop 都是 client，通过 REST API + SSE 与同一个 server 通信。

---

## 掌握技术栈

| 层        | 技术                      | 用途                    |
| --------- | ------------------------- | ----------------------- |
| 运行时    | Bun 1.3+                  | 全项目的运行和构建      |
| 语言      | TypeScript                | 类型安全                |
| 包管理    | Bun workspace + Turborepo | monorepo 管理和构建编排 |
| HTTP 框架 | Hono                      | server 的 REST API      |
| AI SDK    | Vercel `ai` v5            | LLM 流式调用            |
| Schema    | Zod v4                    | 运行时校验和类型推导    |
| UI 框架   | SolidJS                   | TUI + Web 共用          |
| TUI 渲染  | opentui                   | 自研终端渲染引擎        |
| Desktop   | Tauri v2                  | 原生壳包裹 Web UI       |
| CSS       | Tailwind CSS v4           | Web/Desktop 样式        |

---

## 认识包结构

monorepo 包含以下核心包：

```
packages/
  opencode/        # 核心包：server、CLI、TUI、AI 循环、工具、provider
  app/             # Web UI：SolidJS 应用
  desktop/         # Desktop：Tauri v2 壳
  ui/              # 共享 UI 组件：markdown 渲染、diff、代码高亮
  sdk/js/          # JS SDK：从 OpenAPI 自动生成
  plugin/          # 插件接口：类型定义和契约
  util/            # 工具函数：错误处理、二分查找、重试
  web/             # 官网：Astro 静态站
```

核心逻辑几乎全部在 `packages/opencode/src/` 里。其他包要么是 UI 客户端，要么是工具类。

---

## 看懂核心目录

`packages/opencode/src/` 的关键目录：

```
src/
  index.ts          # CLI 入口，yargs 命令注册
  agent/            # Agent 定义（build、plan、explore 等）
  session/          # 会话管理 + 主循环（prompt.ts 是核心）
  server/           # Hono HTTP server + SSE + WebSocket
  tool/             # 内置工具（bash、read、write、edit、grep...）
  provider/         # 20+ AI provider 接入
  config/           # 层叠配置系统
  bus/              # 事件总线（pub/sub）
  storage/          # JSON 文件存储
  project/          # 项目检测 + 实例隔离
  permission/       # 权限系统
  plugin/           # 插件加载器
  mcp/              # MCP 协议客户端
  lsp/              # LSP 集成
  cli/cmd/tui/      # TUI 界面组件
```

---

## 追踪数据流

一条消息从用户输入到 AI 回复的完整路径：

```
1. 用户在 TUI/Web 输入消息
        |
2. Client 调用 POST /session/:id/message（通过 SDK）
        |
3. Server 创建 UserMessage，写入 Storage
        |
4. SessionPrompt.loop() 启动：
   a. 从 Storage 加载所有消息
   b. 组装 system prompt + 工具列表
   c. 调用 LLM.stream() → ai-sdk streamText()
        |
5. 流式处理（SessionProcessor）：
   - text chunk → TextPart → Bus.publish()
   - tool call → 执行工具 → ToolPart → Bus.publish()
   - reasoning → ReasoningPart → Bus.publish()
        |
6. Bus → GlobalBus → SSE 推送到 Client
        |
7. Client 收到 SSE 事件，更新 SolidJS store
```

---

## 理解模块关系

关键模块的依赖关系：

```
Instance (AsyncLocalStorage 作用域)
    ├── Config (层叠配置)
    ├── Storage (JSON 文件持久化)
    ├── Bus (事件发布/订阅)
    ├── Provider (AI 模型接入)
    ├── Agent (agent 定义和解析)
    ├── ToolRegistry (工具发现和管理)
    ├── MCP (外部工具协议)
    ├── Plugin (插件钩子)
    └── SessionPrompt (核心循环，组合以上所有)
            |
        Server (Hono HTTP)
            |
        Client (TUI / Web / Desktop / SDK)
```

`Instance` 是地基——所有其他模块都依赖它来做项目级隔离。`SessionPrompt` 是中枢——它编排所有模块完成 AI 对话循环。

---

## 动手验证

1. 运行 `bun dev`（在 `packages/opencode` 目录）启动开发模式
2. 打开 `src/index.ts`，追踪默认命令如何启动 server 和 TUI
3. 在 `src/server/server.ts` 里找到 SSE endpoint（`/global/event`）
4. 在 `src/session/prompt.ts` 里找到 `loop()` 函数——这是整个项目的心脏
