# 设计模式速查

贯穿 OpenCode 的核心模式和代码风格。

---

## Namespace 模式

用 TypeScript namespace 替代 class。每个模块的类型、schema、函数、状态全部聚合在一个 namespace 里。

```ts
export namespace Session {
  export const Info = z.object({ id: z.string() })
  export type Info = z.infer<typeof Info>

  export async function create() { ... }
  export async function get(id: string) { ... }

  export const Event = {
    Created: BusEvent.define("session.created", z.object({ info: Info }))
  }
}
```

为什么不用 class？namespace 没有原型链开销，天然支持 tree-shaking，且类型和值可以同名。

---

## Zod-first 设计

所有数据边界先定义 Zod schema，再推导 TypeScript 类型。

```ts
// schema 和 type 同名，靠 TypeScript 的值/类型双重身份区分
export const Info = z
  .object({
    id: z.string(),
    title: z.string(),
  })
  .meta({ ref: "Session" })

export type Info = z.infer<typeof Info>
```

`.meta({ ref })` 注解用于 SDK 代码生成，让生成的类型有语义化的名字。

---

## fn() 包装器

用 Zod schema 自动校验函数输入。

```ts
export const get = fn(z.object({ id: Identifier.schema("session") }), async (input) => {
  return Storage.read<Info>(["session", input.id])
})
```

`fn()` 还暴露 `.force()`（跳过校验）和 `.schema`（获取 schema）。

---

## Instance.state() 单例

每个模块用 `Instance.state()` 创建按目录隔离的懒加载单例。

```ts
const state = Instance.state(
  async () => {
    // init：每个目录只执行一次
    return { data: await loadExpensiveData() }
  },
  () => {
    // dispose：清理资源
  },
)
```

---

## 事件驱动

所有跨模块通信通过 typed 事件。

```ts
// 定义
const Created = BusEvent.define("session.created", z.object({ info: Info }))

// 发布
Bus.publish(Created, { info: session })

// 订阅
Bus.subscribe(Created, (payload) => { ... })
```

---

## 禁止 let + else

风格指南严格执行。用 `const` + 三元表达式或 IIFE 替代 `let`。

```ts
// Good
const value = condition ? 1 : 2

// Good - IIFE
const result = (() => {
  if (condition) return 1
  return 2
})()

// Bad
let value
if (condition) value = 1
else value = 2
```

---

## 早返回

用 early return 替代 else 分支。

```ts
// Good
function process(input) {
  if (!input) return null
  if (input.type === "a") return handleA(input)
  return handleDefault(input)
}

// Bad
function process(input) {
  if (!input) {
    return null
  } else if (input.type === "a") {
    return handleA(input)
  } else {
    return handleDefault(input)
  }
}
```

---

## NamedError

用 `NamedError.create()` 替代 try/catch。错误是类型化的。

```ts
export const NotFoundError = NamedError.create(
  "StorageNotFound",
  z.object({
    key: z.array(z.string()),
  }),
)

// 抛出
throw new NotFoundError({ key: ["session", id] })

// 捕获（如果必须）
if (e instanceof NotFoundError) {
  console.log("找不到:", e.data.key)
}
```

---

## Prompt 文件

System prompt 和 tool 描述存为 `.txt` 文件，直接 import。

```ts
import DESCRIPTION from "./bash.txt"

Tool.define("bash", async () => ({
  description: DESCRIPTION,
  // ...
}))
```

不同 provider 有不同的 prompt 文件（anthropic.txt、gemini.txt、gpt.txt）。

---

## 单词命名

尽量用单个单词命名。

```ts
// Good
const session = ...
const agent = ...
const result = ...

// Avoid
const sessionInfo = ...
const currentAgent = ...
const processedResult = ...
```

---

## 文件系统即数据库

没有 SQL，没有 ORM。JSON 文件 + 路径段 + 文件锁。

```ts
// 路径段映射到文件路径
Storage.read(["session", projectID, sessionID])
// → ~/.local/share/opencode/storage/session/{projectID}/{sessionID}.json
```

---

## 层叠配置

配置从多个来源合并。对象深合并，数组拼接。

```
remote → global → custom → project → .opencode → inline
   低优先级 ────────────────────────── 高优先级
```

---

## OpenAPI-first API

Server 用 `hono-openapi` 定义路由。OpenAPI spec 用于自动生成 SDK。

```
Hono routes (with OpenAPI annotations)
    → OpenAPI spec (JSON)
    → SDK generator
    → @opencode-ai/sdk (TypeScript client)
```

---

## 总结

记住这些模式，你读 OpenCode 源码时会如鱼得水：

1. **Namespace** 替代 class
2. **Zod schema** 先于 TypeScript type
3. **`fn()`** 自动校验输入
4. **`Instance.state()`** 按目录隔离状态
5. **`BusEvent`** typed pub/sub
6. **`const` only**，禁止 let/else
7. **Early return**，禁止 else
8. **NamedError**，避免 try/catch
9. **`.txt` 文件**存放 prompt
10. **JSON 文件**替代数据库
