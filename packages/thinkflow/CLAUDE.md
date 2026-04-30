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

## 交付前必须完成的测试

**每次代码交付前，必须通过以下验证，不能只跑单元测试就认为完成：**

### 1. 自动化测试（必须全部通过）
```bash
cd packages/thinkflow/app
bun run typecheck          # 零 TS 错误
bunx vitest run            # 全部用例通过
```

### 2. 真实场景冒烟测试（必须手动验证）
启动开发服务（`bun dev`，http://localhost:1421），OpenCode 服务需在线（localhost:4096），逐项确认：

| 场景 | 验证要点 |
|------|---------|
| **文本生成** | 选择知乎/公众号/日记平台，填写输入，点击运行，OutputNode 卡片实时流式显示文本内容 |
| **图片生成（小红书）** | 选择小红书平台，点击运行，OutputNode 卡片应显示真实生成的图片（非 Mock SVG 占位图）；Modal 弹窗内图片正常渲染，"下载图片"按钮可用 |
| **Modal 弹窗** | 有内容时点放大按钮，弹窗正常打开；ESC/点背景关闭；文本模式下预览/原文切换正常 |
| **快捷键** | ⌘Z 撤销 / ⌘⇧Z 重做可用；⌘A 全选节点；Space 归位；⌘↵ 运行 Agent |
| **Abort** | 运行中点击停止，Agent 状态恢复 idle，连接线动画停止 |

### 3. 图片生成专项说明

小红书平台图片生成使用独立的图片生成模型，**不能用文本模型（如 Kimi K2）代替**：
- **Dry-run / 离线降级**：返回 SVG 占位图（Mock），用于本地调试
- **真实生成**：AgentNode 需选择图片生成模型（如 `openai/gpt-image-1` via OpenRouter），由 OpenCode 返回 `part.type === "file"` 的 SSE 事件，canvasStore 捕获后更新 `OutputNodeData.images`
- 如果当前模型无法生成图片（返回文字说明），视为**功能未完成**，需切换模型或调整提示词

> ⚠️ 单元测试（vitest）只验证逻辑正确性，不能替代真实 OpenCode + 真实模型的端到端验证。

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
