# ThinkFlow 实现计划

> 本文件内容来自开发过程中的 plan mode 规划，包含 MVP 初始计划与后续迭代更新。

---

## 技术栈

- React 18 + TypeScript + Zustand 5 + @xyflow/react v12
- Vite 开发服务器（端口 1421）
- Vitest + jsdom 测试
- 无 Tailwind — 纯 CSS 变量双主题
- TipTap v3（富文本编辑器，用于记忆笔记区）

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
│       ├── cards/                    ← 输出卡片注册式架构
│       │   ├── registry.ts           ← CardDef 接口 + CARD_REGISTRY Map
│       │   ├── logos.tsx             ← 各平台品牌 Logo SVG 组件
│       │   ├── zhihu.ts
│       │   ├── wechat.ts
│       │   ├── diary.ts
│       │   ├── note.ts
│       │   ├── xiaohongshu.ts
│       │   ├── video.ts
│       │   └── index.ts             ← 导入所有卡片触发注册副作用
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
│       │   ├── MemoryPanel.tsx       ← 全屏记忆面板（Notion 风格两栏）
│       │   ├── MemoryEditor.tsx      ← TipTap 富文本编辑器组件
│       │   ├── MemorySidebar.tsx     ← 保留备用，不再主动使用
│       │   ├── OutputModal.tsx
│       │   └── previews/
│       │       └── XhsPreview.tsx   ← 小红书专属预览组件
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

1. **package.json** — 依赖：react 18, @xyflow/react ^12, zustand ^5, nanoid, clsx, @tiptap/react, @tiptap/starter-kit 等
2. **vite.config.ts** — 端口 1421；内置 `opencodePlugin` 自动启动 OpenCode（见 Phase 9）
3. **tsconfig.json** — typeRoots 指向本包 node_modules，固定 @types/react@18.2.79
4. **index.html** — 加载 Syne + Outfit + DM Mono Google Fonts

---

## Phase 2：类型系统

**`src/types/index.ts`**：

- `InputType`: `"text" | "url" | "file" | "memory" | "feed"`
- `InputNodeData`: `inputType, value, label, mcpTool, memoryEntryId?, fileConverted?`
- `AgentNodeData`: `idea, model, status, logs[], sessionId, dryRun, scheduleEnabled, scheduleTime, matrixMode, matrixSlots[]`
- `MatrixSlot`: `id, folderId, memoryEntryId?, customPersona?`
- `OutputNodeData`: `platform, content, label, images?, contentType?, contentFormat?, customInstruction?`
  - `customInstruction`：用户自定义的平台提示词，覆盖卡片注册表的默认指令
- `ContentFormat`: `"text" | "image_text" | "auto"`
- `ImageAsset`: `id, url, title?, generatedAt?`
- `MemoryFolderType`: `"persona"|"material"|"preference"|"output"|"other"|string`
- `MemoryFolder`: `id, type, name, createdAt, isDefault?`
- `MemoryEntry`: `id, folderId, title, content(HTML string), tags[], createdAt, updatedAt`
- `OpenCodeEvent`, `MessagePartUpdatedEvent`, `SessionIdleEvent` — SSE 事件类型

> **注意**：`MemoryEntry.content` 存储的是 TipTap 导出的 HTML 字符串（非纯文本）。传给 AI 或显示预览时需通过 `stripHtml()` 剥离标签。

---

## Phase 3：服务层

**`src/services/opencodeClient.ts`**：

- `getBaseUrl()` — 读取 `sessionStorage("thinkflow_server_url")` 或 `localhost:4096`
- `createSession()` → `POST /session?directory=<OPENCODE_WORKDIR>`
- `sendPrompt(sessionId, parts, model)` → `POST /session/:id/message?directory=<OPENCODE_WORKDIR>`
- `abortSession(sessionId)` → `POST /session/:id/abort`
- `subscribeEvents(cb)` → `GET /global/event`（SSE）
- `isServerAvailable()` → `GET /global/health`
- `convertFileToMarkdown(file)` → `POST /api/convert-to-markdown`
- Mock 模式：OpenCode 不可用时模拟流式输出

**关键约束 — OpenCode API**：

1. `POST /session` 和 `POST /session/:id/message` 都必须带 `?directory=` 查询参数
2. SSE 事件流式文本增量在 `properties.delta`，不在 `properties.part.text`
3. `session.idle` 事件的 `properties.sessionID` 用于过滤当前 session

---

## Phase 4：状态管理

**`src/store/canvasStore.ts`**（Zustand）：

- `nodes`, `edges`, ReactFlow callbacks
- `addNode(type, position?, initialData?)` — 节点对象须声明 `style.width`（input:280, agent:300, output:320）
- `updateNodeData(id, data)` — 更新节点数据
- `runWorkflow(agentNodeId)` — 核心工作流执行（矩阵模式串行执行各 slot，content 传 AI 前剥离 HTML）
- `abortWorkflow(agentNodeId)`
- **定时任务**：`_scheduleTimers: Record<string, ReturnType<typeof setInterval>>`，`setScheduleTimer` / `clearScheduleTimer`
- **多工作流**：`WorkflowRecord`，persist key: `thinkflow-canvas-v2`

**`src/store/memoryStore.ts`**（Zustand + localStorage）：

- `folders[]`, `entries[]`（content 字段为 HTML 字符串）
- `addFolder` / `removeFolder` / `renameFolder`
- `addEntry` / `updateEntry` / `removeEntry` / `searchEntries`
- `importFromJson` / `exportToJson`
- 默认分类：人设 / 灵感 / 素材 / 作品 / 其他（`isDefault: true`，不可删除但可重命名）
- `onRehydrateStorage` 自动迁移旧分类名称和字段结构

---

## Phase 5：节点组件

**`InputNode.tsx`**：
- 5 标签（文本 / URL / 文件 / 记忆 / 信息流）
- 记忆 Tab：选择条目时用 `stripHtml(entry.content)` 写入 value（传给 AI 为纯文本）

**`AgentNode.tsx`**：
- 想法输入框、模型选择、状态指示灯、运行/停止、dry-run
- **定时任务**：开关 + 时间选择器（HH:MM），每天固定时间触发，`lastRunDateRef` 防重复，对齐到整分钟再开始
- **矩阵模式**：开关 + slot 列表（每个 slot 独立选择分类 / 条目 / 自定义人设，2~6 个），运行按钮变"矩阵运行"
- 日志折叠展示

**`OutputNode.tsx`**：
- 平台 2×2 Grid + 创作形式 1×3 Grid（纯文本 / 图文 / 自主）
- react-markdown 预览 + OutputModal
- 图片支持，一键复制 / 存为记忆 / 下载

---

## Phase 6：页面与布局

**`App.tsx`**：Toolbar + WorkflowSidebar(160px) + 主内容区（条件渲染 Canvas / MemoryPanel）

**`WorkflowSidebar.tsx`**：工作流列表（新建/切换/关闭/双击重命名）+ 底部"记忆"按钮

**`MemoryPanel.tsx`**（Notion 风格两栏）：
- 左栏（240px）：分类树 + 条目列表
  - 分类行固定显示：条目数 + `+`（新建条目）；重命名/删除 hover 才显示
  - 分类支持新增 / 重命名（inline input，Enter 保存）/ 删除（非默认分类）
  - 条目 hover 显示 × 删除按钮
  - 底部「＋ 新建分类」按钮
  - 搜索框（无旁边 + 按钮）
- 右栏：TipTap 编辑区（见 Phase 17）
- 顶部工具栏：标题 + 导入/导出/关闭

**`MemoryEditor.tsx`**（见 Phase 17）

---

## Phase 7：设计风格

