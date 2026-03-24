# TUI 与客户端

终端 UI 和 Web 客户端的渲染与状态同步。

---

## 理解 Client/Server 分离

OpenCode 所有 UI 都是 server 的客户端。它们通过同一套 API 通信：

- **REST API**：CRUD 操作（创建会话、发送消息）
- **SSE**：实时事件流（消息更新、工具执行）
- **WebSocket**：PTY 终端会话

TUI、Web、Desktop 的核心区别只在渲染层。

---

## 认识 TUI 架构

TUI 用 SolidJS + opentui 渲染到终端。opentui 是一个自研的终端渲染引擎。

入口在 `src/cli/cmd/tui/app.tsx`，context provider 嵌套很深：

```
ArgsProvider > ExitProvider > KVProvider > ToastProvider
  > RouteProvider > SDKProvider > SyncProvider
    > ThemeProvider > LocalProvider > KeybindProvider
      > PromptStashProvider > DialogProvider
        > CommandProvider > FrecencyProvider
          > PromptHistoryProvider > PromptRefProvider > App
```

每一层 provider 提供一个独立的关注点。

---

## 掌握路由系统

TUI 有两个主要路由：

- **Home**：新会话页面，显示欢迎信息
- **Session**：活跃会话页面，包含消息列表、输入框、侧边栏

```tsx
function App() {
  const route = useRoute()
  return (
    <Switch>
      <Match when={route() === "home"}>
        <Home />
      </Match>
      <Match when={route() === "session"}>
        <Session />
      </Match>
    </Switch>
  )
}
```

---

## 理解状态同步

`SyncProvider` 是 client 端的核心。它连接 SSE 事件流，维护 SolidJS reactive store。

```ts
// 简化版
function SyncProvider(props) {
  const [store, setStore] = createStore({
    sessions: [],
    messages: {},     // sessionID → Message[]
    parts: {}         // messageID → Part[]
  })

  // 监听 SSE 事件
  const source = new EventSource("/global/event")
  source.addEventListener("session.updated", (e) => {
    const data = JSON.parse(e.data)
    setStore("sessions", reconcile(/* 更新对应会话 */))
  })
  source.addEventListener("message.part.updated", (e) => {
    const data = JSON.parse(e.data)
    // 用 Binary.search 在排序数组中找到位置
    // 用 reconcile 高效更新
  })

  return <SyncContext.Provider value={store}>{props.children}</SyncContext.Provider>
}
```

关键技术：

- **`reconcile`**：SolidJS 的高效 diffing，只更新变化的部分
- **`Binary.search`**：在排序数组中用二分查找定位元素

---

## 看懂 Web 应用

Web 应用在 `packages/app`，也用 SolidJS，但渲染到浏览器 DOM。

```
packages/app/
  src/
    entry.tsx         # 入口
    app.tsx           # 主应用
    pages/
      home.tsx        # 首页
      session.tsx     # 会话页
    context/
      sync.tsx        # 状态同步（同 TUI 逻辑）
      sdk.tsx         # SDK client 实例
```

Web 和 TUI 共享 `@opencode-ai/ui` 组件库，包括 markdown 渲染、diff 展示、代码高亮（shiki）等。

---

## 理解 Desktop 应用

Desktop 用 Tauri v2，本质是 Rust 壳 + Web 应用。

```
packages/desktop/
  src-tauri/          # Rust 后端
  src/                # 复用 packages/app 的 Web UI
```

Tauri 提供原生能力：窗口管理、系统通知、自动更新、文件对话框。

---

## 理解 SDK

`@opencode-ai/sdk` 是从 OpenAPI spec 自动生成的。Client 通过它调用 server。

```ts
import { createOpencode } from "@opencode-ai/sdk"

const client = createOpencode({
  baseURL: "http://localhost:4096",
})

// 创建会话
const session = await client.session.create()

// 发送消息
await client.session.chat(session.id, {
  parts: [{ type: "text", text: "Hello" }],
})

// 监听事件
client.events.subscribe((event) => {
  console.log(event.type, event.data)
})
```

---

## 认识 TUI 组件

TUI 的关键组件：

| 组件       | 功能                                     |
| ---------- | ---------------------------------------- |
| `Prompt`   | 输入框，支持历史、自动完成、文件引用     |
| `Messages` | 消息列表，渲染 text/tool/reasoning parts |
| `Sidebar`  | 侧边栏，显示文件变更                     |
| `Header`   | 顶部栏，显示 agent/model 信息            |
| `Footer`   | 底部栏，显示快捷键和状态                 |
| `Dialog`   | 弹窗系统（模型选择、主题切换等）         |

---

## 理解快捷键系统

快捷键通过 `KeybindProvider` 管理，支持 vim 风格的 leader key。

```json
{
  "keybinds": {
    "leader": " ",
    "session:new": "ctrl+n",
    "model:select": "leader m"
  }
}
```

快捷键配置可在 `opencode.json` 中自定义。

---

## 关键文件

| 文件                         | 内容                     |
| ---------------------------- | ------------------------ |
| `src/cli/cmd/tui/app.tsx`    | TUI 入口和 provider 嵌套 |
| `src/cli/cmd/tui/routes/`    | TUI 路由组件             |
| `src/cli/cmd/tui/component/` | TUI 业务组件             |
| `src/cli/cmd/tui/context/`   | TUI context providers    |
| `packages/app/src/`          | Web 应用                 |
| `packages/ui/src/`           | 共享 UI 组件库           |
| `packages/sdk/js/src/`       | JS SDK                   |

---

## 动手验证

1. 运行 `bun dev`，在 TUI 里按 `?` 查看所有快捷键
2. 读 `tui/context/sync.tsx`，理解 SSE 事件如何映射到 store 更新
3. 对比 TUI 和 Web 的 `SyncProvider`，找到它们的共同模式
