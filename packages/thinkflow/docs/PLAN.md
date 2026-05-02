# ThinkFlow 实现计划

> 本文件内容来自开发过程中的 plan mode 规划，包含 MVP 初始计划与后续迭代更新。

---

## 技术栈

- React 18 + TypeScript + Zustand 5 + @xyflow/react v12
- Vite 开发服务器（端口 1421）
- Vitest + jsdom 测试
- 无 Tailwind — 纯 CSS 变量双主题

---

## 文件结构

```
packages/thinkflow/
├── app/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types/index.ts
│       ├── styles/global.css
│       ├── services/
│       │   └── opencodeClient.ts
│       ├── store/
│       │   ├── canvasStore.ts
│       │   └── memoryStore.ts
│       ├── nodes/
│       │   ├── index.ts
│       │   ├── InputNode.tsx
│       │   ├── AgentNode.tsx
│       │   └── OutputNode.tsx
│       ├── components/
│       │   ├── Toolbar.tsx
│       │   ├── WorkflowSidebar.tsx   ← 多画布侧边栏 + 记忆入口
│       │   ├── MemoryPanel.tsx       ← 全屏记忆面板（替代 MemorySidebar）
│       │   ├── MemorySidebar.tsx     ← 保留备用，不再主动使用
│       │   └── OutputModal.tsx
│       ├── pages/
│       │   └── Canvas.tsx
│       └── __tests__/
│           ├── setup.ts
│           ├── canvasStore.test.ts
│           ├── memoryStore.test.ts
│           ├── opencodeClient.test.ts
│           └── nodeTypes.test.ts
└── docs/
    ├── BEGIN.md   (禁止改动，仅人工维护)
    ├── DESIGN.md  (禁止改动，仅人工维护)
    ├── UI_SPEC.md
    └── PLAN.md    (本文件)
```

---

## Phase 1：app 包基础框架

1. **package.json** — 依赖：react 18, @xyflow/react ^12, zustand ^5, react-markdown, remark-gfm, nanoid, clsx
2. **vite.config.ts** — 端口 1421（避免与 desktop 1420 冲突）；内置 `opencodePlugin` 自动启动 OpenCode（见 Phase 10）
3. **tsconfig.json** — typeRoots 指向本包 node_modules，固定 @types/react@18.2.79
4. **index.html** — 加载 Syne + Outfit + DM Mono Google Fonts

---

## Phase 2：类型系统

**`src/types/index.ts`**：

- `InputType`: `"text" | "url" | "file" | "memory" | "feed"`
- `InputNodeData`: `inputType, value, label, mcpTool`
- `AgentNodeData`: `idea, model, status: "idle"|"running"|"done"|"error", logs[], sessionId, dryRun`
- `OutputNodeData`: `platform: "zhihu"|"wechat"|"diary"|"xiaohongshu", content, label, images?, contentType?`
- `ImageAsset`: `id, url, title?, generatedAt?`
- `MemoryFolderType`: `"persona"|"material"|"preference"|"output"|"other"|string`（支持用户自定义分类类型）
- `MemoryFolder`: `id, type, name, createdAt, isDefault?`
- `MemoryEntry`, — 记忆库条目结构
- `OpenCodeEvent`, `MessagePartUpdatedEvent`, `SessionIdleEvent` — SSE 事件类型

---

## Phase 3：服务层

**`src/services/opencodeClient.ts`**：

- `getBaseUrl()` — 读取 `sessionStorage("thinkflow_server_url")` 或 `localhost:4096`
- `createSession()` → `POST /session?directory=<OPENCODE_WORKDIR>`
- `sendPrompt(sessionId, parts, model)` → `POST /session/:id/message?directory=<OPENCODE_WORKDIR>`
- `abortSession(sessionId)` → `POST /session/:id/abort`
- `subscribeEvents(cb)` → `GET /global/event`（SSE）
- `isServerAvailable()` → `GET /global/health`（注意：不是 `/health`）
- `convertFileToMarkdown(file)` → `POST /api/convert-to-markdown`（Vite 内嵌端点，见 Phase 14）
- Mock 模式：OpenCode 不可用时模拟流式输出

