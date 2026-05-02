import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import "./setup"
import { MockEventSource } from "./setup"
import {
  createSession,
  subscribeEvents,
  runMockWorkflow,
  convertFileToMarkdown,
} from "../services/opencodeClient"

// jsdom 环境下 sessionStorage polyfill（bun test 无 jsdom 时 sessionStorage 可能不存在）
const safeSessionStorage = {
  getItem: (k: string) => (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(k) : null),
  setItem: (k: string, v: string) => (typeof sessionStorage !== "undefined" ? sessionStorage.setItem(k, v) : undefined),
  removeItem: (k: string) => (typeof sessionStorage !== "undefined" ? sessionStorage.removeItem(k) : undefined),
}

describe("opencodeClient — createSession", () => {
  beforeEach(() => {
    safeSessionStorage.removeItem("thinkflow_server_url")
  })

  it("POST /session 成功返回 sessionId", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "session-abc123" }),
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch as unknown as typeof fetch
    const id = await createSession()
    expect(id).toBe("session-abc123")
    globalThis.fetch = origFetch
  })

  it("HTTP 错误时抛出异常", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch as unknown as typeof fetch
    await expect(createSession()).rejects.toThrow("createSession failed: 500")
    globalThis.fetch = origFetch
  })
})

describe("opencodeClient — subscribeEvents", () => {
  beforeEach(() => {
    MockEventSource.instances.length = 0
    safeSessionStorage.removeItem("thinkflow_server_url")
  })

  it("创建 EventSource 并接收事件", () => {
    const received: unknown[] = []
    const unsubscribe = subscribeEvents((e) => received.push(e))

    const es = MockEventSource.instances[MockEventSource.instances.length - 1]
    expect(es).toBeDefined()
    expect(es.url).toContain("/global/event")

    const mockEvent = {
      directory: "/",
      payload: { type: "session.idle", properties: { sessionID: "s1" } },
    }
    es.dispatchMessage(mockEvent)

    expect(received).toHaveLength(1)
    expect((received[0] as { payload: { type: string } }).payload.type).toBe("session.idle")

    unsubscribe()
    expect(es.readyState).toBe(2) // 已关闭
  })

  it("调用 unsubscribe 后 EventSource 被关闭", () => {
    const unsubscribe = subscribeEvents(() => {})
    const es = MockEventSource.instances[MockEventSource.instances.length - 1]
    unsubscribe()
    expect(es.readyState).toBe(2)
  })
})

describe("opencodeClient — convertFileToMarkdown", () => {
  const origFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = origFetch
  })

  it("成功时返回 markdown 字符串", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ markdown: "# Hello\n\n这是转换后的内容" }),
    }) as unknown as typeof fetch
    const file = new File(["dummy pdf content"], "test.pdf", { type: "application/pdf" })
    const result = await convertFileToMarkdown(file)
    expect(result).toBe("# Hello\n\n这是转换后的内容")
  })

  it("服务器返回 503 时抛出异常（uvx 不可用）", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    }) as unknown as typeof fetch
    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" })
    await expect(convertFileToMarkdown(file)).rejects.toThrow("markitdown failed: 503")
  })

  it("响应无 markdown 字段时抛出异常", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "conversion failed" }),
    }) as unknown as typeof fetch
    const file = new File(["dummy"], "test.pdf", { type: "application/pdf" })
    await expect(convertFileToMarkdown(file)).rejects.toThrow("conversion failed")
  })
})

describe("opencodeClient — runMockWorkflow", () => {
  it("完整执行 mock 流式输出（有 idea）", async () => {
    const chunks: string[] = []
    await runMockWorkflow("zhihu", "测试想法", (c) => chunks.push(c), () => {})
    expect(chunks.length).toBeGreaterThan(0)
    const full = chunks.join("")
    // idea 会被加入到输出的开头
    expect(full.length).toBeGreaterThan(0)
  })

  it("不传 idea 时仍能正常运行并输出内容", async () => {
    const chunks: string[] = []
    await runMockWorkflow("diary", "", (c) => chunks.push(c), () => {})
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.join("").length).toBeGreaterThan(10)
  })

  it("onDone 回调在完成后被调用", async () => {
    let doneCalled = false
    await runMockWorkflow("wechat", "", () => {}, () => { doneCalled = true })
    expect(doneCalled).toBe(true)
  })
})
