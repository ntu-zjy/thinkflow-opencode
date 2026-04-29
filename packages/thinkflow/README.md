# 思流 · ThinkFlow

**可记忆，适配多内容平台的 Agent Native 内容创作神器**

> An agent-native content creation tool with memory — runs on an infinite canvas, writes for any platform.

---

## 产品定位 · Positioning

大模型要处理的事情无非是输入和输出，思流让输入和输出都**清晰可见、可管理、可视化**。

> The model only deals with inputs and outputs. ThinkFlow makes both **visible, manageable, and visual**.

---

## 文件树 · File Structure

```
packages/thinkflow/
├── app/                          # React 前端（共享 Web+Desktop）
│   ├── src/
│   │   ├── nodes/                # 画布节点组件
│   │   │   ├── InputNode.tsx     # 输入节点（文本/URL/文件/记忆/信息流）
│   │   │   ├── AgentNode.tsx     # Agent 节点（模型选择/想法/运行状态）
│   │   │   ├── OutputNode.tsx    # 输出节点（知乎/公众号/日记）
│   │   │   └── index.ts          # nodeTypes 注册表
│   │   ├── store/
│   │   │   ├── canvasStore.ts    # 画布状态（节点/边/工作流执行）
│   │   │   └── memoryStore.ts    # 记忆库状态（持久化到 localStorage）
│   │   ├── services/
│   │   │   └── opencodeClient.ts # OpenCode HTTP API 客户端 + mock 模式
│   │   ├── pages/
│   │   │   └── Canvas.tsx        # 主画布页（ReactFlow + 右键菜单）
│   │   ├── components/
│   │   │   ├── Toolbar.tsx       # 顶部工具栏
│   │   │   └── MemorySidebar.tsx # 记忆库侧边栏
│   │   ├── types/
│   │   │   └── index.ts          # 所有类型定义
│   │   ├── styles/
│   │   │   └── global.css        # 全局 CSS 变量 + 动画
│   │   ├── App.tsx               # 根组件
│   │   ├── main.tsx              # 入口
│   │   └── __tests__/            # Vitest 测试
│   │       ├── setup.ts
│   │       ├── memoryStore.test.ts
│   │       ├── canvasStore.test.ts
│   │       ├── opencodeClient.test.ts
│   │       └── nodeTypes.test.ts
│   ├── package.json
│   ├── vite.config.ts            # Vite dev port 1421
│   └── tsconfig.json
│
├── desktop/                      # Tauri 2 桌面壳
│   ├── src/
│   │   └── main.tsx              # Tauri 入口
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── lib.rs            # Tauri 应用（http/dialog/store 插件）
│   │   │   └── main.rs           # 二进制入口
│   │   ├── tauri.conf.json       # 产品名 ThinkFlow, devUrl :1421
│   │   ├── capabilities/
│   │   │   └── default.json      # 允许 http://localhost:4096/*
│   │   └── Cargo.toml
│   └── package.json
│
└── docs/
    ├── DESIGN.md                 # UI/UX 设计规范
    └── BEGIN.md                  # 产品需求文档
```

---

## 技术栈 · Tech Stack

| 层级 | 技术 |
|------|------|
| 画布引擎 | @xyflow/react v12 |
| 状态管理 | Zustand v5 + persist |
| UI 框架 | React 18 + Chakra UI v3 |
| 样式系统 | 纯 CSS 变量（无 Tailwind） |
| 字体 | Syne (标题) · Outfit (正文) · DM Mono (代码) |
| 桌面壳 | Tauri 2 (Rust + WebView) |
| AI 后端 | OpenCode HTTP API (localhost:4096) |
| 默认模型 | moonshotai/kimi-k2.6 (via OpenRouter) |
| 测试 | Vitest + jsdom + @testing-library/react |

---

## MVP 功能 · MVP Features

- **输入节点** — 5 种输入类型：文本 / URL / 文件拖拽 / 记忆库 / MCP 信息流
- **Agent 节点** — 运行状态指示灯 + 想法输入框 + 日志抽屉 + 运行/停止按钮
- **输出节点** — 3 种平台格式（知乎/公众号/日记笔记）+ Markdown 预览 + 一键存记忆
- **记忆库** — 4 类记忆（人设/素材/偏好/输出）+ 搜索 + 导入导出 JSON
- **画布操作** — 缩放/拖拽/右键菜单/连线规则校验
- **干运行模式** — OpenCode 未启动时自动切换 mock，展示假流式输出
- **内置 AI 引擎** — 桌面版打包时内置 opencode-cli，用户一键安装即可使用，无需手动配置