**关键约束 — OpenCode API**：

1. `POST /session` 和 `POST /session/:id/message` 都必须带 `?directory=` 查询参数，且必须与 OpenCode 服务启动时的 `cwd` 一致（即 `packages/opencode` 的绝对路径）。若 directory 不匹配，session 存储在 `global` project 下，但 message 路由按 git repo project 查找，导致 `NotFoundError`。

2. SSE 事件 `message.part.updated` 的流式文本增量在 `properties.delta`，不在 `properties.part.text`：
   ```
   { payload: { type: "message.part.updated", properties: { part: {...}, delta: "文本增量" } } }
   ```

3. `session.idle` 事件的 `properties.sessionID` 用于过滤当前 session，避免多 session 串扰。

---

## Phase 4：状态管理

**`src/store/canvasStore.ts`**（Zustand）：

- `nodes`, `edges`, ReactFlow callbacks
- `addNode(type, position?, initialData?)` — 添加节点，支持预设 `inputType` / `platform`
- `updateNodeData(id, data)` — 更新节点数据
- `runWorkflow(agentNodeId)` — 核心工作流执行：
  1. 找到 agentNodeId 上游所有 InputNode，构建 `parts[]`
  2. 找到下游所有 OutputNode，`Promise.all` 并行执行各自独立 session
  3. `dryRun` 为 true → `runMockWorkflow`
  4. `isServerAvailable()` 为 false → `runMockWorkflow`（演示模式）
  5. 先 `subscribeEvents()` 订阅 SSE，再 `createSession()` → `sendPrompt()`
  6. `message.part.updated` → `delta` 追加到 OutputNode.content
  7. `session.idle` → status = "done"
- `abortWorkflow(agentNodeId)` — 关闭 SSE、调用 `abortSession`
- **多工作流支持**：
  - `WorkflowRecord { id, name, nodes, edges, history, historyIndex }`
  - `workflows: Record<string, WorkflowRecord>`，`activeWorkflowId`
  - `createWorkflow()` / `switchWorkflow(id)` / `closeWorkflow(id)` / `renameWorkflow(id, name)`
  - `_saveCurrentWorkflow()` — 切换前保存当前画布状态到 `workflows[activeWorkflowId]`
  - `partialize` 持久化 `activeWorkflowId` + `workflows`（不持久化 history），persist key: `thinkflow-canvas-v2`
  - `onRehydrateStorage` 从 `workflows[activeWorkflowId]` 恢复 `nodes/edges`

**`src/store/memoryStore.ts`**（Zustand + persist to localStorage）：

- `folders[]`, `entries[]`
- `addFolder(type, name)` / `removeFolder(id)` / `renameFolder(id, name)`
- `addEntry({ folderId, title, content, tags? })`
- `searchEntries(query)`
- `importFromJson(json)`, `exportToJson()`
- **默认分类**（`isDefault: true`，不可删除）：人设 / 灵感 / 素材 / 作品 / 其他
- `onRehydrateStorage` 自动迁移旧分类名称（账号人设→人设，想法记忆→灵感，关键信息→素材，作品记忆→作品），并补全缺失的默认分类

---

## Phase 5：节点组件

节点组件直接使用 `@xyflow/react` 的 `Handle`，不额外套壳。

**`InputNode.tsx`**：
- 5 标签切换（文本 / URL / 文件 / 记忆 / 信息流）
- Handle `type="source"` 位于右侧（`Position.Right`）
- 父容器 `className="tf-node"`，CSS 必须有 `position: relative`（Handle 定位依赖）

**`AgentNode.tsx`**：
- 想法输入框（Textarea）
- 模型选择（默认 `moonshotai/kimi-k2.6` via openrouter）
- 状态指示灯（idle 灰 / running 琥珀动画 / done 绿 / error 红）
- 运行 / 停止按钮，Dry-run 复选框
- 流式日志折叠展示
- Handle target（左）+ source（右）