双主题 CSS 变量，通过 `data-theme` attribute 切换。

**浅色（Lovable 羊皮纸）**：`--bg-canvas: #f7f4ed`，`--accent: #1c1c1c`

**深色（深夜工作室）**：`--bg-canvas: #0b0f1a`，`--accent: #f59e0b`（琥珀）

字体：Syne（标题）/ Outfit（正文）/ DM Mono（代码）

---

## Phase 8：测试套件

```bash
bunx vitest run   # 38 个用例，4 文件全部通过
bun run typecheck # 零 TS 错误
```

| 文件 | 用例数 |
|------|--------|
| `canvasStore.test.ts` | 13 |
| `memoryStore.test.ts` | 10 |
| `opencodeClient.test.ts` | 10 |
| `nodeTypes.test.ts` | 5 |

---

## Phase 9：自动启动 OpenCode（Vite 内联插件）

- `vite.config.ts` 内置插件，`configureServer` 中 `child_process.spawn` 启动 OpenCode
- 先健康检查（4096 端口已有则跳过），`cwd` 必须设为 `packages/opencode`
- 传入 `OPENCODE_CONFIG_CONTENT: '{"plugin":[]}'` 防止损坏的全局插件干扰
- `stdio: "inherit"`，日志直接输出到终端

---

## Phase 10：关键约束汇总

| 约束 | 说明 |
|------|------|
| @xyflow/react v12 | `Node<Data, 'type'>` 泛型；Handle 需 `position: relative` 祖先 |
| OpenCode directory | `POST /session` 和 `POST /session/:id/message` 带相同 `?directory=<cwd>` |
| OpenCode SSE | 流式增量在 `properties.delta` |
| 测试运行器 | `bunx vitest run`，不是 `bun test` |
| @types/react | 固定 18.2.79，typeRoots 隔离 |
| MemoryEntry.content | TipTap HTML 格式；传 AI / 显示预览时须调 `stripHtml()` |
| History 禁区 | `_pushHistory` 禁止在 `onNodesChange` 中调用 |
| Vite proxy 重启 | 修改 proxy 配置后必须重启 `bun dev` |
| markitdown stdin | 需传文件路径；须用 `markitdown[all]` 含 PDF 依赖 |
| 节点宽度 | `style.width` 必须与 CSS `minWidth` 一致，否则 `fitView` 算错边界 |

---

## Phase 11：MVP1 体验优化

### 11.1 快捷键

| 快捷键 | 功能 |
|--------|------|
| `⌘Z` / `Ctrl+Z` | 撤销（canvasStore 手动维护 `_history`，最多 50 条） |
| `⌘⇧Z` / `Ctrl+Y` | 重做 |
| `⌘A` | 全选节点 |
| `⌘Enter` | 运行选中 Agent |
| `Space` / `H` | fitView 归位（`panActivationKeyCode={null}` 防 ReactFlow 拦截） |

### 11.2 小红书图文生成（两步法）

文本 Agent 输出 `[IMG_PROMPT: ...]` 标记 → 前端解析 → 图片生成模型（优先级链见 AI 能力）

### 11.3 OutputNode 放大弹窗

`createPortal` 挂到 `document.body`，支持预览/原文切换、图片、复制、存为记忆、下载、ESC 关闭

### 11.4 端到端测试（Playwright）

```bash
cd packages/thinkflow/app && ./node_modules/.bin/playwright test
```

---

## Phase 12：关键约束更新

| 约束 | 说明 |
|------|------|
| 图片生成端点 | OpenRouter 用 `/v1/chat/completions`，图片在 `choices[0].message.images[0].image_url.url` |
| seedream-4.5 | OpenRouter `bytedance-seed/seedream-4.5` 国内可直连，当前默认 |
| gpt-5.4-image-2 | 中国区 403，需 VPN |
| `panActivationKeyCode` | `<ReactFlow panActivationKeyCode={null}>` 防 Space 被拦截 |

---

## Phase 13：MVP1 后续迭代

### 13.1 多工作流

- `canvasStore` 新增 `WorkflowRecord`，persist key: `thinkflow-canvas-v2`
- 初始节点坐标以 (0,0) 为中心（input x:-560, agent x:-200, outputs x:160）
- 切换画布自动 abort 正在运行的 agent

### 13.2 右键菜单简化

恢复三项直接点击（输入节点 / Agent / 输出节点），用户在节点内自行切换类型

### 13.3 记忆库全屏面板

从 320px 右侧抽屉改为全屏面板，与画布互斥显示

### 13.4 记忆分类重命名（`onRehydrateStorage` 自动迁移）

| 旧 | 新 |
|----|----|
| 账号人设 | 人设 |
| 想法记忆 / 内容素材 | 灵感 |
| 关键信息 / 用户偏好 | 素材 |
| 作品记忆 / 输出记录 | 作品 |

---

## Phase 14：markitdown 文件转 Markdown

- Vite 内嵌 `/api/convert-to-markdown` 端点，调用 `uvx --from "markitdown[all]" markitdown <tmpPath>`
- 需用户安装 `uv`：`curl -LsSf https://astral.sh/uv/install.sh | sh`
- 降级链：uvx 不可用 → 503 → 前端 `FileReader.readAsText()`，节点显示灰色「原始文本」徽章

---

## Phase 15：画布初始布局与 fitView 精确居中

节点对象必须在 `style.width` 声明与 CSS `minWidth` 一致的宽度，让 ReactFlow 正确感知真实宽度。所有 `fitView` 调用统一使用 `{ padding: 0.2 }`。

---

## Phase 16：输出节点创作形式配置

新增 `ContentFormat: "text" | "image_text" | "auto"`，`OutputNode` 底部新增 1×3 创作形式选择格。`canvasStore` 中 `getPlatformInstruction(platform, contentFormat)` 动态生成平台指令。

---

## Phase 17：记忆编辑区 TipTap 富文本编辑器

### 17.1 背景

替代 `textarea + react-markdown` 双模式（失焦才渲染），实现 Notion 风格"边输入边格式化"体验。

### 17.2 依赖包

```bash
bun add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-typography
bun add @tiptap/extension-table @tiptap/extension-bubble-menu @tiptap/extension-floating-menu
bun add @tiptap/extension-link @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight
```

### 17.3 数据存储

`MemoryEntry.content` 改存 TipTap 导出的 **HTML 字符串**（原纯文本）：
- 读取：`editor.commands.setContent(htmlString)`
- 保存：`editor.getHTML()`（空内容存 `""`，避免存 `"<p></p>"`）
- 传 AI / 侧边栏预览 / InputNode 记忆 Tab：调 `stripHtml()` 剥离 HTML 标签

### 17.4 MemoryEditor.tsx 组件结构

```
MemoryEditor
├── EditorToolbar（固定顶部工具栏）
│   H1 H2 H3 | B I S 高亮 代码 | 无序列表 有序列表 引用 代码块 | 表格 分割线
├── TableMenu（进入表格时在 Toolbar 下方显示操作栏）
│   ←列 列→ ↑行 行↓ | 删列 删行 删表
├── tf-memory-tiptap-body（滚动区域）
│   ├── BubbleMenuPortal（选中文字时 fixed 定位浮出）
│   │   B I S 高亮 代码 | H1 H2 引用
│   ├── SlashMenu（输入 "/" 时浮出，选择后删除 "/" 再执行命令）
│   │   标题1 标题2 标题3 无序列表 有序列表 引用 代码块 表格 分割线
│   └── EditorContent（ProseMirror 编辑区）
```

### 17.5 Slash Menu 触发条件

