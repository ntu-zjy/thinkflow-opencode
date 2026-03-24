# 实例与状态

AsyncLocalStorage 如何让 OpenCode 支持多项目隔离。

---

## 理解问题

OpenCode 的 server 可能同时服务多个项目目录。每个目录有独立的配置、会话、provider。如何在不传递 context 参数的情况下隔离状态？

答案是 **AsyncLocalStorage**。

---

## 读懂 Instance

`Instance` 是整个状态系统的基石。核心在 `src/project/instance.ts`。

```ts
// 建立实例上下文，fn 内的所有代码都能访问该实例
Instance.provide({
  directory: "/path/to/project",
  async fn() {
    // 这里的代码可以直接调用 Instance.directory
    console.log(Instance.directory) // "/path/to/project"
  },
})
```

底层用的是 Bun 的 `Context`（等价于 Node.js 的 `AsyncLocalStorage`）。调用链上的任何函数都能隐式获取当前实例，不需要传参。

---

## 掌握 State.create

`Instance.state()` 是创建实例级状态的唯一方式。它接受一个 init 函数，返回一个 getter。

```ts
const state = Instance.state(async () => {
  // 初始化逻辑，每个项目目录只执行一次
  const config = await loadConfig()
  return { config }
})

// 之后调用 state() 获取缓存值
const { config } = await state()
```

关键特性：

- **懒加载**：init 在第一次调用时才执行
- **去重**：并发调用共享同一个 Promise
- **按目录隔离**：不同项目目录有独立的状态实例

---

## 看懂生命周期

```
Instance.provide({ directory: "/project-a" })
    |
    ├── state1.init() → 缓存到 /project-a 键下
    ├── state2.init() → 缓存到 /project-a 键下
    └── ...

Instance.dispose() → 清理 /project-a 下所有状态

Instance.provide({ directory: "/project-b" })
    |
    ├── state1.init() → 独立的 /project-b 实例
    └── ...
```

`dispose()` 会调用每个 state 注册的 dispose 回调，做资源清理。

---

## 理解 Project 检测

`Instance.project` 返回当前项目信息。OpenCode 自动检测 git 仓库根目录。

```ts
Instance.project.id // 项目唯一 ID（基于路径哈希）
Instance.directory // 当前工作目录
Instance.worktree // git worktree 路径（可能不同于 directory）
```

`worktree` 和 `directory` 的区别很重要——git worktree 或 sandbox 场景下两者不同。`Instance.containsPath(path)` 用来判断某个文件是否在当前项目范围内。

---

## 实际使用示例

几乎每个核心模块都用 `Instance.state()` 管理自己的状态：

```ts
// Config 模块
Config.state = Instance.state(async () => {
  const merged = await mergeAllConfigs()
  return { info: merged }
})

// Provider 模块
Provider.state = Instance.state(async () => {
  const providers = await loadProviders()
  return { providers, cache: new Map() }
})

// Bus 模块
Bus.state = Instance.state(
  () => {
    return { subscribers: new Map() }
  },
  () => {
    // dispose：清理所有订阅
  },
)
```

---

## 关键文件

| 文件                      | 内容                                 |
| ------------------------- | ------------------------------------ |
| `src/project/instance.ts` | Instance 对象、provide/dispose/state |
| `src/project/state.ts`    | State.create 实现                    |
| `src/project/project.ts`  | 项目检测（git root、worktree）       |
| `src/util/context.ts`     | AsyncLocalStorage 封装               |

---

## 动手验证

1. 在 `instance.ts` 里加个 `console.log` 打印 `directory`，看看何时被调用
2. 在 `state.ts` 里追踪 `init` 的调用时机和缓存逻辑
3. 搜索 `Instance.state(` 看看有多少模块使用了这个模式