**`OutputNode.tsx`**：
- 平台选择：知乎 / 公众号 / 日记 / 小红书，2×2 Grid 布局
- react-markdown 内容预览（max-height 200px），右上角放大按钮弹出 `OutputModal`
- 一键复制 + 保存到记忆库（存入 `folder-output`，tag 为平台名）
- 图片支持：`images[]` + `contentType: "image"`，小红书两步法（文本 session 解析 `[IMG_PROMPT:...]` 再生图）
- Handle `type="target"` 位于左侧

**`OutputModal.tsx`**：
- `createPortal` 挂到 `document.body`，z-index 1000
- 背景虚化 `backdrop-filter: blur(4px)`
- 支持预览/原文切换、图片展示、复制、存为记忆、下载图片、ESC/点背景关闭

---

## Phase 6：页面与布局

**`Canvas.tsx`**：
- `onPaneContextMenu` 右键菜单，多级子菜单：
  - 输入节点 → 5 种类型（文本/链接/文件/记忆/信息流），hover 展开子菜单
  - Agent 节点（直接添加）
  - 输出节点 → 4 个平台（知乎/公众号/日记/小红书），hover 展开子菜单
  - 点击调用 `addNode(type, pos, initialData)`，预设 `inputType` 或 `platform`
- 快捷键：`deleteKeyCode="Delete"`, `multiSelectionKeyCode="Shift"`
- 快捷提示气泡放 `Panel position="bottom-right"`（避开左下角 Controls）
- MiniMap 颜色使用 CSS 变量
- `onInit` 回调 150ms 后 `fitView`；切换工作流后 200ms 触发 `fitView`

**`App.tsx`**：
- 布局：`Toolbar`（52px top）+ `flex row`（`WorkflowSidebar` 160px + 主内容区 flex:1）
- 主内容区条件渲染：`memoryOpen ? <MemoryPanel> : <Canvas>`
- `memoryOpen` 状态由 `App` 管理，通过 props 传给 `WorkflowSidebar`（触发）和 `MemoryPanel`（关闭）

**`Toolbar.tsx`**：
- 品牌 Logo + 运行全部 / 停止全部 + 主题切换
- 记忆库入口已移至 `WorkflowSidebar`

**`WorkflowSidebar.tsx`**（新增）：
- 160px 左侧侧边栏，`flex-direction: column`
- 顶部"画布"区块：工作流列表（双击重命名，× 关闭，+ 新建）
- 底部"记忆"入口按钮：点击切换 `memoryOpen`；激活时高亮；点击画布条目自动关闭记忆面板
- 字体使用 `--text-primary` 确保可读性

**`MemoryPanel.tsx`**（新增，替代侧边抽屉）：
- 全宽全高，完全占据主内容区（`width: 100%; height: 100%`）
- 顶部工具栏：标题"记忆" + 分类 Tab（每个 Tab 有对应 SVG 图标 + 颜色下划线）+ 搜索框 + 新建 + 导入/导出/关闭
- 内容区：`grid auto-fill minmax(280px, 1fr)` 卡片网格
- 每张卡片左边框颜色按分类区分（人设蓝/灵感绿/素材橙/作品紫/其他灰）
- 卡片右上角放大按钮 → `MemoryModal`（带背景虚化）
- 关闭按钮返回画布

**分类颜色方案**：
```
persona  (人设) → #3b82f6 蓝
material (灵感) → #10b981 绿
preference (素材) → #f59e0b 橙
output   (作品) → #8b5cf6 紫
other/custom → #6b7280 灰
```

**分类图标（SVG 线条，禁止使用 emoji）**：
- 人设：人形轮廓（circle + path）
- 灵感：层叠菱形（material layers）
- 素材：文档（file + lines）
- 作品：五角星（polygon）
- 其他/自定义：文件夹（folder path）

---

## Phase 7：设计风格

双主题 CSS 变量，通过 `data-theme` attribute 切换，持久化到 `localStorage("thinkflow-theme")`，默认浅色。