仅在**当前段落内容 === "/"** 时显示，点击菜单项时：
1. `editor.commands.deleteRange({ from: pos-1, to: pos })` 删除 `/`
2. 执行对应格式命令

### 17.6 切换条目同步

```typescript
useEffect(() => {
  if (!editor) return
  const target = selectedEntry?.content ?? ""
  if (editor.getHTML() !== target) {
    editor.commands.setContent(target || "")
  }
}, [editor, selectedId])
```

### 17.7 CSS 变量适配

所有样式使用现有 CSS 变量（无硬编码颜色），自动适配双主题：
- 字体：`var(--font-body)`、`var(--font-display)`、`var(--font-code)`
- 颜色：`var(--text-primary)`、`var(--bg-surface)`、`var(--border)`、`var(--accent)`
- Toolbar/BubbleMenu 背景：`var(--bg-toolbar)` + `backdrop-filter: blur(8px)`

---

## Phase 18：Agent 定时任务 + 矩阵模式

### 18.1 定时任务

- AgentNode 内新增开关 + 时间选择器（`type="time"`，HH:MM）
- 每天固定时间触发（每分钟轮询，对齐到下一整分钟再开始）
- `lastRunDateRef` 记录上次触发日期，防同一天重复执行
- `_scheduleTimers` 存储 interval handle，组件卸载时清理
- Header 显示 `⏰ 每天 HH:MM` 徽章

### 18.2 矩阵模式

- AgentNode 内新增开关 + slot 列表（2~6 个，默认 2 个）
- 每个 slot 独立选择：记忆分类下拉 → 条目下拉 / 或"自定义"分类 → textarea 输入
- `MatrixSlot.folderId`：分类 ID 或 `"custom"`
- 运行时串行执行各 slot（避免并发覆盖输出节点），日志显示 `[矩阵 i/n] 开始（人设: xxx）`
- 旧数据迁移：`onRehydrateStorage` 将 `matrixCount` 转为 `matrixSlots`，`personaSource` 转为 `folderId`

---

## Phase 19：矩阵模式 dry-run 差异内容 + 多人设结果查看

### 19.1 dry-run 矩阵差异内容

**问题**：dry-run 矩阵模式原先所有 slot 调用同一个 `runMock(o)`，完全忽略人设，输出完全相同。

**修复**：
- `runMockWorkflow` 增加可选 `persona?: string` 参数
- 非空人设时，文本 mock 尾部追加 `（以「xxx」人设创作）` 差异标记
- 小红书 SVG 占位图内嵌人设标签，caption 追加 `（xxx 风格）`
- `canvasStore` dry-run 分支：判断矩阵模式 → 逐 slot 提取人设 → 传入 `runMockWorkflow`

### 19.2 矩阵多人设结果存储

**新增类型**（`types/index.ts`）：
```typescript
export interface MatrixResult {
  slotIndex: number
  personaLabel: string
  content: string
  images?: ImageAsset[]
  contentType?: "text" | "image"
}

// OutputNodeData 新增字段：
matrixResults?: MatrixResult[]
```

**canvasStore 矩阵执行逻辑**（真实运行 + dry-run 统一）：
1. 运行前：`updateNodeData(o.id, { matrixResults: [], content: "", images: undefined })`
2. 每个 slot 完成后：把当前 `content/images/contentType` 追加进 `matrixResults`
3. 全部完成后：把 `matrixResults[0]` 写回 `content`（默认展示第一个人设）
4. `cleanNodeForPersist` 中将 `matrixResults` 设为 `undefined`（不持久化，避免 localStorage 膨胀）

### 19.3 OutputNode 人设选择器 UI

**取代原横排 Tab 方案**（Tab 在人设多时会折行）：

```
┌─ 人设图标 + "人设" ─── ‹ ─── [下拉 select] ─── › ─── n/total ─┐
```

- `select` 列出全部人设（`1. 人设名` 格式），支持几十个人设不破坏布局
- `‹` / `›` 箭头：快速前/后翻页；只有一个人设时禁用（`opacity: 0.35`）
- `n/total` 计数：`var(--font-code)` 等宽字体，右侧固定
- 仅在 `matrixResults.length > 1` 时出现，不影响普通模式
- 所有展示变量（`displayContent`, `displayImages`, `displayContentType`）基于当前选中人设；复制/存为记忆/Modal 均对应当前人设

**CSS 类**：`.tf-matrix-selector`, `.tf-matrix-select`, `.tf-matrix-nav`, `.tf-matrix-counter`

---

---

## Phase 20：输出内容便捷导出 & 自动存入作品记忆

### 20.1 自动存入「作品」记忆

- 每次运行完成后（普通 / 矩阵 / dry-run），自动调用 `useMemoryStore.getState().addEntry()` 将输出内容写入 `folder-output`（作品分类）
- 标题格式：`{平台名}[ · {人设名}] · {日期}`（矩阵模式附加人设标识）
- `canvasStore.ts` 顶部新增 `PLATFORM_LABELS` 常量和 `autoSaveToMemory` 辅助函数

### 20.2 下载功能

- **ZIP 库**：`fflate`（纯 TS，无 wasm，5KB gzip）
- **`src/utils/download.ts`**（新文件）：`downloadAsZip(items, zipName)` / `downloadSingleText(content, filename)`
- **OutputNode**：操作区新增「下载」按钮；矩阵模式额外显示「下载全部人设（ZIP）」
- **OutputModal**：头部新增「下载」按钮（接收 `doDownload` prop）
- **MemoryPanel**：顶部工具栏新增「下载作品（ZIP）」按钮，打包全部作品分类条目

---

## Phase 21：E2E Benchmark 测试套件

### 21.1 目录结构

```
e2e/benchmark/
├── README.md                  # 运行说明、提示词注入格式表
├── context-injection.spec.ts  # 核心验证（localStorage 注入，dry-run，无需 OpenCode）
├── input-types.spec.ts        # UI 交互测试（通过右键菜单添加节点）
└── fixtures/
    ├── sample.txt             # 含 BENCHMARK_FILE_CONTENT_MARKER_2025 标记
    └── sample.md              # 含 BENCHMARK_MARKDOWN_FILE_MARKER_2025 标记
```

### 21.2 7 个测试场景（context-injection.spec.ts）

| 场景 | 输入类型 | 验证要点 |
|------|---------|---------|
| SC1 | 文本 | dry-run 产生内容，字数 > 10 |
| SC2 | 链接 (URL) | URL 传入节点，产生内容 |
| SC3 | 文件 (TXT) | 文件内容加入上下文，产生内容 |
| SC4 | 记忆 | 注入 memoryStore，下拉含测试条目 |
| SC5 | 信息流 (MCP) | Fetch 按钮激活态，产生内容 |
| SC6 | 多输入 (文本+链接) | 两个输入节点可见，产生内容 |
| SC7 | 提示词格式 | 5 种输入类型前缀映射验证 |

### 21.3 关键技术

- `makeCanvasState()` 工厂生成符合 `thinkflow-canvas-v2` 格式的状态
- `injectAndReload()` 通过 `page.evaluate` 注入 localStorage 后 reload
- `waitForOutput()` 检查 `.tf-preview` 不含占位文本
- **ES 模块 `__dirname`**：`path.dirname(fileURLToPath(import.meta.url))`

### 21.4 提示词注入格式

| 输入类型 | 注入格式 |
|---------|---------|
| `text` | `【输入内容】\n{值}` |
| `url` | `【参考链接】\n{URL}\n\n请访问上述链接...` |
| `file` | `【文件内容】\n{文件文本}` |
| `memory` | `【记忆内容】\n{记忆文本}` |
| `feed` | `【信息流】\n{工具名}` |

---

## Phase 22：新手引导教程（Spotlight 步骤引导）

