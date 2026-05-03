import type { OpenCodeEvent } from "../types"

// ─── Base URL ────────────────────────────────────────────────────────────────

export function getBaseUrl(): string {
  // 优先级：Tauri sidecar 写入的地址 > 构建时注入的云端地址 > 本地默认
  const stored =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("thinkflow_server_url")
      : null
  const buildTimeUrl = import.meta.env.VITE_OPENCODE_SERVER_URL as string | undefined
  const raw = stored || buildTimeUrl || "http://localhost:4096"
  // 确保 URL 有协议前缀（防止 Vercel 环境变量漏写 https://）
  if (raw && !raw.startsWith("http://") && !raw.startsWith("https://")) {
    return `https://${raw}`
  }
  return raw
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

// ─── 图片生成 ─────────────────────────────────────────────────────────────────
// OpenRouter（chat/completions，图片在 choices[0].message.images[0].image_url.url）
// 优先级：指定模型 → seedream-4.5（字节跳动，国内可直连）→ SVG 占位图

async function generateImageViaOpenRouter(prompt: string, model: string): Promise<string> {
  const resp = await fetch("/api/openrouter/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const text = await resp.text()
  let data: { choices?: Array<{ message: { images?: Array<{ image_url: { url: string } }> } }>; error?: { message: string; code?: number } }
  try { data = JSON.parse(text) } catch { throw new Error(`OpenRouter response not JSON: ${text.slice(0, 100)}`) }
  if (data.error) throw new Error(`openrouter:${data.error.code ?? 0}:${data.error.message}`)
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (url) return url
  throw new Error("OpenRouter: no image in response")
}

export async function generateImage(
  prompt: string,
  model: string = "openai/gpt-5.4-image-2",
): Promise<string> {
  // 第一优先：OpenRouter 指定模型
  const r1 = await generateImageViaOpenRouter(prompt, model).catch((e: Error) => e)
  if (typeof r1 === "string") return r1

  // 第二优先：OpenRouter seedream-4.5（字节跳动，国内可直连）
  const r2 = await generateImageViaOpenRouter(prompt, "bytedance-seed/seedream-4.5").catch((e: Error) => e)
  if (typeof r2 === "string") return r2

  throw new Error("Image generation failed: all OpenRouter models unavailable")
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
  xiaohongshu: `__IMAGE_MOCK__`,
}

function buildMockContent(platform: string, idea: string, persona: string): string {
  const personaBlock = persona ? `\n\n（以「${persona.slice(0, 20)}」人设创作）` : ""
  const base = MOCK_RESPONSES[platform] ?? MOCK_RESPONSES.diary
  const withIdea = idea ? `**主题**：${idea}\n\n${base}` : base
  return withIdea + personaBlock
}

// ─── markitdown 文件转 Markdown ───────────────────────────────────────────────

export async function convertFileToMarkdown(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/convert-to-markdown", { method: "POST", body: formData })
  if (!res.ok) throw new Error(`markitdown failed: ${res.status}`)
  const data = await res.json() as { markdown?: string; error?: string }
  if (!data.markdown) throw new Error(data.error ?? "empty response")
  return data.markdown
}

export async function runMockWorkflow(
  platform: string,
  idea: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onImage?: (url: string) => void,
  persona?: string,
): Promise<void> {
  const personaText = persona ?? ""
  if (platform === "xiaohongshu" && onImage) {
    const label = encodeURIComponent(idea || "生成中...")
    const personaLabel = personaText ? encodeURIComponent(`人设: ${personaText.slice(0, 15)}`) : ""
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23ff2b54" opacity="0.12" rx="12"/><text x="50%" y="36%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23ff2b54" text-anchor="middle">小红书图片（Mock）</text><text x="50%" y="52%" font-family="sans-serif" font-size="13" fill="%23888" text-anchor="middle">${label}</text>${personaLabel ? `<text x="50%" y="68%" font-family="sans-serif" font-size="11" fill="%23f59e0b" text-anchor="middle">${personaLabel}</text>` : ""}</svg>`
    const dataUri = `data:image/svg+xml;charset=utf-8,${svg}`
    await new Promise<void>((r) => setTimeout(r, 800))
    onImage(dataUri)
    const personaSuffix = personaText ? `\n\n（${personaText.slice(0, 15)} 风格）` : ""
    const caption = (idea ? `**${idea}**\n\n` : "") + `#好物推荐 #AI工具 #效率神器${personaSuffix}`
    const chunks = caption.match(/.{1,8}/gs) ?? [caption]
    for (const chunk of chunks) {
      onChunk(chunk)
      await new Promise<void>((r) => setTimeout(r, 0))
    }
    onDone()
    return
  }

  const full = buildMockContent(platform, idea, personaText)

  // 分块发送，每块 8 字符（适合真实 UI 效果；在测试中也能同步完成）
  const chunks = full.match(/.{1,8}/gs) ?? [full]
  for (const chunk of chunks) {
    onChunk(chunk)
    await new Promise<void>((r) => setTimeout(r, 0))
  }
  onDone()
}