**浅色（Lovable 羊皮纸）**：
- `--bg-canvas: #f7f4ed`，`--bg-node: #ffffff`，`--border: #d4d0c8`（1.5px）
- `--text-primary: #1c1c1c`，`--accent: #1c1c1c`

**深色（深夜工作室）**：
- `--bg-canvas: #0b0f1a`，`--bg-node: #111827`，`--border: #1e293b`
- `--accent: #f59e0b`（琥珀）

字体：Syne（标题 / Logo）/ Outfit（正文 UI）/ DM Mono（代码 / 日志）

**ReactFlow 节点白框问题**：`.react-flow__node { background: transparent !important; border: none !important }` 

**Handle 居中问题**：`.tf-node { position: relative }` — Handle 依赖最近的 `position: relative` 祖先定位。

---

## Phase 8：测试套件

使用 `bunx vitest run`（不是 `bun test`，后者缺少 jsdom 支持）。

| 文件 | 覆盖 | 用例数 |
|------|------|--------|
| `canvasStore.test.ts` | 节点增删、工作流执行、abort、多工作流切换 | 13 |
| `memoryStore.test.ts` | CRUD、搜索、导入导出、分类操作 | 10 |
| `opencodeClient.test.ts` | Session API、Mock 模式、SSE、convertFileToMarkdown | 10 |
| `nodeTypes.test.ts` | 节点类型注册 | 5 |

`setup.ts` 中需要 `MockEventSource` polyfill（jsdom 无内置 EventSource）。

**`canvasStore.test.ts` resetStore 必须包含**：
```typescript
useCanvasStore.setState({
  nodes: RESET_NODES, edges: RESET_EDGES,
  activeWorkflowId: wfId,
  workflows: { [wfId]: { id: wfId, name: "画布 1", nodes: RESET_NODES, edges: RESET_EDGES, history: [], historyIndex: -1 } },
  _history: [], _historyIndex: -1, _sessionIds: [],
})
```

---

## Phase 9（更新）：自动启动 OpenCode

### 背景

OpenCode 发布的 macOS 二进制签名无效（`invalid or unsupported format for signature`），被系统 killed，只能通过 `bun run` 从源码启动。之前需要用户手动开终端执行，体验差。

### 方案：Vite inline 插件

在 `vite.config.ts` 里内置插件，`configureServer` 钩子中 `child_process.spawn` 启动 OpenCode，Vite 退出时自动清理子进程。**只改一个文件，无额外依赖，`bun dev` 即可。**

**实现要点**：

1. 先健康检查：若 4096 端口已有服务则跳过，避免重复启动
2. spawn 命令：`bun run --conditions=browser <opencode-src>/index.ts serve --port 4096`
3. **`cwd` 必须设为 `packages/opencode`**，否则 bun 找不到 `react/jsx-dev-runtime` 等依赖
4. 传入 `OPENCODE_CONFIG_CONTENT: '{"plugin":[]}'`，防止用户全局配置中损坏的本地插件在 session 创建时触发安装失败（该环境变量为追加语义，不能完全覆盖；根本解决需从 `~/.config/opencode/opencode.json` 移除损坏的插件条目）
5. 监听 `process.on("exit/SIGINT/SIGTERM")` 和 `server.httpServer.on("close")` 执行清理，无僵尸进程
6. `stdio: "inherit"`，OpenCode 日志直接输出到同一终端

**启动效果**：
```
[opencode] 启动中 (port 4096)...
  VITE v6.4.2  ready in 137 ms  ➜  http://localhost:1421/
opencode server listening on http://127.0.0.1:4096
```

---

## Phase 10：关键约束汇总

| 约束 | 说明 |
|------|------|
| @xyflow/react v12 | `Node<Data, 'type'>` 泛型；`ReactFlowProvider` 必须包裹 Canvas；Handle 需 `position: relative` 祖先 |
| OpenCode directory | `POST /session` 和 `POST /session/:id/message` 都要带相同的 `?directory=<cwd>` |
| OpenCode SSE | 流式增量在 `properties.delta`，不在 `properties.part.text` |
| OpenCode 健康检查 | `/global/health`，不是 `/health` |
| OpenCode auth | `~/.local/share/opencode/auth.json`（权限 600），修改后需重启服务 |
| 测试运行器 | `bunx vitest run`，不是 `bun test` |
| @types/react | 固定 18.2.79，typeRoots 隔离，避免 monorepo 版本冲突 |

