import "@testing-library/jest-dom"

// ─── MockEventSource polyfill（jsdom 不提供 EventSource）─────────────────────

class MockEventSource {
  static instances: MockEventSource[] = []

  url: string
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  readyState: number = 1

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  close() {
    this.readyState = 2
  }

  // 测试辅助：向订阅者推送事件
  dispatchMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }))
  }

  dispatchError() {
    this.onerror?.(new Event("error"))
  }
}

// 挂载到全局
Object.defineProperty(globalThis, "EventSource", {
  writable: true,
  value: MockEventSource,
})

export { MockEventSource }