### 22.1 触发逻辑

- `App.tsx` 初始化时检测 `localStorage.getItem("thinkflow-tour-done")`：无则自动显示
- 完成/跳过后写入 `thinkflow-tour-done: "1"`，不再重复弹出
- Toolbar 新增「?」圆形按钮，点击清除标记并重启教程（`handleRestartTour`）

### 22.2 组件结构（`src/components/TourGuide.tsx`）

- `createPortal` 渲染到 `document.body`（z-index 9997–9999）
- **遮罩层**：`.tf-tour-overlay`（`pointer-events: none`，不阻断画布操作）
- **聚光灯**：`.tf-tour-spotlight`（`box-shadow: 0 0 0 9999px rgba(0,0,0,0.55)`，镂空目标区域）
- **步骤卡片**：`.tf-tour-card`（`max-height: calc(100vh - 32px)` + `overflow-y: auto` 防溢出）
- **定位算法**：`placement: "fixed"` 使用 `fixedPos` 绝对坐标；`right/left/top/bottom` 相对目标元素计算，`clampL/clampT` 防止超出视口
- **元素定位重试**：`useEffect` 轮询最多 600ms，等待 ReactFlow 节点渲染完毕后再读取 `getBoundingClientRect`

### 22.3 8 步教程内容

| 步骤 | 高亮目标 | placement | 说明 |
|------|---------|-----------|------|
| 1 | `.react-flow__node-input` | right | 输入节点：5 种输入类型介绍 |
| 2 | `.react-flow__node-agent` | right | Agent 节点：连接、想法、模型选择 |
| 3 | `.react-flow__node-output` | left（右侧超出自动切换） | 输出节点：4 个平台介绍 |
| 4 | `.react-flow__node-agent` | right | 运行工作流：按钮或 ⌘↵ |
| 5 | `.react-flow__node-agent` | right | 定时任务：每天自动执行 |
| 6 | `.react-flow__node-agent` | right | 矩阵模式：多人设批量生成 |
| 7 | `.tf-wf-sidebar__memory-btn` | top（按钮在底部，卡片向上） | 记忆库：5 个分类介绍 |
| 8 | null | fixed (176, 72) | 完成：快捷键汇总 |

### 22.4 涉及文件

| 文件 | 改动 |
|------|------|
| `src/components/TourGuide.tsx` | 新建，Spotlight 组件主体 |
| `src/App.tsx` | tour 状态管理，渲染 TourGuide，传 `onRestartTour` |
| `src/components/Toolbar.tsx` | 新增 `onRestartTour?: () => void` prop + 「?」按钮 |
| `src/styles/global.css` | 新增 TourGuide 全部样式（overlay/spotlight/card/dots） |

---

## Phase 26：视频生成功能（Agent 写 Remotion 代码 + edge-tts 配音）

### 26.1 最终架构（Agent 直接写代码渲染）

```
OutputNode（选"视频"平台）
  ↓ OpenCode Agent 运行，读取 Remotion skill
Agent 在 video-nextjs/ 目录：
  1. 用 edge-tts 为每个分镜生成 mp3 到 public/
  2. 用 ffprobe 获取每段音频时长，计算 durationInFrames
  3. 修改 VideoComposition.tsx（自由写 React 视觉组件 + Audio 组件）
  4. 修改 Root.tsx（设置总 durationInFrames）
  5. npx remotion render VideoComposition out/video.mp4 \
       --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ↓
Agent session.idle 触发
  ↓
OutputNode 自动 HEAD /api/video-serve 检测文件存在
  ↓
自动显示 <video> 播放器（无需用户再点按钮）
```

### 26.2 目录结构（当前实现）

```
packages/thinkflow/
├── app/
│   ├── vite.config.ts         ← videoServePlugin()（仅一个静态文件服务端点）
│   └── src/
│       ├── types/index.ts     ← VideoScript（title + description，不再有 slides 结构）
│       ├── nodes/OutputNode.tsx   ← video 平台 + 自动检测视频文件 + <video> 播放器
│       ├── store/canvasStore.ts   ← video 平台指令（告诉 Agent 工作流程）
│       └── services/opencodeClient.ts  ← video mock 数据
└── video-nextjs/              ← Remotion 子项目（Agent 在此写代码）
    ├── package.json
    ├── next.config.ts         ← serverExternalPackages 排除 Remotion 原生模块
    ├── public/                ← TTS 音频文件存放处（渲染后清理）
    ├── out/
    │   └── video.mp4          ← Agent 渲染产出物（Vite 通过 /api/video-serve 提供）
    └── src/remotion/
        ├── index.ts
        ├── Root.tsx           ← Agent 修改此文件设置总帧数
        └── VideoComposition.tsx  ← Agent 修改此文件实现视觉效果
```

### 26.3 关键架构决策

**为什么从"预设模板 → Agent 写代码"？**

最初方案用 8 种预设布局（bold/split/quote/neon 等），Agent 只能选布局参数，视觉上限固定。改为让 Agent 直接写 React 组件代码后，Agent 可以自由使用任何 Remotion API、任意 SVG 动画、粒子效果、视差等复杂效果，视觉上限与模型能力相同。

**为什么不用 `@remotion/renderer` 在 Node.js 里渲染？**

`@remotion/renderer` 内部依赖 `ensureBrowser()` 在国内会尝试访问 `storage.googleapis.com` 下载 Chromium，被墙报 `getaddrinfo ENOTFOUND`。改为让 Agent 直接调用 `npx remotion render` CLI，Remotion CLI 自带 `chrome-headless-shell` 缓存机制，完全无需用户安装 Chrome。

**Remotion 浏览器优先级（无需用户安装 Chrome）**

Remotion CLI 按以下顺序查找浏览器：
1. `node_modules/.remotion/chrome-headless-shell/`（`npx remotion browser ensure` 下载并缓存，约 193MB）
2. 用户通过 `--browser-executable` 显式传入的路径
3. 以上均无则自动尝试下载（国内可能超时）

Agent Prompt 中的渲染命令设计为：先检查 `node_modules/.remotion/chrome-headless-shell/` 是否存在，有则直接 `npx remotion render`；没有则运行 `npx remotion browser ensure` 下载；下载失败才回退到系统 Chrome。这样大多数情况下用户无需任何额外安装。

**为什么要安装 Remotion skill？**

`~/.config/opencode/skills/remotion/SKILL.md` 是 Remotion 官方提供的 Agent 知识文档，包含：
- 动画只能用 `useCurrentFrame()` + `interpolate()`，CSS transitions 无效
- `<Audio src={staticFile("file.mp3")} />` 添加音频
- `<Sequence from={N}>` 内 `useCurrentFrame()` 自动归零
- 如何设置竖版 1080×1920 等

OpenCode Agent 自动读取此 skill 文件，确保生成的代码符合 Remotion 约束。

**OutputNode 如何知道视频已渲染完成？**

Agent 运行完后触发 `session.idle` 事件，但 OutputNode 没有 `status` 字段，无法直接感知。解决方案：`useEffect` 监听 `videoScript`（解析成功代表 Agent 已完成），自动 `HEAD /api/video-serve` 检测文件，存在则直接设置 `videoUrl` 显示播放器，不需要用户再点"生成视频"按钮。

### 26.4 Remotion Skill 安装

```bash
# 方式一：通过 remotion CLI（推荐）
cd packages/thinkflow/video-nextjs
node_modules/.bin/remotion skills add --yes --global

# 方式二：手动 clone 安装
git clone --depth 1 https://github.com/remotion-dev/skills.git /tmp/remotion-skills
cp -r /tmp/remotion-skills/skills/remotion ~/.config/opencode/skills/
```