---

## 验证方式

```bash
# 一键启动（自动拉起 OpenCode + Vite）
cd packages/thinkflow/app && bun dev

# 打开 http://localhost:1421
# 输入内容 → 填写想法 → 点"运行" → Agent 状态 running → done，输出节点显示真实 AI 内容

# 测试
cd packages/thinkflow/app && bunx vitest run

# 类型检查
bunx tsc --noEmit

# 端到端测试（需 bun dev 在运行）
cd packages/thinkflow/app && ./node_modules/.bin/playwright test
```

---

## Phase 11：🟡 体验优化迭代（MVP1）

### 11.1 常用快捷键

在 `Canvas.tsx` 用 `document.addEventListener("keydown")` 统一处理，不依赖 `useKeyPress`：

| 快捷键 | 功能 | 注意 |
|--------|------|------|
| `⌘Z` / `Ctrl+Z` | 撤销 | canvasStore 手动维护 `_history` 快照数组（最多 50 条） |
| `⌘⇧Z` / `Ctrl+Y` | 重做 | 同上 |
| `⌘A` | 全选节点 | 在输入框内不触发 |
| `⌘Enter` | 运行选中 Agent | 无选中则运行全部 Agent |
| `Space` / `H` | fitView 归位 | `panActivationKeyCode={null}` 防止 ReactFlow 拦截 Space |

**History 实现要点**：
- `_pushHistory()` 只在 `addNode`、`removeNode`、`onConnect`、`setEdges` 调用
- **禁止**在 `onNodesChange` 里调用（拖拽高频触发会爆内存）
- `partialize` 不持久化 `_history`、`_historyIndex`

---

### 11.2 小红书图文生成（两步法）

#### 架构

文本 Agent 负责理解需求 + 生成图片描述，图片模型负责生图，两步解耦：

```
用户输入 → 文本 Agent（Kimi K2）
    → 输出带标记的文本：
      [IMG_PROMPT: Fresh pink flower, soft bokeh background...]
      
      清晨遇见这朵花🌸 #治愈 #鲜花
    ↓ ThinkFlow 前端解析 [IMG_PROMPT:...] 标记
图片生成模型 → base64 图片 URL
    ↓
OutputNode 展示图片 + 文案
```

#### 平台指令格式

小红书平台的 `PLATFORM_INSTRUCTION` 要求 Agent **严格按格式输出**：
```
第一行：[IMG_PROMPT: <详细英文图片描述，约20个单词>]
空一行
然后是中文文案（活泼种草风，含 #话题标签）
```

#### 图片生成优先级链

前端 `generateImage()` 按顺序尝试，失败自动切下一级：

1. **OpenRouter `gpt-5.4-image-2`**（需 VPN）— 画质最佳
2. **OpenRouter `bytedance-seed/seedream-4.5`**（国内直连，当前默认生效）— 字节跳动，无地区限制
3. **硅基流动 `Tongyi-MAI/Z-Image-Turbo`**（需配置 `siliconflow.key`）— 国内直连保底
4. **SVG 占位图**（最终兜底，保证 Agent 状态为 `done` 不 throw）

#### OpenRouter 图片生成 API 格式（坑）

- 端点：`/api/v1/chat/completions`（**不是** `/v1/images/generations`，后者在 OpenRouter 上不存在）
- 图片返回位置：`choices[0].message.images[0].image_url.url`（base64 data URI）
- `choices[0].message.content` 为 `null`（不要从 content 里找图片）

#### Vite proxy 配置

