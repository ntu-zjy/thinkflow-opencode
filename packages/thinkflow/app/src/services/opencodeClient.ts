import type { OpenCodeEvent } from "../types"

// ─── Base URL ────────────────────────────────────────────────────────────────

export function getBaseUrl(): string {
  // 优先级：Tauri sidecar 写入的地址 > 构建时注入的云端地址 > 本地默认
  const stored =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("thinkflow_server_url")
      : null
  if (stored) return stored
  const buildTimeUrl = import.meta.env.VITE_OPENCODE_SERVER_URL as string | undefined
  const raw = buildTimeUrl || "http://localhost:4096"
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
  model: string = "anthropic/claude-sonnet-4.6",
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
// OpenRouter（chat/completions + modalities:["image","text"]，图片在 choices[0].message.images[0].image_url.url）
// 固定使用 openai/gpt-5.4-image-2

async function generateImageViaOpenRouter(prompt: string, model: string): Promise<string> {
  const resp = await fetch("/api/openrouter/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  })
  const text = await resp.text()
  let data: { choices?: Array<{ message: { content?: string; images?: Array<{ image_url: { url: string } }> } }>; error?: { message: string; code?: number } }
  try { data = JSON.parse(text) } catch { throw new Error(`OpenRouter HTTP ${resp.status}, response not JSON: ${text.slice(0, 200)}`) }
  if (data.error) throw new Error(`openrouter:${data.error.code ?? 0}:${data.error.message}`)
  const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
  if (url) return url
  throw new Error("OpenRouter: no image in response")
}

export async function generateImage(
  prompt: string,
  model: string = "openai/gpt-5.4-image-2",
): Promise<string> {
  return generateImageViaOpenRouter(prompt, model)
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
  diary: `2026年5月4日\n\n今天用 ThinkFlow 搞了不少内容，感觉挺爽的，之前每次写东西都要重新想提示词，现在一套工作流直接跑，省了好多时间。晚上还顺手记了几条灵感进记忆库，以后用得上。`,
  note: `# 笔记：ThinkFlow 使用总结\n\n## 核心概念\n- **输入节点**：支持文本、链接、文件、记忆、信息流五种类型\n- **Agent 节点**：基于 OpenCode 内核，统一 build 模式\n- **输出节点**：适配知乎、公众号、日记、笔记、小红书五个平台\n\n## 关键流程\n1. 右键画布添加节点\n2. 输入 → Agent → 输出，连线完成\n3. 点击运行或使用 ⌘↵ 快捷键\n\n## 注意事项\n- 记忆库可存储人设、灵感、素材等，重复使用上下文\n- 矩阵模式支持一次运行多个人设`,
  xiaohongshu: `__IMAGE_MOCK__`,
  video: JSON.stringify({
    title: "AI 内容创作新时代（视频脚本预览）",
    description: "6 个分镜，约 30 秒，竖版 1080×1920。点击「生成视频」让 Agent 创作完整视频。",
    slides: [
      {
        voiceover: "AI 正在重写内容创作的规则，你准备好了吗？",
        slideCode: "  const scale = interpolate(frame, [0, fps * 0.5], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.34, 1.56, 0.64, 1) })\n  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  return (\n    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: \"'PingFang SC','Helvetica Neue',sans-serif\" }}>\n      <div style={{ color: 'white', fontSize: 140, fontWeight: 900, opacity, transform: `scale(${scale})`, letterSpacing: '-2px', textShadow: '0 8px 48px rgba(0,0,0,0.6)' }}>时代变了</div>\n      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 36, marginTop: 40, opacity, letterSpacing: '4px' }}>AI · 内容 · 创作</div>\n    </AbsoluteFill>\n  )",
      },
      {
        voiceover: "把你的想法输入，Agent 自动整合所有上下文",
        slideCode: "  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  const titleY = interpolate(frame, [0, fps * 0.5], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })\n  return (\n    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0d2137, #1565c0, #4fc3f7)', fontFamily: \"'PingFang SC',sans-serif\", overflow: 'hidden' }}>\n      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox='0 0 1080 1920'>\n        <circle cx='10%' cy='12%' r='200' fill='white' opacity={0.06 * fadeIn} />\n        <circle cx='90%' cy='8%' r='150' fill='white' opacity={0.08 * fadeIn} />\n        <circle cx='50%' cy='50%' r='400' fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth='2' opacity={fadeIn} />\n      </svg>\n      <div style={{ position: 'absolute', top: '28%', left: 0, right: 0, padding: '0 88px', opacity: fadeIn, transform: `translateY(${titleY}px)` }}>\n        <div style={{ color: 'white', fontSize: 80, fontWeight: 900, lineHeight: 1.2, textShadow: '0 4px 32px rgba(0,0,0,0.4)' }}>一键多平台</div>\n        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 2, marginTop: 24 }} />\n      </div>\n      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 0 120px 0', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)', opacity: fadeIn }}>\n        <div style={{ padding: '0 80px', color: 'white', fontSize: 46, lineHeight: 1.7 }}>知乎、公众号、小红书\\n一次输入，全平台同步</div>\n      </div>\n    </AbsoluteFill>\n  )",
      },
      {
        voiceover: "把你的风格存进记忆库，AI 越用越懂你",
        slideCode: "  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  const y = interpolate(frame, [0, fps * 0.5], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })\n  return (\n    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #004d2e, #00b09b)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 110px', fontFamily: \"'PingFang SC',sans-serif\" }}>\n      <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 280, fontWeight: 900, lineHeight: 0.5, alignSelf: 'flex-start', fontFamily: \"Georgia,'Times New Roman',serif\", opacity }}>\"</div>\n      <div style={{ color: 'white', fontSize: 58, lineHeight: 1.7, fontStyle: 'italic', textAlign: 'center', textShadow: '0 2px 16px rgba(0,0,0,0.5)', marginTop: -90, opacity, transform: `translateY(${y}px)` }}>记忆沉淀，AI 越用越懂你</div>\n      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 30, letterSpacing: '3px', alignSelf: 'flex-end', marginTop: 40, opacity }}>— ThinkFlow 记忆库</div>\n    </AbsoluteFill>\n  )",
      },
      {
        voiceover: "一个 Agent，多个账号人设，差异化内容并发生成",
        slideCode: "  const flicker = 0.85 + 0.15 * Math.sin(frame * 0.4)\n  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  return (\n    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0d0221, #1a0533, #0d0221)', fontFamily: \"'PingFang SC',sans-serif\", overflow: 'hidden' }}>\n      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.015) 3px, rgba(255,255,255,0.015) 4px)' }} />\n      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 * fadeIn }} viewBox='0 0 1080 1920'>\n        {[300, 600, 900, 1200, 1500].map((y, i) => <line key={i} x1='0' y1={y} x2='1080' y2={y} stroke='#a855f7' strokeWidth='0.5' />)}\n        {[270, 540, 810].map((x, i) => <line key={i} x1={x} y1='0' x2={x} y2='1920' stroke='#a855f7' strokeWidth='0.5' />)}\n        <circle cx='540' cy='960' r='420' stroke='#a855f7' strokeWidth='1.5' fill='none' opacity={0.3} />\n      </svg>\n      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 48, opacity: fadeIn }}>\n        <div style={{ fontSize: 100, lineHeight: 1, filter: 'drop-shadow(0 0 20px #a855f7)' }}>⚡</div>\n        <div style={{ color: 'white', fontSize: 96, fontWeight: 900, textAlign: 'center', textShadow: `0 0 20px rgba(168,85,247,${flicker}), 0 0 60px rgba(168,85,247,0.5)`, letterSpacing: '4px' }}>矩阵运营</div>\n        <div style={{ color: `rgba(168,85,247,${0.75 + 0.15 * Math.sin(frame * 0.3)})`, fontSize: 38, letterSpacing: '2px', textAlign: 'center', textShadow: '0 0 12px rgba(168,85,247,0.6)' }}>多账号 · 并发生成 · 差异化</div>\n      </div>\n    </AbsoluteFill>\n  )",
      },
      {
        voiceover: "三步上手：添加输入，连接 Agent，创建输出",
        slideCode: "  const fadeIn = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  const titleY = interpolate(frame, [0, fps * 0.45], [-40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })\n  const steps = ['① 添加输入节点', '② 连接 Agent', '③ 创建输出节点']\n  return (\n    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #4a1942, #c74b50)', fontFamily: \"'PingFang SC',sans-serif\" }}>\n      <div style={{ position: 'absolute', top: 160, left: 88, right: 88, opacity: fadeIn, transform: `translateY(${titleY}px)` }}>\n        <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.7)', borderRadius: 2, marginBottom: 24 }} />\n        <div style={{ color: 'white', fontSize: 76, fontWeight: 900 }}>三步上手</div>\n      </div>\n      <div style={{ position: 'absolute', top: '43%', left: 88, right: 88, display: 'flex', flexDirection: 'column', gap: 36 }}>\n        {steps.map((step, i) => {\n          const delay = fps * (0.1 + i * 0.12)\n          const itemOpacity = interpolate(frame, [delay, delay + fps * 0.35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n          const itemY = interpolate(frame, [delay, delay + fps * 0.4], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })\n          return (\n            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22, opacity: itemOpacity, transform: `translateY(${itemY}px)` }}>\n              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>\n                <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{i + 1}</span>\n              </div>\n              <div style={{ color: 'white', fontSize: 48, lineHeight: 1.5, fontWeight: 400 }}>{step.slice(2)}</div>\n            </div>\n          )\n        })}\n      </div>\n    </AbsoluteFill>\n  )",
      },
      {
        voiceover: "ThinkFlow，让你的创意以光速变成内容",
        slideCode: "  const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  const lineW = interpolate(frame, [0, fps * 0.6], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })\n  const titleY = interpolate(frame, [0, fps * 0.55], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })\n  return (\n    <AbsoluteFill style={{ background: '#f8f7f4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px', gap: 48, fontFamily: \"'PingFang SC',sans-serif\" }}>\n      <div style={{ fontSize: 110, lineHeight: 1, opacity: fadeIn }}>✨</div>\n      <div style={{ width: `${lineW}px`, height: 2, background: '#1a1a1a', borderRadius: 1 }} />\n      <div style={{ color: '#1a1a1a', fontSize: 100, fontWeight: 900, lineHeight: 1.15, textAlign: 'center', letterSpacing: '-1px', opacity: fadeIn, transform: `translateY(${titleY}px)` }}>现在就试</div>\n      <div style={{ width: `${lineW * 0.6}px`, height: 1, background: '#888', borderRadius: 1, opacity: fadeIn * 0.6 }} />\n      <div style={{ color: '#555', fontSize: 42, lineHeight: 1.7, textAlign: 'center', opacity: interpolate(frame, [fps * 0.15, fps * 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>ThinkFlow 思流</div>\n    </AbsoluteFill>\n  )",
      },
    ],
  }),
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