安装后 `~/.config/opencode/skills/remotion/SKILL.md` 会被 OpenCode Agent 自动读取。

### 26.5 视频生成 Prompt 关键设计

Prompt 需明确告知 Agent：
1. 音频文件放在 `video-nextjs/public/`，用 `edge-tts --voice zh-CN-XiaoxiaoNeural`
2. 用 `ffprobe -v quiet -print_format json -show_format` 获取时长
3. 分镜 durationInFrames = `ceil((audioDuration + 0.3) * 30)`
4. 每个分镜组件内用 `<Audio src={staticFile("audio-N.mp3")} />` 挂载音频
5. 渲染时优先用已缓存的 `chrome-headless-shell`（`npx remotion render` 自动检测），无则运行 `npx remotion browser ensure` 下载，最后才回退到系统 Chrome（见 26.3）

### 26.6 Vite 插件简化

新架构只需一个极简的文件服务端点：
```typescript
// vite.config.ts — videoServePlugin
server.middlewares.use("/api/video-serve", (req, res) => {
  if (req.method === "HEAD") {
    res.statusCode = existsSync(VIDEO_OUT_PATH) ? 200 : 404
    res.end(); return
  }
  if (!existsSync(VIDEO_OUT_PATH)) { res.statusCode = 404; res.end(); return }
  res.setHeader("Content-Type", "video/mp4")
  createReadStream(VIDEO_OUT_PATH).pipe(res)
})
```

### 26.7 外部依赖

| 工具 | 用途 | 安装方式 |
|------|------|---------|
| `edge-tts` | 中文 TTS，生成 mp3 | `pip install edge-tts` |
| `ffprobe` | 读取 mp3 时长 | 随 `brew install ffmpeg` 安装 |
| `chrome-headless-shell` | Remotion 渲染引擎 | `npx remotion browser ensure`（缓存在 `node_modules/.remotion/`，约 193MB，无需安装 Chrome）|
| Remotion CLI | 渲染命令 | `video-nextjs/node_modules/.bin/remotion` |

### 26.8 关键约束

| 约束 | 说明 |
|------|------|
| `Sequence` 内帧计数自动归零 | `<Sequence from={N}>` 内 `useCurrentFrame()` 从 0 开始，**不能再减偏移量** |
| 音频放 `public/` | `staticFile("audio.mp3")` 只能访问 `publicDir` 下文件，Agent 必须把 mp3 放到 `video-nextjs/public/` |
| 浏览器无需手动安装 | Remotion CLI 优先用 `node_modules/.remotion/chrome-headless-shell`（`npx remotion browser ensure` 缓存），无需安装 Chrome；只有缓存不存在且网络不通时才需要通过 `--browser-executable` 指向系统 Chrome |
| `vite.config.ts` 中禁用 `require()` | Vite 配置文件是 ESM，不能用 `require("net")` 等，须改为顶层 `import { createConnection } from "net"` |
| `buildStart` 不触发于 dev | Vite 插件的 `buildStart` 钩子只在 `vite build` 时调用，dev server 启动时用 `configureServer` |
| `VideoScript` 类型精简 | 不再含 `slides[]`（结构化 JSON），只含 `title` 和可选 `description`，实际视觉由 Agent 在 `.tsx` 文件中自由实现 |

### 26.9 历史演进（踩坑备忘）

**阶段 1**：Vite 插件内联渲染（`render-worker.mjs`）
- Worker `detached: true` + `worker.unref()` 避免被 Vite SIGTERM 杀死
- `res.on("close")` 不能用 `req.on("close")`（POST body 读完即触发）
- `RenderInternals.serveStatic` 必须将 bundle 转为 HTTP URL

**阶段 2**：迁移到 Next.js（`video-nextjs`）
- `new URL(".", import.meta.url)` 在 Next.js webpack 里报 `Can't resolve '.'`，改用 `process.cwd()`
- `serverExternalPackages` 必须包含 Remotion 相关包，否则 webpack 尝试 bundle 原生模块报二进制文件解析错误
- `buildStart` 改 `configureServer` 才能在 dev 模式下启动 Next.js

**阶段 3（当前）**：Agent 直接写代码
- 完全移除 `@remotion/renderer` 程序化渲染，改由 CLI 渲染
- Remotion 自带 `chrome-headless-shell` 缓存，无需用户安装 Chrome
- `VideoScript` 类型精简，`slides[]` 废弃，只保留标题作为预览摘要

---

## Phase 27：多画布后台运行架构

### 27.1 问题背景

早期 `switchWorkflow` 在切换画布时会调用 `abortWorkflow` 终止正在运行的 Agent session，导致用户切换画布后正在生成的内容丢失。

### 27.2 解决思路

`runWorkflow` 本质上是一个异步函数，它的所有回调（SSE 事件、节点更新）在函数启动后独立运行。问题在于这些回调通过 `updateNodeData` 操作的是 **当前激活画布的 nodes**，切换后节点 id 不再存在于 `nodes` 数组中，更新静默失效。

解决方案：在 `runWorkflow` 启动时捕获 `runWorkflowId`，所有后续更新通过工作流感知函数写入 `workflows[runWorkflowId]`。

### 27.3 核心实现：`updateWorkflowNodeData`

```typescript
// runWorkflow 启动时捕获所属工作流 id
const runWorkflowId = get().activeWorkflowId

const updateWorkflowNodeData = <T extends Record<string, unknown>>(nodeId: string, data: Partial<T>) => {
  set((s): Partial<CanvasStore> => {
    const patchNode = (n: FlowNode): FlowNode =>
      n.id === nodeId ? ({ ...n, data: { ...n.data, ...(data as Record<string, unknown>) } } as FlowNode) : n

    const wf = s.workflows[runWorkflowId]
    const updatedWorkflows: Record<string, WorkflowRecord> = wf
      ? { ...s.workflows, [runWorkflowId]: { ...wf, nodes: wf.nodes.map(patchNode) } }
      : s.workflows

    // 若当前活跃画布就是运行画布，同时更新 nodes 以即时反映到 UI
    const updatedNodes = s.activeWorkflowId === runWorkflowId
      ? s.nodes.map(patchNode)
      : s.nodes

    return { workflows: updatedWorkflows, nodes: updatedNodes }
  })
}
```

**关键点**：同时写 `workflows[runWorkflowId].nodes`（持久）和 `nodes`（UI 即时），两者通过 `activeWorkflowId === runWorkflowId` 判断是否需要同步。

### 27.4 `switchWorkflow` 的修改

```typescript
// 修改前（会中止后台进程）
switchWorkflow: (id) => {
  nodes.filter(n => n.type === "agent" && n.data.status === "running")
    .forEach(n => get().abortWorkflow(n.id))  // ← 删除这两行
  ...
}

// 修改后（后台继续运行）
switchWorkflow: (id) => {
  // 不中止 Agent，让后台 session 继续写入 workflows[runWorkflowId]
  _saveCurrentWorkflow()
  ...
}
```

### 27.5 切换后再切回的行为

1. 用户在画布 A 运行 Agent → 切换到画布 B
2. Agent session 继续运行，SSE 事件通过 `updateWorkflowNodeData` 写入 `workflows[A].nodes`
3. 用户切回画布 A → `switchWorkflow` 加载 `workflows[A].nodes`，看到完整结果
4. 若 Agent 在后台已完成，切回时节点状态为 `done`，内容已填充

### 27.6 `edges` 动画的工作流感知

节点更新需要感知工作流，边的动画恢复也一样：

