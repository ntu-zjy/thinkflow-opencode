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

// ─── 图片生成 ─────────────────────────────────────────────────────────────────
// 主路径：OpenRouter（chat/completions，图片在 choices[0].message.images[0].image_url.url）
// Fallback：硅基流动 FLUX（/v1/images/generations，OpenAI 兼容，国内直连）

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

async function generateImageViaSiliconflow(prompt: string): Promise<string> {
  const resp = await fetch("/api/siliconflow/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "Tongyi-MAI/Z-Image-Turbo",
      prompt,
      image_size: "1024x1024",
      n: 1,
    }),
  })
  const text = await resp.text()
  let data: { data?: Array<{ url?: string }>; error?: { message: string } }
  try { data = JSON.parse(text) } catch { throw new Error(`Siliconflow response not JSON: ${text.slice(0, 100)}`) }
  if (data.error) throw new Error(`Siliconflow error: ${data.error.message}`)
  const url = data.data?.[0]?.url
  if (url) return url
  throw new Error("Siliconflow: no image url in response")
}

export async function generateImage(
  prompt: string,
  model: string = "openai/gpt-5.4-image-2",
): Promise<string> {
  // 第一优先：OpenRouter 指定模型（VPN 环境下可用）
  const r1 = await generateImageViaOpenRouter(prompt, model).catch((e: Error) => e)
  if (typeof r1 === "string") return r1

  // 第二优先：OpenRouter seedream-4.5（字节跳动，国内可直连）
  const r2 = await generateImageViaOpenRouter(prompt, "bytedance-seed/seedream-4.5").catch((e: Error) => e)
  if (typeof r2 === "string") return r2

  // 第三保底：硅基流动（需配置 siliconflow key）
  console.warn(`[ThinkFlow] OpenRouter 图片生成失败，尝试硅基流动...`)
  return generateImageViaSiliconflow(prompt)
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

export async function runMockWorkflow(
  platform: string,
  idea: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onImage?: (url: string) => void,
): Promise<void> {
  if (platform === "xiaohongshu" && onImage) {
    const label = encodeURIComponent(idea || "生成中...")
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23ff2b54" opacity="0.12" rx="12"/><text x="50%" y="42%" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23ff2b54" text-anchor="middle">小红书图片（Mock）</text><text x="50%" y="58%" font-family="sans-serif" font-size="13" fill="%23888" text-anchor="middle">${label}</text></svg>`
    const dataUri = `data:image/svg+xml;charset=utf-8,${svg}`
    await new Promise<void>((r) => setTimeout(r, 800))
    onImage(dataUri)
    const caption = idea ? `**${idea}**\n\n#好物推荐 #AI工具 #效率神器` : `#好物推荐 #AI工具 #效率神器`
    const chunks = caption.match(/.{1,8}/gs) ?? [caption]
    for (const chunk of chunks) {
      onChunk(chunk)
      await new Promise<void>((r) => setTimeout(r, 0))
    }
    onDone()
    return
  }

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

