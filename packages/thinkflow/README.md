# ThinkFlow · 思流

**可记忆，适配多内容平台的 Agent Native 内容创作神器**

> An Agent Native content creation tool with memory — create once, remember forever.

---

## 简介 · Introduction

ThinkFlow（思流）是一款画布式 AI 内容创作桌面应用。核心理念：大模型要处理的事无非是输入和输出，我们让它们清晰可见、可管理、可视化。

ThinkFlow is a canvas-based AI content creation desktop app. Core idea: LLMs handle inputs and outputs — we make them visible, manageable, and visual.

## 文件树 · File Structure

```
packages/thinkflow/
├── app/                        # 共享 Web UI（React + @xyflow/react）
│   ├── src/
│   │   ├── types/index.ts      # 所有类型定义
│   │   ├── styles/global.css   # CSS 变量主题
│   │   ├── services/
│   │   │   └── opencodeClient.ts   # OpenCode HTTP + SSE 客户端
│   │   ├── store/
│   │   │   ├── canvasStore.ts  # 画布状态 + 工作流执行
│   │   │   └── memoryStore.ts  # 记忆库（localStorage 持久化）
│   │   ├── nodes/
│   │   │   ├── InputNode.tsx   # 输入节点（5 种类型）
│   │   │   ├── AgentNode.tsx   # Agent 节点（运行/状态）
│   │   │   └── OutputNode.tsx  # 输出节点（3 种平台）
│   │   ├── components/
│   │   │   ├── Toolbar.tsx     # 顶部工具栏
│   │   │   └── MemorySidebar.tsx  # 记忆库侧边栏
│   │   ├── pages/Canvas.tsx    # 主画布页面
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── __tests__/          # Vitest 测试套件（35 用例）
│   ├── package.json
│   ├── vite.config.ts
│   └── index.html
├── desktop/                    # Tauri 桌面壳
│   ├── src/
│   │   └── main.tsx            # 启动逻辑（sidecar 等待）
│   ├── src-tauri/
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   ├── capabilities/
│   │   │   └── default.json
│   │   └── src/
│   │       ├── main.rs
│   │       └── lib.rs          # sidecar 管理 + Tauri 命令
│   ├── package.json
│   └── vite.config.ts
└── docs/
    ├── BEGIN.md                # 产品需求文档
    └── DESIGN.md               # 设计规范
```

## 核心功能 · Features

| 功能 | 说明 |
|------|------|
| 画布编辑 | 无限画布，拖拽添加/连接节点 |
| 5 种输入 | 文本、URL、文件（PDF/图片）、记忆库、信息流（MCP） |
| Agent 节点 | 一键运行，实时状态指示灯，流式日志 |
| 3 种输出 | 知乎长文 / 微信公众号 / 日记笔记 |
| 记忆库 | 人设/素材/偏好/输出 4 类，本地持久化，支持导入导出 |
| Dry-run | 模拟运行，不调用模型，调试工作流 |
| 离线降级 | OpenCode 未启动时自动切换 Mock 演示模式 |

## 快速开始 · Quick Start

### 开发模式（Web）

```bash
cd packages/thinkflow/app
bun install
bun dev
# 打开 http://localhost:1421
```

### 桌面版开发

```bash
# 前置：安装 Rust + Tauri CLI
# macOS: brew install rust
# npm install -g @tauri-apps/cli

cd packages/thinkflow/desktop
bun install
bun tauri dev
```

> **注意**：桌面版需要将 opencode-cli 二进制文件放置到  
> `packages/thinkflow/desktop/src-tauri/sidecars/opencode-cli-<platform>-<arch>`  
> 例如 macOS M 系列：`opencode-cli-aarch64-apple-darwin`

### 配置 AI 模型

ThinkFlow 默认使用 [Claude Sonnet 4.6](https://openrouter.ai/anthropic/claude-sonnet-4.6)（通过 OpenRouter）。  
在 OpenCode 配置文件 `~/.config/opencode/opencode.json` 中添加：

```json
{
  "providers": {
    "openrouter": {
      "api_key": "sk-or-v1-..."
    }
  }
}
```

## 如何测试 · How to Test

```bash
cd packages/thinkflow/app

# 安装依赖（仅首次）
bun install

# 运行全部测试（35 个用例）
bunx vitest run

# 监听模式
bunx vitest

# 覆盖率报告
bunx vitest run --coverage
```

### 测试覆盖

| 测试文件 | 覆盖模块 | 用例数 |
|----------|----------|--------|
| `canvasStore.test.ts` | 节点操作、工作流执行、abort | 13 |
| `memoryStore.test.ts` | CRUD、搜索、导入导出 | 10 |
| `opencodeClient.test.ts` | Session API、SSE、Mock | 7 |
| `nodeTypes.test.ts` | 节点类型注册 | 5 |
| **合计** | | **35** |

## 架构说明 · Architecture

```
用户画布 (React + @xyflow/react)
    ↓
canvasStore (Zustand)
    ↓ runWorkflow()
opencodeClient.ts
    ↓ POST /session + POST /session/:id/message
OpenCode HTTP Server (localhost:4096)
    ↓ SSE GET /global/event
    ↓ 实时事件推送
canvasStore → updateNodeData → OutputNode 内容更新
```

**Sidecar 集成流程（桌面版）：**

1. Tauri 启动 → `lib.rs` 自动生成随机端口
2. spawn `opencode-cli serve --port <port>`
3. 健康检查轮询（最多 30 秒）
4. `invoke("ensure_server_ready")` 返回 server URL
5. 写入 `sessionStorage("thinkflow_server_url")`
6. App 组件使用该 URL 与 OpenCode 通信

## 技术栈 · Tech Stack

- **前端**：React 18 + TypeScript + Zustand 5 + @xyflow/react v12
- **样式**：纯 CSS 变量，无 Tailwind（深夜工作室暗色主题）
- **字体**：Syne（标题）+ Outfit（正文）+ DM Mono（代码）
- **桌面**：Tauri 2 + Rust
- **AI 内核**：OpenCode（HTTP API + SSE 事件流）
- **默认模型**：Kimi K2.6（MoonshotAI via OpenRouter）
- **测试**：Vitest + jsdom

## MVP 功能边界

✅ **已包含**：基础画布、5 种输入、3 种输出、记忆库、dry-run、Mock 模式  
❌ **未包含（预留接口）**：注册/支付、云同步、多人协作、复杂画布（循环/分支）、插件市场

---

MIT License · Built with OpenCode