```typescript
const setEdgesAnimated = (animated: boolean) => {
  set((s): Partial<CanvasStore> => {
    const patchEdge = (e: FlowEdge) =>
      e.source === agentNodeId || e.target === agentNodeId ? { ...e, animated } : e
    const wf = s.workflows[runWorkflowId]
    return {
      workflows: wf ? { ...s.workflows, [runWorkflowId]: { ...wf, edges: wf.edges.map(patchEdge) } } : s.workflows,
      edges: s.activeWorkflowId === runWorkflowId ? s.edges.map(patchEdge) : s.edges,
    }
  })
}
```

---

## Phase 28：版本发布（GitHub Releases + gh CLI）

### 28.1 发布工具

使用 `gh` CLI（GitHub 官方命令行工具）管理发布：

```bash
brew install gh
gh auth login   # 选择 HTTPS → Login with a web browser
```

### 28.2 发布流程

完整流程见 `packages/thinkflow/docs/RELEASE.md`，核心命令：

```bash
# 1. 更新版本号（tauri.conf.json 中的 version 字段）

# 2. 构建前端 + 桌面 .app（不触发 Tauri 的 DMG 脚本，避免残留文件干扰）
cd packages/thinkflow/desktop
bun tauri build --no-bundle

# 3. 手动打包 DMG（绕过 bundle_dmg.sh 的已知问题）
APP="...target/release/bundle/macos/ThinkFlow.app"
DMG="...bundle/dmg/ThinkFlow_<VERSION>_aarch64.dmg"
TMPDIR=$(mktemp -d)
cp -R "$APP" "$TMPDIR/"
hdiutil create -volname "ThinkFlow" -srcfolder "$TMPDIR" -ov -format UDZO "$DMG"
rm -rf "$TMPDIR"

# 4. 创建 Release 并上传 DMG
gh release create v<VERSION> \
  --title "ThinkFlow v<VERSION>" \
  --notes "更新内容..." \
  --target thinkflow-mvp1 \
  "$DMG"
```

### 28.3 已知问题：`bundle_dmg.sh` 失败

**症状**：`bun tauri build` 在最后 DMG 打包步骤报 `failed to run bundle_dmg.sh`。

**根因**：上次构建产生的临时文件 `rw.*.ThinkFlow*.dmg` 残留在 bundle 目录，`bundle_dmg.sh` 中的 `set -e` 使其在遇到已存在文件时中止。

**解决方案**：改用 `--no-bundle` 仅编译 `.app`，然后用 `hdiutil create` 手动打包 DMG，完全绕开 Tauri 的打包脚本。

### 28.4 DMG 安装常见问题

| 问题 | 原因 | 解决方式 |
|------|------|---------|
| "已损坏，无法打开" | macOS Gatekeeper 拦截未签名应用 | `xattr -cr /Applications/ThinkFlow.app` |
| 安装后打不开 | 安全性设置 | 系统设置 → 隐私与安全性 → 仍要打开 |
| 验证 DMG 完整性 | — | `hdiutil verify ThinkFlow_*.dmg` |

---

## Phase 30：输入卡片注册式架构 + 信息流重构

### 30.1 输入卡片注册式架构（类比输出卡片）

**问题**：早期 InputNode 内用 `INPUT_TABS` 数组硬编码 5 种输入类型，每次新增类型需要修改 InputNode.tsx，且所有输入类型共用相同的 header 样式，视觉上无法区分。

**解决方案**：复制输出卡片的注册式架构到输入节点：

```
src/input-cards/
├── registry.ts           ← InputCardDef 接口 + INPUT_CARD_REGISTRY Map
├── logos.tsx             ← 5 种输入类型 SVG Logo（文本📄/链接🔗/文件📁/记忆🔖/信息流📡）
├── text.ts
├── url.ts
├── file.ts
├── memory.ts
├── feed.ts
└── index.ts              ← 导入所有卡片触发注册副作用
```

**InputCardDef 接口**：
```typescript
export interface InputCardDef {
  key: InputType                    // "text" | "url" | "file" | "memory" | "feed"
  label: string                     // 菜单显示名称（如"文本输入"）
  shortLabel: string                // 节点标题（如"文本"）
  LogoComponent: React.ComponentType<{ size?: number }>
  color: string                     // 主色 hex
  darkColor: string
  bgColor: string                   // header 背景 rgba
  borderColor: string               // 边框 rgba
  darkBgColor: string
  darkBorderColor: string
  placeholder?: string
  description?: string
}
```

**关键经验**：
- 输入卡片与输出卡片架构保持一致，降低心智负担
- 统一使用思流暖棕色 #b47828，与产品 Logo 一致
- 节点 `style.width` 保持 280px，与重构前一致

### 30.2 信息流输入重构（从静态到动态聚合）

**问题**：早期"信息流"只是简单的 MCP 工具选择（fetch/GitHub），用户无法配置源 URL、刷新频率、内容过滤，本质上是静态配置而非真正的信息聚合流程。

**解决方案**：重构为完整的可配置信息源系统。

**新增文件**：`src/services/feedService.ts`
```typescript
export interface FeedConfig {
  url: string
  type: "rss" | "api" | "webhook" | "github"
  refreshInterval: "5min" | "15min" | "1hour" | "6hours" | "1day"
  filters?: {
    keywords?: string[]      // 关键词白名单过滤
    exclude?: string[]       // 排除词
    maxItems?: number        // 最大条目数
  }
}
```

**InputNode UI 改造**：
- 顶部：3 种源类型选择按钮（RSS 📰 / GitHub 🐙 / API 🔌）
- URL 输入框（RSS 或 API 地址）
- 关键词过滤输入（逗号分隔）
- 刷新频率下拉（5分钟/15分钟/1小时/6小时/1天）
- **立即获取**按钮（带加载状态 ⟳）
- 内容预览区（格式化展示条目列表）
- 状态显示：最后更新时间、字数统计

**自动刷新机制**：
```typescript
// InputNode.tsx
useEffect(() => {
  if (data.inputType !== "feed" || !data.feedUrl) return
  const ms = intervalToMs(data.refreshInterval)
  feedTimerRef.current = setInterval(() => handleFetchFeed(), ms)
  return () => clearInterval(feedTimerRef.current)
}, [data.inputType, data.feedUrl, data.refreshInterval])
```

**数据存储**：
- `InputNodeData.feedUrl?: string` - 源地址
- `InputNodeData.feedType?: "rss" | "github" | "api"` - 源类型
- `InputNodeData.feedKeywords?: string` - 过滤关键词
- `InputNodeData.refreshInterval?: string` - 刷新周期
- `InputNodeData.feedLastFetch?: string` - 最后更新时间（ISO 字符串）

### 30.3 右键菜单图标化改造

**问题**：子菜单条目使用彩色圆点（`.tf-submenu-dot`）标识平台/类型，颜色过多导致视觉混乱，且平台识别度不高。

**改造方案**：

**Canvas.tsx 导入各平台 Logo**：
```typescript
import { ZhihuLogo, WechatLogo, ... } from "../cards"
import { TextLogo, LinkLogo, ... } from "../input-cards"

const OUTPUT_LOGO_MAP: Record<string, React.ComponentType> = {
  zhihu: ZhihuLogo, wechat: WechatLogo, ...
}
const INPUT_LOGO_MAP: Record<string, React.ComponentType> = {
  text: TextLogo, url: LinkLogo, ...
}
```

**子菜单渲染**：
```tsx
{getAllInputCards().map((card) => {
  const LogoComponent = INPUT_LOGO_MAP[card.key]
  return (
    <div className="tf-context-menu-item" ...>
      <span style={{ color: "var(--text-muted)" }}>
        <LogoComponent size={14} />
      </span>
      {card.label}
    </div>
  )
})}
```