图片生成走 Vite 服务端 proxy，key 不暴露给前端：
- `/api/openrouter` → `https://openrouter.ai/api`（注入 `Authorization: Bearer <key>`）
- `/api/siliconflow` → `https://api.siliconflow.cn`（注入 `Authorization: Bearer <key>`）
- key 从 `~/.local/share/opencode/auth.json` 读取（`openrouter.key` / `siliconflow.key`）
- 需要 VPN 时：重启 `bun dev` 前设置 `https_proxy=http://127.0.0.1:7890`，`HttpsProxyAgent` 注入到 proxy agent

#### auth.json 格式

```json
{
  "openrouter": { "type": "api", "key": "sk-or-v1-..." },
  "siliconflow": { "type": "api", "key": "sk-..." }
}
```

---

### 11.3 OutputNode 放大弹窗

- 卡片预览区域（max-height 200px），有内容时右上角出现放大按钮
- 点击弹出 `OutputModal`（`ReactDOM.createPortal` 挂到 `document.body`，z-index 1000）
- Modal 支持：预览/原文切换、图片展示（`<img>`）、复制、存为记忆、下载图片、ESC/点背景关闭
- 图片与文案按 `contentType` 字段区分：`"text"` | `"image"`，图片存在 `OutputNodeData.images[]`
- `images` 字段在 `partialize` 中排除（不持久化大图到 localStorage）

---

### 11.4 端到端测试（Playwright）

**规范**：每次交付前除 vitest 单测外，**必须**跑 Playwright 端到端验证真实场景：

```bash
cd packages/thinkflow/app
./node_modules/.bin/playwright test
```

测试文件放在 `e2e/` 目录，vitest 的 `exclude` 配置已排除该目录，两套测试互不干扰。

**关键经验**：
- 等待 Agent 完成用 `waitForFunction` 检测 `.tf-status-dot.done`，先等 `running` 出现再等 `done/error`，避免"已是 done 状态"时立即通过
- 单元测试（vitest）只验证逻辑，**不能**替代真实 OpenCode + 真实模型的端到端验证
- `bun dev` 必须重启才能加载新的 vite.config.ts proxy 配置（热更新不重载 proxy）

---

## Phase 13：MVP1 后续迭代（体验打磨）

### 13.1 多工作流支持

- `canvasStore` 新增 `WorkflowRecord` 结构，persist key 升级为 `thinkflow-canvas-v2`
- 左侧 `WorkflowSidebar` 代替 Toolbar 标签页：显示所有画布，支持新建/切换/关闭/双击重命名
- 初始节点坐标以 `(0,0)` 为中心（input x:-560, agent x:-200, outputs x:160），保证 `fitView` 居中
- 切换画布时自动 abort 正在运行的 agent，避免跨工作流 session 混乱
- history 不持久化，避免 localStorage 超限

### 13.2 右键菜单多级子菜单

- 原 3 个菜单项拆分为多级：输入节点（5 种）+ Agent + 输出节点（4 平台）
- hover 触发子菜单（CSS `.tf-context-submenu`，`left: 100%`）
- `addNode` 新增可选第三参数 `initialData`，merge 到默认 data，直接预设 `inputType`/`platform`

### 13.3 记忆库全屏面板

- 记忆库从右侧 320px 抽屉改为全屏面板，与画布互斥显示（`App.tsx` 条件渲染）
- `MemoryPanel` 顶部工具栏 + 卡片网格（`auto-fill minmax(280px, 1fr)`）
- 入口按钮移到 `WorkflowSidebar` 底部，与"画布"区块同级
- 打开记忆后点击画布条目自动切回画布

### 13.4 记忆卡片详情弹窗

- 每张记忆卡片右上角放大按钮 → `MemoryModal`（`createPortal` + `backdrop-filter: blur(4px)`）
- Modal 顶部带分类颜色线条，支持复制、ESC 关闭、点背景关闭
- OutputNode 展开弹窗同样带背景虚化（已有，无需额外修改）

### 13.5 记忆分类重命名

旧名称 → 新名称（`onRehydrateStorage` 自动迁移）：

| 旧 | 新 |
|----|----|
| 账号人设 | 人设 |
| 想法记忆 / 内容素材 | 灵感 |
| 关键信息 / 用户偏好 | 素材 |
| 作品记忆 / 输出记录 | 作品 |
| —（新增）— | 其他 |

