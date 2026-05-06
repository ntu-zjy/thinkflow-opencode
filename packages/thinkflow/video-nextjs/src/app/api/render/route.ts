import { NextRequest } from "next/server"
import { bundle } from "@remotion/bundler"
import { renderMedia, getCompositions, ensureBrowser, RenderInternals } from "@remotion/renderer"
import { spawnSync } from "child_process"
import { resolve, join } from "path"
import { mkdirSync, existsSync, copyFileSync, rmSync, writeFileSync, readdirSync } from "fs"
import { tmpdir } from "os"
import type { VideoSlide, EnrichedSlide } from "@/remotion/types"

// process.cwd() 在 Next.js App Router 中指向项目根目录（video-nextjs/）
const PROJECT_ROOT = process.cwd()                                     // video-nextjs/
const SRC_ROOT = resolve(PROJECT_ROOT, "src")                          // video-nextjs/src/
const GENERATED_DIR = resolve(SRC_ROOT, "remotion/generated")          // src/remotion/generated/
const REMOTION_ENTRY = resolve(SRC_ROOT, "remotion/index.ts")
const PUBLIC_DIR = resolve(PROJECT_ROOT, "public")

interface VideoGenBody {
  videoId: string
  title: string
  slides: VideoSlide[]
}

function getAudioDuration(mp3Path: string): number {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", mp3Path], {
    timeout: 10_000, encoding: "utf-8",
  })
  if (r.status !== 0) return 5
  try {
    return parseFloat((JSON.parse(r.stdout as string) as { format?: { duration?: string } })?.format?.duration ?? "5")
  } catch { return 5 }
}

function encoder(controller: ReadableStreamDefaultController) {
  return (data: Record<string, unknown>) => {
    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
  }
}

// 将 Agent 生成的分镜代码写成合法的 TSX 文件
function writeSlideFile(index: number, slideCode: string, audioFile: string): void {
  mkdirSync(GENERATED_DIR, { recursive: true })

  // Agent 生成的是组件体（return 语句或 JSX），包装成完整组件
  const content = `
import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: ${index}，audioFile: "${audioFile}"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
${slideCode}
}
`.trimStart()

  writeFileSync(resolve(GENERATED_DIR, `slide-${index}.tsx`), content, "utf-8")
}

// 清理 generated 目录
function cleanGenerated(): void {
  try {
    const files = readdirSync(GENERATED_DIR).filter((f: string) => f.startsWith("slide-"))
    for (const f of files) rmSync(resolve(GENERATED_DIR, f))
  } catch { /* 目录不存在时忽略 */ }
}