**效果**：
- 输入节点子菜单：📄 文本输入 / 🔗 链接输入 / 📁 文件输入 / 🔖 记忆输入 / 📡 信息流
- 输出节点子菜单：各平台品牌 Logo（知/公众号/日记/笔记/小红书/视频）

### 30.4 输出卡片颜色降饱和

**问题**：早期配色过于鲜艳，在浅色画布上刺眼：
- 知乎 #0070d2（亮蓝）/ 公众号 #07c160（亮绿）/ 小红书 #ff2b54（亮粉）

**调整方案**：统一降饱和约 40%，使用柔和灰调：

| 平台 | 调整前 | 调整后 |
|------|--------|--------|
| 知乎 | #0070d2 | #5a7a96（灰蓝） |
| 公众号 | #07c160 | #6b9b7a（灰绿） |
| 日记 | #b47828 | #a08060（保持暖棕，微调） |
| 笔记 | #6366f1 | #7a7a9a（灰紫） |
| 小红书 | #ff2b54 | #c06070（灰粉） |
| 视频 | #ef4444 | #b06060（灰红） |

**CSS 变量同步更新**：`tf-platform-badge.*` 类的背景色、文字色、边框色全部对应调整。

---

## Phase 29：输出卡片注册式架构

### 29.1 为什么要注册式架构

早期 OutputNode 内硬编码所有平台逻辑（PLATFORMS 数组、getPlatformInstruction 中的 if-else 链、CSS 平台类名），每次新增平台需要修改 5+ 个文件，容易遗漏。

注册式架构将每个平台的所有定义（样式、Logo、指令、预览组件）集中在一个文件里，新增平台只需：
1. 在 `src/cards/` 新建一个 `.ts` 文件
2. 在 `src/cards/index.ts` 加一行 import

OutputNode、Canvas.tsx、canvasStore 均无需修改。

### 29.2 CardDef 接口设计

```typescript
// src/cards/registry.ts
export interface CardDef {
  key: OutputPlatform
  label: string
  LogoComponent: React.ComponentType<{ size?: number }>  // 品牌 logo
  color: string                   // 主色 hex（浅色主题）
  darkColor: string               // 主色 hex（深色主题）
  bgColor: string                 // header 背景色 rgba
  borderColor: string             // 边框色 rgba
  darkBgColor: string
  darkBorderColor: string
  defaultInstruction: (contentFormat: ContentFormat) => string
  supportedFormats: ContentFormat[]
  PreviewComponent?: React.ComponentType<PreviewProps>  // 平台专属预览（可选）
}
```

**关键约束**：
- `defaultInstruction` 是函数，入参是 `contentFormat`，允许同一平台在图文/纯文本模式下返回不同指令
- `PreviewComponent` 可选；不提供时 OutputNode 使用默认的 ReactMarkdown 预览
- 注册顺序即右键菜单顺序（`getAllCards()` 按插入顺序返回）

### 29.3 用户自定义提示词

`OutputNodeData.customInstruction?: string` 覆盖卡片默认指令：

```typescript
// canvasStore.ts — getPlatformInstruction
function getPlatformInstruction(platform, contentFormat, customInstruction?) {
  const baseInstruction = customInstruction?.trim()
    || getCard(platform).defaultInstruction(contentFormat)
  return baseInstruction + imgFormatNote  // 图文后缀照旧追加
}
```

OutputNode 内的"提示词设置"折叠区：
- 展开后显示当前生效的提示词（自定义值 ?? 卡片默认值）
- 编辑后写入 `customInstruction`
- "恢复默认"按钮将 `customInstruction` 设为 `undefined`，下次渲染自动读取卡片默认值

### 29.4 CSS 平台主题系统

每个平台通过 `.tf-node--{platform}` class 设置 3 个 CSS 变量，统一应用到边框、阴影、header 背景：

```css
.tf-node--xiaohongshu {
  --tf-platform-color: #ff2b54;
  --tf-platform-bg: rgba(255,43,84,0.06);
  --tf-platform-border: rgba(255,43,84,0.28);
  --tf-platform-shadow: rgba(255,43,84,0.14);
}
```

hover/selected 状态通过 `box-shadow` 叠加实现光晕效果，不修改 `border-width`（避免布局抖动）。

### 29.5 CSS 子菜单 hover gap 问题

**症状**：右键菜单"输出节点"悬停展开子菜单，鼠标从父项向右移动时子菜单闪消。

**根因**：`left: calc(100% + 4px)` 在父项和子菜单之间留了 4px 空白，鼠标穿过空白时 hover 短暂丢失，子菜单立即隐藏。

**修复**：
```css
.tf-context-submenu {
  left: 100%;           /* 紧贴父项右边，无间隙 */
  padding-left: 8px;    /* 不可见热区，防止 hover 丢失 */
  background: transparent;  /* 外层透明 */
}
.tf-context-submenu__inner {
  /* 实际可见菜单样式放内层 */
}
```

### 29.6 SVG Logo 设计经验

**复杂 path 不可靠**：用复杂 SVG path 绘制汉字笔画，在 size=20 的缩放下很容易变形或渲染失败。

**最可靠方案**：用 `<text>` 元素直接渲染品牌汉字，依赖系统字体：

```tsx
<svg width={size} height={size} viewBox="0 0 24 24" fill="none">
  <rect width="24" height="24" rx="5" fill="#ff2b54" />
  <text x="12" y="15.5" textAnchor="middle" dominantBaseline="middle"
    fill="white" fontSize="7" fontWeight="900"
    fontFamily="'PingFang SC','Microsoft YaHei',sans-serif"
    letterSpacing="0.5">小红书</text>
</svg>
```

**原则**：
- 品牌文字用 `<text>`，几何图形（气泡、矩形、三角）用 `<rect>/<ellipse>/<polygon>`
- 统一 `viewBox="0 0 24 24"`，不用宽矩形 viewBox（会使 size prop 失效）
- `dominantBaseline="middle"` + `textAnchor="middle"` 实现真正居中
- `fontFamily` 列出多个备选字体，先 PingFang SC（macOS），再 Microsoft YaHei（Windows）

---

## 验证方式

```bash
# 启动（自动拉起 OpenCode + Vite）
cd packages/thinkflow/app && bun dev
# 访问 http://localhost:1421

# 单元测试
bunx vitest run        # 50 个用例全部通过

# 类型检查
bun run typecheck      # 零 TS 错误

# E2E benchmark（干跑，无需 OpenCode）
bunx playwright test e2e/benchmark/context-injection.spec.ts   # 7 个场景全部通过

# E2E Vercel 冒烟测试（本地 dev server）
TEST_BASE_URL="http://localhost:1421" ./node_modules/.bin/playwright test e2e/vercel-smoke.spec.ts   # 9 个场景全部通过
```

---

## Phase 23：桌面版发布（Tauri + Sidecar）

### 23.1 架构

- **Tauri sidecar**：将 `opencode-cli` 二进制打包进 `.app` 内，用户安装后无需自行安装 OpenCode
- sidecar 路径：`packages/thinkflow/desktop/src-tauri/sidecars/opencode-cli-<target-triple>`
  - macOS ARM：`opencode-cli-aarch64-apple-darwin`
  - macOS x86：`opencode-cli-x86_64-apple-darwin`
- `.gitignore` 排除 sidecars 目录下所有二进制（仅保留 `.gitignore` 文件本身）

### 23.2 tauri.conf.json 关键配置

```json
{
  "bundle": {
    "externalBin": ["sidecars/opencode-cli"]
  },
  "build": {
    "frontendDist": "../../app/dist",
    "beforeBuildCommand": "cd ../../app && bun run build"
  }
}
```

