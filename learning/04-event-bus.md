# 事件总线

模块间如何通过 typed pub/sub 通信。

---

## 理解事件架构

OpenCode 用事件驱动连接 server 和 client。当 server 端发生变化（新消息、工具执行、会话更新），通过 Bus 发布事件，Client 通过 SSE 接收。

```
Server 模块 → Bus.publish() → GlobalBus → SSE → Client
```

---

## 定义事件

每个事件用 `BusEvent.define()` 创建，接受类型字符串和 Zod schema。

```ts
// 在 session/index.ts 中
export const Event = {
  Created: BusEvent.define("session.created", z.object({ info: Info })),
  Updated: BusEvent.define("session.updated", z.object({ info: Info })),
}
```

`define()` 做两件事：返回一个类型定义对象，同时注册到全局 registry。

---

## 发布事件

发布用 `Bus.publish()`，类型安全——只能传与定义匹配的 payload。

```ts
Bus.publish(Session.Event.Created, { info: newSession })
Bus.publish(Session.Event.Updated, { info: updatedSession })
```

---

## 订阅事件

订阅用 `Bus.subscribe()`，返回取消订阅的函数。

```ts
const unsubscribe = Bus.subscribe(Session.Event.Created, (payload) => {
  console.log("新会话:", payload.info.id)
})

// 清理
unsubscribe()
```

---

## 理解作用域

Bus 有两层：

- **Bus**（实例级）：通过 `Instance.state()` 隔离，每个项目目录独立
- **GlobalBus**（全局）：跨实例传播，用于 SSE 推送到 client

当 `Bus.publish()` 被调用时，事件先在实例 Bus 内传播，然后冒泡到 GlobalBus。Server 监听 GlobalBus 并通过 SSE 推送。

---

## 看懂 SSE 推送

Server 端的 `/global/event` endpoint：

```ts
// 简化版
app.get("/global/event", (c) => {
  return streamSSE(c, async (stream) => {
    const unsubscribe = GlobalBus.subscribe("*", (event) => {
      stream.writeSSE({
        data: JSON.stringify(event),
        event: event.type,
      })
    })
    // 等待连接关闭
    await new Promise(() => {})
    unsubscribe()
  })
})
```

Client 端通过 `EventSource` 监听并更新 SolidJS store。

---

## 理解 payloads 联合类型

`BusEvent.payloads()` 返回所有已注册事件的 Zod discriminated union。这用于：

1. **SDK 代码生成**：自动为 SSE 事件生成 TypeScript 类型
2. **运行时校验**：确保 SSE 推送的数据符合 schema

```ts
// 所有事件类型的联合
const EventPayload = BusEvent.payloads()
// 等价于 z.discriminatedUnion("type", [
//   z.object({ type: z.literal("session.created"), ... }),
//   z.object({ type: z.literal("session.updated"), ... }),
//   ...
// ])
```

---

## 关键文件

| 文件                   | 内容                            |
| ---------------------- | ------------------------------- |
| `src/bus/bus-event.ts` | BusEvent.define + 全局 registry |
| `src/bus/index.ts`     | Bus（实例级 pub/sub）           |
| `src/bus/global.ts`    | GlobalBus（跨实例）             |
| `src/server/server.ts` | SSE endpoint 实现               |

---

## 动手验证

1. 搜索 `BusEvent.define(` 看看有多少种事件类型
2. 在 `Bus.publish` 处加断点，追踪事件从发布到 SSE 推送的完整路径
3. 用浏览器的 DevTools 连接 SSE endpoint，观察事件流
