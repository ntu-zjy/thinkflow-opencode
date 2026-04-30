# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 构建与开发命令

```bash
# Web 开发（自动启动 OpenCode 服务）
cd packages/thinkflow/app
bun install
bun dev          # http://localhost:1421

# 桌面版开发（需要 Rust + Tauri CLI）
cd packages/thinkflow/desktop
bun install
bun tauri dev

# 测试
cd packages/thinkflow/app
bunx vitest run            # 全部 35 个用例
bunx vitest                # 监听模式
bunx vitest run --coverage # 覆盖率报告

# 类型检查
bun run typecheck
```

`bun dev` 会通过 `vite.config.ts` 中的内联 Vite 插件自动启动 OpenCode 服务（port 4096）。若服务已运行则跳过启动。

## 架构

```
用户画布 (React + @xyflow/react)
    ↓
canvasStore (Zustand，localStorage 持久化)
    ↓ runWorkflow()
opencodeClient.ts
    ↓ POST /session  →  POST /session/:id/message
OpenCode HTTP Server (localhost:4096)
    ↓ SSE GET /global/event
    ↓ 实时事件推送
canvasStore → updateNodeData → OutputNode 内容更新
```

**数据流核心**：每个输出节点独立创建一个 OpenCode session，通过 `Promise.all` 并行执行，各自订阅全局 SSE 流并按 `sessionID` 过滤事件。

**离线降级**：`isServerAvailable()` 检查健康端点，失败时切换到 `runMockWorkflow()`（流式字符串分块）。

**Dry-run 模式**：AgentNode `dryRun: true` 时直接走 `runMockWorkflow`，不调用 OpenCode。

## 包结构

```
packages/thinkflow/
├── app/                        # 共享 Web UI（React + @xyflow/react）
│   └── src/
│       ├── types/index.ts      # 所有类型定义（唯一数据模型来源）
│       ├── services/opencodeClient.ts  # OpenCode HTTP + SSE 客户端
│       ├── store/
│       │   ├── canvasStore.ts  # 画布状态 + runWorkflow / abortWorkflow
│       │   └── memoryStore.ts  # 记忆库（localStorage 持久化）
│       ├── nodes/              # InputNode / AgentNode / OutputNode
│       ├── components/         # Toolbar / MemorySidebar
│       └── pages/Canvas.tsx    # 主画布（右键菜单触发 addNode）
├── desktop/                    # Tauri 桌面壳
│   └── src-tauri/src/lib.rs   # sidecar 管理（随机端口 + 健康检查）
└── docs/                       # 设计文档
```

## 关键约定

- **节点类型**：三种节点类型（`"input"` / `"agent"` / `"output"`），类型定义在 `types/index.ts`，注册在 `nodes/index.ts`
- **状态管理**：`canvasStore` 用 Zustand persist 持久化，`partialize` 跳过 `status`/`logs`/`sessionId` 等运行时字段
- **SSE 过滤**：全局事件流需按 `sessionID` 过滤，避免多 session 并发时串台
- **VITE_OPENCODE_WORKDIR**：vite `define` 注入构建时工作目录路径，避免硬编码绝对路径
- **模型默认值**：`moonshotai/kimi-k2.6`（via OpenRouter），provider 固定为 `openrouter`
- **主题**：双主题（`light` / `dark`）通过 `data-theme` 属性 + CSS 变量切换，存 localStorage

## 桌面版（Tauri）

`lib.rs` 启动流程：
1. `find_free_port()` 随机分配端口
2. spawn `opencode-cli serve --port <port>` sidecar
3. 健康检查轮询（最多 60 次，每次 500ms）
4. 前端通过 `invoke("ensure_server_ready")` 获取 server URL
5. 写入 `sessionStorage("thinkflow_server_url")`，`opencodeClient.getBaseUrl()` 优先读取

sidecar 二进制须放置于：
`desktop/src-tauri/sidecars/opencode-cli-<target-triple>`（例：`opencode-cli-aarch64-apple-darwin`）

## AI 模型配置

在 `~/.config/opencode/opencode.json` 中添加 OpenRouter key：

```json
{
  "providers": {
    "openrouter": {
      "api_key": "sk-or-v1-..."
    }
  }
}
```
