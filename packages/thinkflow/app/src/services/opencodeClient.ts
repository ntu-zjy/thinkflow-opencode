import type { OpenCodeEvent } from "../types"

// ─── Base URL ────────────────────────────────────────────────────────────────

export function getBaseUrl(): string {
  const stored =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("thinkflow_server_url")
      : null
  return stored ?? "http://localhost:4096"
}

// ─── Session API ─────────────────────────────────────────────────────────────

// vite.config.ts 通过 define 注入构建时路径，避免硬编码开发机绝对路径
const OPENCODE_WORKDIR = (import.meta.env.VITE_OPENCODE_WORKDIR as string | undefined) ?? ""

export async function createSession(): Promise<string> {
  const url = new URL(`${getBaseUrl()}/session`)
  url.searchParams.set("directory", OPENCODE_WORKDIR)
  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })
  if (!resp.ok) throw new Error(`createSession failed: ${resp.status}`)
  const data = await resp.json()
  return data.id as string
}

export interface PromptPart {
  type: "text"
  text: string
}

export async function sendPrompt(
  sessionId: string,
  parts: PromptPart[],
  model: string = "moonshotai/kimi-k2.6",
): Promise<void> {
  const providerID = "openrouter"
  const modelID = model

  const url = new URL(`${getBaseUrl()}/session/${sessionId}/message`)
  url.searchParams.set("directory", OPENCODE_WORKDIR)

  const resp = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      parts,
      model: { providerID, modelID },
    }),
  })
  if (!resp.ok) throw new Error(`sendPrompt failed: ${resp.status}`)
}

export async function abortSession(sessionId: string): Promise<void> {
  await fetch(`${getBaseUrl()}/session/${sessionId}/abort`, {
    method: "POST",
  }).catch(() => {})
}

// ─── SSE 事件订阅 ─────────────────────────────────────────────────────────────

export function subscribeEvents(
  onEvent: (event: OpenCodeEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const es = new EventSource(`${getBaseUrl()}/global/event`)

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data) as OpenCodeEvent
      onEvent(data)
    } catch {
      // ignore malformed events
    }
  }

  es.onerror = (e) => {
    onError?.(e)
  }

  return () => es.close()
}

// ─── Mock 模式（OpenCode 不可用时） ───────────────────────────────────────────

export async function isServerAvailable(): Promise<boolean> {
  return fetch(`${getBaseUrl()}/global/health`, { signal: AbortSignal.timeout(2000) })
    .then((r) => r.ok)
    .catch(() => false)
}

const MOCK_RESPONSES: Record<string, string> = {
  zhihu: `# 示例知乎文章\n\n这是一篇由 ThinkFlow 生成的示例文章。\n\n## 引言\n\n内容创作从未如此高效...\n\n## 正文\n\n通过 ThinkFlow 的 Agent 节点，您可以将多种输入来源整合，一键生成适配各平台的内容。`,
  wechat: `**ThinkFlow 思流**\n\n> 可记忆的内容创作助手\n\n点击阅读，了解如何用 AI 重新定义内容创作流程。\n\n---\n\n内容自动生成中...`,
  diary: `2026年4月29日\n\n今天使用 ThinkFlow 完成了内容创作，感觉非常顺畅。AI 帮我整理了思路，还记住了我的写作风格。`,
}

export async function runMockWorkflow(
  platform: string,
  idea: string,
  onChunk: (text: string) => void,
  onDone: () => void,
): Promise<void> {
  const base = MOCK_RESPONSES[platform] ?? MOCK_RESPONSES.diary
  const full = idea ? `**主题**：${idea}\n\n${base}` : base

  // 分块发送，每块 8 字符（适合真实 UI 效果；在测试中也能同步完成）
  const chunks = full.match(/.{1,8}/gs) ?? [full]
  for (const chunk of chunks) {
    onChunk(chunk)
    await new Promise<void>((r) => setTimeout(r, 0))
  }
  onDone()
}