export async function POST(req: NextRequest) {
  let body: VideoGenBody
  try {
    body = await req.json() as VideoGenBody
  } catch {
    return new Response("invalid json", { status: 400 })
  }

  const { videoId, slides } = body
  const tmpDir = resolve(tmpdir(), `thinkflow-video-${videoId}`)
  mkdirSync(tmpDir, { recursive: true })
  mkdirSync(PUBLIC_DIR, { recursive: true })

  const stream = new ReadableStream({
    async start(controller) {
      const emit = encoder(controller)
      const audioFilenames: string[] = []

      try {
        // ── 1. TTS ───────────────────────────────────────────────────────
        emit({ type: "step", step: "tts", progress: 5, message: "正在生成语音..." })
        const enrichedSlides: EnrichedSlide[] = []

        for (let i = 0; i < slides.length; i++) {
          const slide = slides[i]
          const audioFilename = `${videoId}-audio-${i}.mp3`
          const mp3Path = join(tmpDir, audioFilename)
          const publicMp3 = join(PUBLIC_DIR, audioFilename)

          const ok = spawnSync(
            "edge-tts",
            ["--voice", "zh-CN-XiaoxiaoNeural", "--text", slide.voiceover, "--write-media", mp3Path],
            { timeout: 30_000 },
          ).status === 0

          let duration = 5
          if (ok && existsSync(mp3Path)) {
            duration = getAudioDuration(mp3Path)
            copyFileSync(mp3Path, publicMp3)
            audioFilenames.push(audioFilename)
          }

          enrichedSlides.push({
            ...slide,
            audioFile: ok ? audioFilename : "",
            durationInFrames: Math.ceil((duration + 0.3) * 30),
          })
          emit({
            type: "step", step: "tts",
            progress: Math.round(5 + ((i + 1) / slides.length) * 30),
            message: `语音生成 ${i + 1}/${slides.length}`,
          })
        }

        // ── 2. 写分镜 TSX 文件 ────────────────────────────────────────────
        emit({ type: "step", step: "codegen", progress: 37, message: "写入分镜组件..." })
        cleanGenerated()
        for (let i = 0; i < enrichedSlides.length; i++) {
          const slide = enrichedSlides[i]
          writeSlideFile(i, slide.slideCode || getFallbackSlideCode(slide.voiceover), slide.audioFile)
        }
        emit({ type: "step", step: "codegen", progress: 38, message: `${enrichedSlides.length} 个分镜组件已写入` })

        // ── 3. 确认浏览器可用（优先用系统 Chrome，避免下载 Chromium） ──────
        emit({ type: "step", step: "bundle", progress: 38, message: "检查浏览器..." })
        const SYSTEM_CHROME_PATHS = [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
        ]
        const browserExecutable = SYSTEM_CHROME_PATHS.find(existsSync) ?? null
        if (!browserExecutable) {
          // 没找到系统浏览器才尝试下载（可能被墙）
          await ensureBrowser()
        }

        // ── 4. Bundle ────────────────────────────────────────────────────
        emit({ type: "step", step: "bundle", progress: 40, message: "正在打包渲染器..." })
        const bundlePath = await bundle({
          entryPoint: REMOTION_ENTRY,
          publicDir: PUBLIC_DIR,
        })
        emit({ type: "step", step: "bundle", progress: 50, message: "启动渲染服务器..." })

        const downloadMap = RenderInternals.makeDownloadMap()
        const { port: servePort, close: closeServer } = await RenderInternals.serveStatic(bundlePath, {
          downloadMap,
          offthreadVideoThreads: 0,
          logLevel: "error",
          indent: false,
          offthreadVideoCacheSizeInBytes: null,
          binariesDirectory: null,
        })
        const serveUrl = `http://localhost:${servePort}`
        emit({ type: "step", step: "bundle", progress: 55, message: `渲染器就绪 (port ${servePort})` })

        // ── 5. Render ────────────────────────────────────────────────────
        emit({ type: "step", step: "render", progress: 60, message: "正在渲染视频帧..." })
        const totalFrames = enrichedSlides.reduce((acc, s) => acc + s.durationInFrames, 0)
        const outputPath = join(tmpDir, "output.mp4")

        try {
          const compositions = await getCompositions(serveUrl, {
            inputProps: { slides: enrichedSlides },
            downloadMap,
            ...(browserExecutable ? { browserExecutable } : {}),
          })
          const composition = compositions.find((c) => c.id === "VideoComposition")
          if (!composition) throw new Error("Composition VideoComposition not found")

          await renderMedia({
            composition: { ...composition, durationInFrames: totalFrames },
            serveUrl,
            outputLocation: outputPath,
            codec: "h264",
            inputProps: { slides: enrichedSlides },
            downloadMap,
            ...(browserExecutable ? { browserExecutable } : {}),
            onProgress: ({ renderedFrames }) => {
              const pct = Math.round(60 + (renderedFrames / totalFrames) * 35)
              emit({ type: "step", step: "render", progress: Math.min(pct, 94), message: `渲染帧 ${renderedFrames}/${totalFrames}` })
            },
          })
        } finally {
          await closeServer()
          cleanGenerated()
        }

        emit({ type: "done", progress: 100, message: "视频生成完成！", videoUrl: `/api/video-file/${videoId}` })
      } catch (err) {
        emit({ type: "error", message: String((err as Error)?.message ?? err) })
      } finally {
        for (const f of audioFilenames) {
          try { rmSync(join(PUBLIC_DIR, f)) } catch { /* ignore */ }
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  })
}

// 兜底组件：Agent 没有生成 slideCode 时使用
function getFallbackSlideCode(voiceover: string): string {
  const escaped = voiceover.replace(/`/g, "\\`").replace(/\\/g, "\\\\")
  return `  const opacity = interpolate(frame, [0, Math.min(fps * 0.4, 12)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  const y = interpolate(frame, [0, Math.min(fps * 0.5, 15)], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'PingFang SC','Helvetica Neue',sans-serif" }}>
      <div style={{ color: "white", fontSize: 52, textAlign: "center", padding: "0 80px", opacity, transform: \`translateY(\${y}px)\`, lineHeight: 1.6 }}>
        {\`${escaped}\`}
      </div>
    </AbsoluteFill>
  )`
}