---

## 快速开始 · Getting Started

### 面向用户：直接下载安装包

```
ThinkFlow-macOS.dmg   →  双击安装，直接打开即用
ThinkFlow-Windows.msi →  下一步安装，桌面快捷方式
ThinkFlow-Linux.deb   →  dpkg -i 安装
```

打开应用后，AI 引擎（opencode）会**自动在后台启动**，无需任何额外配置。

### 面向开发者：本地运行

**前置条件：** [Bun](https://bun.sh) v1.3+、Node.js 20+

#### 启动 Web 开发服务器（最快，推荐调试 UI）

```bash
cd packages/thinkflow/app
bun install
bun run dev
# 浏览器打开 http://localhost:1421
```

此模式无 Rust 工具链要求。若未连接 OpenCode，自动进入 **mock 模式**（展示模拟流式输出）。

#### 启动完整桌面应用（包含 opencode sidecar）

```bash
# 前置条件：Rust 工具链（https://rustup.rs）+ Tauri CLI
cd packages/thinkflow/desktop
bun install

# 开发模式（Vite + Tauri 窗口，opencode 自动后台启动）
bun run tauri dev

# 生产构建（输出 .dmg / .msi / .deb 安装包）
bun run tauri build
```

构建产物在 `desktop/src-tauri/target/release/bundle/` 目录下。

#### sidecar 说明

| 文件 | 说明 |
|------|------|
| `desktop/src-tauri/sidecars/opencode-cli-aarch64-apple-darwin` | macOS Apple Silicon 可执行文件 |
| `desktop/src-tauri/sidecars/opencode-cli-x86_64-apple-darwin` | macOS Intel（需另行构建） |
| `desktop/src-tauri/sidecars/opencode-cli-x86_64-pc-windows-msvc.exe` | Windows（需另行构建） |

构建其他平台的 sidecar：
```bash
# 在对应平台上运行（或通过 CI）
./packages/opencode/script/build.ts --single
# 输出到 packages/opencode/dist/opencode-<platform>/bin/opencode
# 复制到 desktop/src-tauri/sidecars/ 并按 Tauri 命名规范重命名
```

---

## 测试 · Testing

```bash
cd packages/thinkflow/app

# 运行全部测试（28 个用例）
bun run test

# 持续监听模式
bun run test:watch
```

### 测试覆盖范围

| 测试文件 | 覆盖内容 | 用例数 |
|---------|---------|--------|
| `memoryStore.test.ts` | 记忆库 CRUD / 搜索 / 导入导出 | 8 |
| `canvasStore.test.ts` | 节点增删 / 状态更新 / 工作流触发 | 10 |
| `opencodeClient.test.ts` | Session 创建 / mock 模式回退 / 事件订阅 | 5 |
| `nodeTypes.test.ts` | 节点类型注册校验 | 5 |

---

## 工作流示例 · Example Workflow

```
[输入节点: 文本]          [输入节点: URL]
   "今天看到一篇论文..."    "https://arxiv.org/..."
         ↘                     ↙
          [Agent 节点]
          想法: "写一篇知乎文章，500字，有趣易懂"
          模型: Kimi K2.6
                 ↓
          [输出节点: 知乎]
          预览 → 复制 → 存入记忆
```

---

## 路线图 · Roadmap

| 阶段 | 功能 |
|------|------|
| MVP ✅ | 基础画布 · 记忆库 · 3 种输出平台 · mock 模式 |
| v0.2 | 记忆节点直接连线 · 模板市场 · 账号注册 |
| v0.3 | 循环/条件分支画布 · 多人协作 · 云端同步 |
| v1.0 | 邀请码分销 · 支付系统 · 插件市场 |

---

## 贡献 · Contributing

代码全部在 `packages/thinkflow/` 目录下。架构目标：**接口清晰、易改装、拒绝过度工程化**。

欢迎 PR 和 Issue！

---

*ThinkFlow — Make your thoughts flow.*