- `MemoryFolderType` 放宽为 `string`，支持用户自定义分类
- `MemoryFolder` 新增 `isDefault?: boolean`，默认分类不显示删除按钮
- 分类图标全部改为 SVG 线条（禁止 emoji）

### 13.6 视觉细节

- 平台按钮改为 2×2 CSS Grid（替代 flex-wrap 导致的 3+1 换行）
- 节点 header 图标颜色由 `--accent` 改为 `--text-muted`
- 侧边栏字体颜色统一为 `--text-primary`
- 分隔线去重（原 `divider` + `footer border-top` 双线，保留 footer `border-top` 一条即可）

---

## Phase 12：关键约束更新

| 约束 | 说明 |
|------|------|
| 图片生成端点 | OpenRouter 用 `/v1/chat/completions`，不是 `/v1/images/generations` |
| seedream-4.5 | OpenRouter `bytedance-seed/seedream-4.5` 国内可直连，无地区限制，是当前默认生图模型 |
| OpenRouter 地区限制 | `gpt-5.4-image-2` / Gemini image 系列在中国区域返回 403，需 VPN 或切换模型 |
| Vite proxy 重启 | 修改 `vite.config.ts` 的 proxy 配置后必须重启 `bun dev`，热更新无效 |
| History 禁区 | `_pushHistory` 禁止在 `onNodesChange` 中调用，否则拖拽时爆栈 |
| Playwright 排除 | vitest 的 `exclude` 需加 `"e2e/**"` 防止误扫描 Playwright 测试文件 |
| `panActivationKeyCode` | `<ReactFlow panActivationKeyCode={null}>` 防止 Space 键被 ReactFlow 拦截做平移 |
| markitdown stdin | `markitdown -` 不走 stdin，必须传文件路径；需用临时文件并保留扩展名（markitdown 靠扩展名判断格式） |
| markitdown PDF 依赖 | 必须用 `uvx --from "markitdown[all]"` 而非 `uvx markitdown`，否则 PDF 转换报 MissingDependencyException |
| ReactFlow fitView 节点宽度 | `fitView` 依赖节点包装层尺寸计算边界。节点内容若用 CSS `minWidth`，ReactFlow 无法感知真实宽度，导致 fitView 后节点超出视口。解法：在节点对象上设置 `style.width`（input: 280, agent: 300, output: 320），让 ReactFlow 知道节点真实宽度 |

---

## Phase 14：markitdown 文件转 Markdown 集成

### 14.1 背景

