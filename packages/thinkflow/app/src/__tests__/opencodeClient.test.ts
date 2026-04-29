import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Test OpenCode client in isolation with mocked fetch ──────────────────────

// Polyfill EventSource for jsdom test environment
class MockEventSource {
  onopen: (() => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  close() {}
}

describe("opencodeClient", () => {
  const originalFetch = globalThis.fetch
  const originalEventSource = (globalThis as unknown as { EventSource: unknown }).EventSource

  beforeEach(() => {
    ;(globalThis as unknown as { EventSource: unknown }).EventSource = MockEventSource
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    ;(globalThis as unknown as { EventSource: unknown }).EventSource = originalEventSource
    vi.resetModules()
  })

  it("createSession 成功时返回 session id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "session-abc" }),
    } as Response)

    const { opencodeClient } = await import("../services/opencodeClient")
    const id = await opencodeClient.createSession()
    expect(typeof id).toBe("string")
    expect(id.length).toBeGreaterThan(0)
  })

  it("createSession 失败时进入 mock 模式并返回 mock-session id", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"))
    const { opencodeClient } = await import("../services/opencodeClient")
    const id = await opencodeClient.createSession()
    expect(id).toMatch(/^mock-session-/)
  })

  it("subscribeEvents 返回取消订阅函数", async () => {
    const { opencodeClient } = await import("../services/opencodeClient")
    const unsub = opencodeClient.subscribeEvents({
      onMessagePartUpdated: vi.fn(),
      onSessionStatus: vi.fn(),
    })
    expect(typeof unsub).toBe("function")
    unsub()
  })

  it("abortSession 在 mock 模式下直接返回", async () => {
    const { opencodeClient } = await import("../services/opencodeClient")
    await expect(opencodeClient.abortSession("some-session")).resolves.toBeUndefined()
  })

  it("isMockMode 返回布尔值", async () => {
    const { opencodeClient } = await import("../services/opencodeClient")
    expect(typeof opencodeClient.isMockMode()).toBe("boolean")
  })
})