> **坑**：`frontendDist` 和 `beforeBuildCommand` 路径是相对于 `src-tauri/` 目录的，不是相对于 `desktop/`。

### 23.3 前端启动逻辑（`desktop/src/main.tsx`）

```typescript
// 轮询等待 sidecar 启动，最多 30 秒
for (let i = 0; i < 60; i++) {
  try {
    const data = await invoke<{ url: string }>("ensure_server_ready")
    url = data.url
    break
  } catch {
    await new Promise((r) => setTimeout(r, 500))
  }
}
// 超时则降级为 localhost:4096
sessionStorage.setItem("thinkflow_server_url", url)
```

### 23.4 `opencodeClient.ts` 多环境 URL 优先级

```
sessionStorage("thinkflow_server_url")   ← Tauri sidecar 写入
  ||
VITE_OPENCODE_SERVER_URL（构建时注入）   ← Vercel 部署时设置
  ||
"http://localhost:4096"                  ← 本地开发默认
```

---

## Phase 24：网页版部署（Vercel + Railway）

### 24.1 整体架构

```
用户浏览器
  ↓  HTTPS
Vercel（静态前端 + API Routes）
  ↓  HTTPS（CORS 通过）
Railway（OpenCode serve 进程，Docker 容器）
  ↓  OpenRouter API
AI 模型（Kimi K2.6 等）
```

### 24.2 Vercel 配置（`packages/thinkflow/app/vercel.json`）

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }],
  "buildCommand": "bun run build",
  "outputDirectory": "dist",
  "installCommand": "bun install"
}
```

- Root Directory：`packages/thinkflow/app`（在 Vercel 控制台 Settings 里设置）
- Production Branch：`thinkflow-mvp1`
- 环境变量：`VITE_OPENCODE_SERVER_URL` = Railway 服务 URL（`https://xxx.railway.app`）

> **坑 1**：`VITE_OPENCODE_SERVER_URL` 是 Vite 构建时注入，设置后必须 **Redeploy**（不能用缓存构建）才生效。  
> **坑 2**：Vercel 默认用 `dev` 分支，需在 Settings → Git → Production Branch 改为 `thinkflow-mvp1`。  
> **坑 3**：commit 作者邮箱必须与 GitHub 账号绑定，否则 Vercel 认证失败无法自动部署。

### 24.3 Vercel API Route（`api/openrouter/[...path].ts`）

OpenRouter 请求由服务端代理，避免 API Key 暴露在前端：

```typescript
const apiKey = process.env.OPENROUTER_API_KEY
if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`
```

- 需要在 `tsconfig.json` 的 `include` 里加入 `"api"` 目录
- 需要安装 `@types/node` devDependency（否则 `process` 报类型错误）

### 24.4 Railway 配置（`packages/thinkflow/Dockerfile.opencode`）

```dockerfile
# Builder: Dockerfile
# Dockerfile Path: packages/thinkflow/Dockerfile.opencode

CMD ["sh", "-c", "cd packages/opencode && bun run --conditions=browser src/index.ts serve \
  --hostname 0.0.0.0 --port ${PORT} --cors '*'"]
```

**monorepo workspace 依赖处理**：opencode 依赖多个 workspace 包，需用 stub package.json 占位让 bun 能解析 workspace：

```dockerfile
RUN echo '{"name":"@stub/app","version":"0.0.0"}' > packages/app/package.json
# 每个 stub 必须有唯一 name，否则 bun 报 workspace name 冲突
```

需复制的真实包：`opencode`, `plugin`, `script`, `sdk/js`, `util`, `patches/`

> **坑**：`--frozen-lockfile` 与 stub 不兼容，需去掉。

### 24.5 CORS 修复（核心问题）

**症状**：Railway 服务正常响应（`/global/health` 返回 200），但浏览器请求被拦截。  
**根因**：OpenCode server.ts 的 CORS 白名单只做精确匹配，`--cors '*'` 传入的是字面字符串 `*`，不是通配符。

**修复**（`packages/opencode/src/server/server.ts`）：

```typescript
// 修复前
if (_corsWhitelist.includes(input)) { return input }

// 修复后
if (_corsWhitelist.includes("*") || _corsWhitelist.includes(input)) { return input }
```

### 24.6 Bun Macro 运行时错误修复

**症状**：Railway 容器日志出现 `ReferenceError: data is not defined`（`models.ts:83`）  
**根因**：`models.ts` 用了 Bun macro（`with { type: "macro" }`），但 `--conditions=browser` 直接运行源码时 macro 不展开。

**修复**（`packages/opencode/src/provider/models.ts`）：

```typescript
// 修复前
const json = await data()

// 修复后
const json =
  typeof data === "function"
    ? await data()
    : await fetch("https://models.dev/api.json").then((r) => r.text())
```

### 24.7 部署验证命令

```bash
# Railway CORS 是否生效
curl -H "Origin: https://thinkflow-opencode-app.vercel.app" \
  -I "https://thinkflow-opencode-production.up.railway.app/global/health" \
  | grep access-control-allow-origin
# 期望输出: access-control-allow-origin: https://thinkflow-opencode-app.vercel.app

# Railway 服务健康
curl "https://thinkflow-opencode-production.up.railway.app/global/health"
# 期望输出: {"healthy":true,"version":"local"}
```

---

## Phase 25：E2E Vercel 冒烟测试（`e2e/vercel-smoke.spec.ts`）

### 25.1 测试范围（9 个场景）

| 场景 | 验证内容 |
|------|---------|
| 页面加载并显示画布 | 标题含 ThinkFlow，`.react-flow` 可见 |
| Toolbar 渲染正常 | `.tf-toolbar` 可见 |
| 右键菜单可打开 | `.tf-context-menu` 出现，含 3 个选项 |
| 添加输入节点 | 右键 → 第一项 → `.react-flow__node` 出现 |
| 添加 Agent 节点 | 右键 → 第二项 → `.react-flow__node-agent` 出现 |
| 添加输出节点 | 右键 → 第三项 → `.react-flow__node-output` 出现 |
| 主题切换 | 点击主题按钮后 `data-theme` 属性变化 |
| 记忆侧边栏 | 点击记忆按钮后 `.tf-memory-panel` 出现 |
| Dry-run 工作流 | 默认 3 节点存在，输出节点可见 |

### 25.2 关键实现细节

**`resetCanvas` 必须保留 `thinkflow-tour-done`**：清空 localStorage 会触发 TourGuide 弹出，遮挡画布操作。

```typescript
async function resetCanvas(page) {
  await page.evaluate(() => {
    const tourDone = localStorage.getItem("thinkflow-tour-done")
    Object.keys(localStorage).filter(k => k.includes("thinkflow"))
      .forEach(k => localStorage.removeItem(k))
    localStorage.setItem("thinkflow-tour-done", tourDone ?? "1")
  })
}
```

**右键坐标必须避开默认节点区域**：默认画布有 3 个初始节点，`fitView` 后会居中显示，右键点到节点上不触发 `onPaneContextMenu`。使用右下角安全坐标 `(900, 600)`：

```typescript
async function openContextMenu(page, x = 900, y = 600) {
  const pane = page.locator(".react-flow__pane")
  const box = await pane.boundingBox()
  const safeX = box ? Math.min(x, box.width - 40) : x
  const safeY = box ? Math.min(y, box.height - 40) : y
  await pane.click({ button: "right", position: { x: safeX, y: safeY } })
}
```

**本地无法访问 Vercel 时**：用 `TEST_BASE_URL=http://localhost:1421` 在本地 dev server 跑测试，功能等价。

### 25.3 playwright.config.ts

```typescript
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1421"
export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
})
```