InputNode 原先用 `FileReader.readAsText()` 读文件，对 PDF/DOCX/PPTX 等二进制格式完全无效（乱码或空内容）。通过集成 [microsoft/markitdown](https://github.com/microsoft/markitdown)，支持将多种文件格式透明转换为 Markdown 后再传给 Agent。

### 14.2 架构

转换发生在**前端上传时**（不在 Agent 执行阶段），Agent 收到的已经是干净的 Markdown 文本，对 canvasStore / opencodeClient 的核心流程完全透明。

```
用户拖入文件（PDF/DOCX/PPTX/HTML/图片...）
    ↓ InputNode.readFile()
POST /api/convert-to-markdown（Vite 内嵌端点）
    ↓ spawnSync("uvx", ["--from", "markitdown[all]", "markitdown", tmpPath])
返回 { markdown: string }
    ↓
updateNodeData({ value: markdown, fileConverted: true })
    ↓ 运行工作流
canvasStore 将 markdown 字符串作为 【文件内容】 传给 Agent
```

**降级链**：uvx 不可用 → 503 → 前端降级为 `FileReader.readAsText()`，节点显示「原始文本」灰色徽章，不阻塞工作流。

### 14.3 关键实现

**`vite.config.ts` — `markitdownPlugin()`**：

- 启动时 `spawnSync("uvx", ["--version"])` 检测可用性，不可用则打印警告
- 注册 `server.middlewares.use("/api/convert-to-markdown", ...)` 路由
- 接收 `multipart/form-data`，手动解析 boundary 提取文件 buffer 和文件名
- 写临时文件到 `os.tmpdir()`（**必须保留原始扩展名**，markitdown 依此判断格式）
- 调用 `uvx --from "markitdown[all]" --quiet markitdown <tmpPath>`（`[all]` 包含 PDF/DOCX/PPTX 等全部转换器）
- 转换完成后删除临时文件（`finally { unlinkSync(tmpPath) }`）
- 超时 60 秒（大 PDF 可能需要较长时间）

**两个已知坑**（见 Phase 12 约束表）：
1. `markitdown -` 不走 stdin，需传文件路径
2. 基础 `markitdown` 包不含 PDF 支持，必须用 `markitdown[all]`

**`src/services/opencodeClient.ts` — `convertFileToMarkdown(file)`**：

```typescript
export async function convertFileToMarkdown(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/convert-to-markdown", { method: "POST", body: formData })
  if (!res.ok) throw new Error(`markitdown failed: ${res.status}`)
  const data = await res.json() as { markdown?: string; error?: string }
  if (!data.markdown) throw new Error(data.error ?? "empty response")
  return data.markdown
}
```

**`src/types/index.ts`** — `InputNodeData` 新增 `fileConverted?: boolean`

**`src/nodes/InputNode.tsx`**：
- `readFile` 改为 `async`，先调用 `convertFileToMarkdown`，失败时降级 `readAsText`
- 文件信息行新增徽章：`fileConverted === true` → 绿色「已转为 MD」；`false` → 灰色「原始文本」
- 拖拽提示文字改为「支持 PDF、Word、PPT、HTML、图片、文本文件」（移除 emoji 图标）

### 14.4 用户依赖

需要系统安装 `uv`（Python 包管理器）：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

首次调用时 uvx 自动下载 markitdown[all] 并缓存，后续调用无需重新下载。

### 14.5 测试

`opencodeClient.test.ts` 新增 3 个用例（共 10 个）：
- 成功时返回 markdown 字符串（fetch mock → `{ markdown: "# Hello" }`）
- 503 时抛出异常（uvx 不可用场景）
- 响应无 markdown 字段时抛出异常

---

## Phase 15：画布初始布局与 fitView 精确居中

### 15.1 问题背景

新画布（或切换画布）后，输出节点右侧会超出视口，原因是 ReactFlow 的 `fitView` 在计算节点边界时，依赖的是每个节点包装层（`.react-flow__node`）的尺寸，而非节点内容实际渲染尺寸。

节点组件内部使用 CSS `minWidth` 定义宽度（如 `min-width: 320px`），但节点对象本身没有声明 `style.width`，ReactFlow 感知到的包装层宽度远小于实际渲染宽度，fitView 因此算出错误的边界，导致节点溢出。

### 15.2 解法

在 `canvasStore.ts` 的初始节点和 `addNode` 函数中，为每个节点对象声明 `style.width`，与 CSS 中的 `minWidth` 保持一致：

| 节点类型 | `style.width` | CSS `min-width` |
|----------|--------------|-----------------|
| input    | 280          | 280px           |
| agent    | 300          | 300px（inline style minWidth: 300） |
| output   | 320          | 320px（inline style minWidth: 320） |

**初始节点示例**：
```typescript
const initialInput: InputNodeType = {
  id: "input-1",
  type: "input",
  position: { x: -560, y: -160 },
  data: { inputType: "text", value: "", label: "输入" },
  style: { width: 280 },   // ← 关键：让 ReactFlow 感知真实宽度
}
```

**`addNode` 函数也同样处理**，确保右键菜单动态添加的节点同样有正确宽度信息。

### 15.3 fitView 参数

所有 `fitView` 调用统一使用 `{ padding: 0.2 }`，不加 `maxZoom` 限制，让框架在任何窗口宽度下都能自动缩放以完整显示所有节点并留出 20% 留白。

```typescript
fitView({ padding: 0.2 })
```
