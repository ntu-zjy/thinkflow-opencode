# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作提供指导。

## 构建与开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器（针对 packages/opencode 运行 TUI）
bun dev

# 针对指定目录运行
bun dev <directory>
bun dev .  # 针对仓库根目录运行

# 构建独立可执行文件
./packages/opencode/script/build.ts --single
# 输出路径: ./packages/opencode/dist/opencode-<platform>/bin/opencode

# 类型检查
bun turbo typecheck
# 仅检查 opencode 包:
bun run --cwd packages/opencode typecheck

# 运行所有测试
bun turbo test
# 运行单个测试文件:
bun test packages/opencode/test/tool/tool.test.ts

# API 变更后重新生成 SDK
./script/generate.ts

# Web 应用开发
bun run --cwd packages/app dev

# 桌面应用开发（需要 Tauri/Rust）
bun run --cwd packages/desktop tauri dev
```

## 仓库结构

这是一个使用 workspaces 的 Bun monorepo。主要包：

- **packages/opencode** - 核心业务逻辑、服务器和 TUI（SolidJS + OpenTUI）
- **packages/app** - 共享 Web UI 组件（SolidJS）
- **packages/desktop** - 原生桌面应用（Tauri 封装 packages/app）
- **packages/sdk/js** - TypeScript SDK (`@opencode-ai/sdk`)
- **packages/plugin** - 插件系统 (`@opencode-ai/plugin`)

### OpenCode 核心架构 (packages/opencode/src/)

- **session/** - 会话管理和对话状态
- **tool/** - 工具实现（文件操作、bash、搜索等）
- **provider/** - AI 提供商集成（Anthropic、OpenAI、Google 等）
- **server/** - HTTP 服务器，暴露 API
- **cli/** - CLI 入口和 TUI 代码
- **mcp/** - Model Context Protocol 实现
- **lsp/** - Language Server Protocol 集成
- **agent/** - Agent 定义（build、plan）

## 代码风格

- 尽量使用 Bun API（如 `Bun.file()` 等）
- 避免 `let` - 优先使用 `const` 配合三元表达式或提前返回
- 避免 `else` 语句 - 使用提前返回
- 避免 `try/catch` - 尽量使用 `.catch()`
- 避免 `any` 类型
- 变量名尽量使用单个单词
- 避免不必要的解构 - 使用 `obj.a` 而非 `const { a } = obj`
- 基于命名空间的组织方式（如 `Tool.define()`、`Session.create()`）
- 使用 Zod schema 进行验证，TypeScript interface 定义结构
- 使用 `Log.create({ service: "name" })` 进行日志记录

## 关键约定

- 默认分支是 `dev`
- PR 标题遵循 conventional commits: `feat:`、`fix:`、`docs:`、`chore:`、`refactor:`、`test:`
- 尽可能使用并行工具调用
- 修改服务器端点（`packages/opencode/src/server/server.ts`）后，需运行 `./script/generate.ts` 重新生成 SDK
- SolidJS 中优先使用 `createStore` 而非多个 `createSignal`

## Agents

内置 Agent，可通过 Tab 键切换：
- **build** - 完全访问权限的开发 Agent（默认）
- **plan** - 只读 Agent，用于分析和代码探索
