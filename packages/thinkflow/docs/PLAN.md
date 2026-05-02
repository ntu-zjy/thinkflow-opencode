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
- `OutputNodeData`: `platform, content, label, images?, contentType?, contentFormat?`
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

## 验证方式

```bash
# 启动（自动拉起 OpenCode + Vite）
cd packages/thinkflow/app && bun dev
# 访问 http://localhost:1421

# 单元测试
bunx vitest run        # 38 个用例全部通过

# 类型检查
bun run typecheck      # 零 TS 错误

# 端到端测试（需 bun dev 在运行）
./node_modules/.bin/playwright test
```
