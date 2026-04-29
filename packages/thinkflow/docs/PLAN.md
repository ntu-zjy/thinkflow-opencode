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
│       │   └── MemorySidebar.tsx
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
- `OutputNodeData`: `platform: "zhihu"|"wechat"|"diary", content, label`
- `MemoryEntry`, `MemoryFolder` — 记忆库数据结构
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
- `addNode(type, position?)` — 添加节点到画布
- `updateNodeData(id, data)` — 更新节点数据
- `runWorkflow(agentNodeId)` — 核心工作流执行：
  1. 找到 agentNodeId 上游所有 InputNode，构建 `parts[]`
  2. 找到下游所有 OutputNode
  3. `dryRun` 为 true → `runMockWorkflow`
  4. `isServerAvailable()` 为 false → `runMockWorkflow`（演示模式）
  5. 先 `subscribeEvents()` 订阅 SSE，再 `createSession()` → `sendPrompt()`
  6. `message.part.updated` → `delta` 追加到 OutputNode.content
  7. `session.idle` → status = "done"
- `abortWorkflow(agentNodeId)` — 关闭 SSE、调用 `abortSession`

**`src/store/memoryStore.ts`**（Zustand + persist to localStorage）：

- `folders[]`, `entries[]`
- `addEntry({ folderId, title, content, tags? })`
- `searchEntries(query)`
- `importFromJson(json)`, `exportToJson()`

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
- 平台选择（知乎 / 公众号 / 日记）
- react-markdown 内容预览
- 一键复制 + 保存到记忆库
- Handle `type="target"` 位于左侧

---

## Phase 6：页面与布局

**`Canvas.tsx`**：
- `onPaneContextMenu` 右键菜单（添加三种节点）
- 快捷键：`deleteKeyCode="Delete"`, `multiSelectionKeyCode="Shift"`
- 快捷提示气泡放 `Panel position="bottom-right"`（避开左下角 Controls）
- MiniMap 颜色使用 CSS 变量

**`Toolbar.tsx`**：
- 品牌 Logo + 添加节点按钮组 + 运行全部 / 停止全部 + 记忆库触发器 + 主题切换
- 主题切换：浅色显示月亮图标，深色显示太阳图标，class `tf-theme-toggle`

**`MemorySidebar.tsx`**：
- 侧边抽屉，`transform: translateX` 动画
- 记忆分类列表（人设 / 素材 / 偏好 / 输出）
- 搜索、新建、编辑、删除、导入 / 导出 JSON

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
| `canvasStore.test.ts` | 节点增删、工作流执行、abort | 10 |
| `memoryStore.test.ts` | CRUD、搜索、导入导出 | 8 |
| `opencodeClient.test.ts` | Session API、Mock 模式、SSE | 5 |
| `nodeTypes.test.ts` | 节点类型注册 | 5 |

`setup.ts` 中需要 `MockEventSource` polyfill（jsdom 无内置 EventSource）。

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
```
