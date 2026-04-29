import { useAppStore } from "@/store/appStore"

interface SessionCreate {
  title?: string
}

interface SessionInfo {
  id: string
  title: string
  projectID: string
  directory: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  parts?: { type: string; text?: string }[]
}

function baseUrl() {
  return useAppStore.getState().opencodeUrl
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${baseUrl()}${path}`
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`OpenCode API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const OpencodeClient = {
  async createSession(data?: SessionCreate): Promise<SessionInfo> {
    return request<SessionInfo>("/session", {
      method: "POST",
      body: JSON.stringify(data ?? {}),
    })
  },

  async deleteSession(sessionId: string): Promise<void> {
    await request<void>(`/session/${sessionId}`, { method: "DELETE" })
  },

  async chat(
    sessionId: string,
    content: string,
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: string) => void,
  ): Promise<void> {
    const url = `${baseUrl()}/session/${sessionId}/message`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({
        parts: [{ type: "text", text: content }],
        providerID: "openrouter",
        modelID: "moonshotai/kimi-k2:free",
      }),
    })

    if (!res.ok || !res.body) {
      onError(`HTTP ${res.status}`)
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) { onDone(); break }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        const json = line.slice(6).trim()
        if (!json || json === "[DONE]") { onDone(); return }
        const evt = JSON.parse(json).catch?.(() => null)
        if (!evt) continue
        // Parse OpenCode SSE events
        if (evt.type === "text-delta" || evt.type === "message.content.delta") {
          const delta = evt.textDelta ?? evt.delta?.text ?? ""
          if (delta) onChunk(delta)
        }
        if (evt.type === "message.stop" || evt.type === "finish") {
          onDone()
          return
        }
      }
    }
  },

  async check(): Promise<boolean> {
    return fetch(`${baseUrl()}/app`)
      .then((r) => r.ok)
      .catch(() => false)
  },
}
