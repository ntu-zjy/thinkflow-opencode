// Prefer the server URL injected by Tauri desktop shell at runtime,
// fall back to the default dev port when running in browser.
function getBaseUrl(): string {
  return (
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("thinkflow_server_url")) ||
    "http://localhost:4096"
  )
}

export type EventCallbacks = {
  onMessagePartUpdated?: (sessionId: string, text: string, delta?: string) => void
  onSessionStatus?: (sessionId: string, status: "idle" | "busy") => void
  onSessionError?: (sessionId: string, error: string) => void
}

// ── Mock mode ────────────────────────────────────────────────────────────────

let mockMode = false

function setMockMode(val: boolean) {
  mockMode = val
}

function isMockMode(): boolean {
  return mockMode
}

// ── SSE subscription ─────────────────────────────────────────────────────────

let globalCallbacks: EventCallbacks = {}
let eventSource: EventSource | null = null
let eventSourceConnected = false

function ensureEventSource() {
  if (eventSource) return
  const es = new EventSource(`${getBaseUrl()}/event`)
  eventSource = es

  es.onopen = () => {
    eventSourceConnected = true
    setMockMode(false)
  }

  es.onerror = () => {
    if (!eventSourceConnected) {
      setMockMode(true)
    }
    es.close()
    eventSource = null
    if (!mockMode) {
      setTimeout(ensureEventSource, 5000)
    }
  }

  es.onmessage = (ev) => {
    let parsed: { type: string; properties?: Record<string, unknown> }
    try {
      parsed = JSON.parse(ev.data)
    } catch {
      return
    }

    const { type, properties = {} } = parsed

    if (type === "message.part.updated") {
      const part = properties.part as Record<string, unknown> | undefined
      const sessionId = (properties.sessionID ?? properties.sessionId ?? "") as string
      if (part && part.type === "text") {
        const delta = (part.delta ?? "") as string
        const text = (part.text ?? delta) as string
        globalCallbacks.onMessagePartUpdated?.(sessionId, text, delta)
      }
    } else if (type === "session.status") {
      const sessionId = (properties.sessionID ?? properties.sessionId ?? "") as string
      const status = (properties.status ?? "idle") as "idle" | "busy"
      globalCallbacks.onSessionStatus?.(sessionId, status)
    } else if (type === "session.error") {
      const sessionId = (properties.sessionID ?? properties.sessionId ?? "") as string
      const error = (properties.error ?? "unknown error") as string
      globalCallbacks.onSessionError?.(sessionId, error)
    }
  }
}

// ── Mock streaming helper ────────────────────────────────────────────────────

function runMockStream(sessionId: string) {
  const segments = [
    "正在分析您的输入...\n\n",
    "根据您提供的内容，",
    "我为您生成以下创作：\n\n",
    "**ThinkFlow 智能创作**\n\n这是一段由 AI 生成的示例内容，",
    "展示了 ThinkFlow 的流式输出能力。请连接 OpenCode 服务以获取真实 AI 响应。",
  ]
  let accumulated = ""
  segments.forEach((seg, i) => {
    setTimeout(() => {
      accumulated += seg
      globalCallbacks.onMessagePartUpdated?.(sessionId, accumulated, seg)
      if (i === segments.length - 1) {
        setTimeout(() => {
          globalCallbacks.onSessionStatus?.(sessionId, "idle")
        }, 200)
      }
    }, i * 100)
  })
}

// ── API ──────────────────────────────────────────────────────────────────────

async function createSession(directory?: string): Promise<string> {
  if (mockMode) {
    return `mock-session-${Date.now()}`
  }
  const res = await fetch(`${getBaseUrl()}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(directory ? { directory } : {}),
  }).catch(() => null)

  if (!res || !res.ok) {
    setMockMode(true)
    return `mock-session-${Date.now()}`
  }

  const data = await res.json().catch(() => null)
  if (!data?.id) {
    setMockMode(true)
    return `mock-session-${Date.now()}`
  }
  return data.id as string
}

async function sendPrompt(sessionId: string, prompt: string): Promise<void> {
  if (mockMode) {
    runMockStream(sessionId)
    return
  }

  const res = await fetch(`${getBaseUrl()}/session/${sessionId}/prompt/async`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parts: [{ type: "text", text: prompt }],
      agent: "build",
    }),
  }).catch(() => null)

  if (!res || !res.ok) {
    setMockMode(true)
    runMockStream(sessionId)
  }
}

function subscribeEvents(callbacks: EventCallbacks): () => void {
  globalCallbacks = { ...globalCallbacks, ...callbacks }

  if (!mockMode) {
    ensureEventSource()
  }

  return () => {
    if (callbacks.onMessagePartUpdated) globalCallbacks.onMessagePartUpdated = undefined
    if (callbacks.onSessionStatus) globalCallbacks.onSessionStatus = undefined
    if (callbacks.onSessionError) globalCallbacks.onSessionError = undefined
  }
}

async function abortSession(sessionId: string): Promise<void> {
  if (mockMode) return
  await fetch(`${getBaseUrl()}/session/${sessionId}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).catch(() => null)
}

export const opencodeClient = {
  createSession,
  sendPrompt,
  subscribeEvents,
  abortSession,
  isMockMode,
}
