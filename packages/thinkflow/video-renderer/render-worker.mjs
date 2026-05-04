/**
 * Remotion 渲染 Worker
 * - 音频放到 public/ 目录，staticFile() 正确引用
 * - 通过 stdout 输出 JSON 进度行
 * 用法：node render-worker.mjs <configJson>
 */
import { bundle } from "@remotion/bundler"
import { renderMedia, getCompositions, ensureBrowser, RenderInternals } from "@remotion/renderer"
import { spawnSync } from "child_process"
import { resolve, join } from "path"
import { mkdirSync, existsSync, copyFileSync, rmSync } from "fs"
import { fileURLToPath } from "url"

const __dir = fileURLToPath(new URL(".", import.meta.url))
const PUBLIC_DIR = resolve(__dir, "public")

// 忽略 SIGTERM/SIGINT，让渲染完成后自然退出
process.on("SIGTERM", () => { /* ignore */ })
process.on("SIGINT", () => { /* ignore */ })

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n")
}

function getAudioDuration(mp3Path) {
  const r = spawnSync("ffprobe", ["-v", "quiet", "-print_format", "json", "-show_format", mp3Path], {
    timeout: 10_000, encoding: "utf-8",
  })
  if (r.status !== 0) return 5
  try { return parseFloat(JSON.parse(r.stdout)?.format?.duration ?? "5") } catch { return 5 }
}

async function main() {
  const config = JSON.parse(process.argv[2] ?? "{}")
  const { videoId, tmpDir, slides } = config

  mkdirSync(tmpDir, { recursive: true })
  // 确保 public/ 目录存在（存放本次音频文件）
  mkdirSync(PUBLIC_DIR, { recursive: true })

  // 本次用到的音频文件名（用 videoId 做前缀避免并发冲突）
  const audioFilenames = []

  try {
    // ── TTS ──────────────────────────────────────────────────────────────
    emit({ type: "step", step: "tts", progress: 5, message: "正在生成语音..." })
    const enrichedSlides = []

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i]
      const audioFilename = `${videoId}-audio-${i}.mp3`
      const mp3Path = join(tmpDir, audioFilename)
      const publicMp3Path = join(PUBLIC_DIR, audioFilename)

      const ok = spawnSync(
        "edge-tts",
        ["--voice", "zh-CN-XiaoxiaoNeural", "--text", slide.voiceover, "--write-media", mp3Path],
        { timeout: 30_000 },
      ).status === 0

      let duration = 5
      if (ok && existsSync(mp3Path)) {
        duration = getAudioDuration(mp3Path)
        // 复制到 public/ 让 staticFile() 能访问到
        copyFileSync(mp3Path, publicMp3Path)
        audioFilenames.push(audioFilename)
      }

      enrichedSlides.push({
        ...slide,
        audioFile: ok ? audioFilename : "",
        durationInFrames: Math.ceil((duration + 0.3) * 30),
      })
      emit({ type: "step", step: "tts", progress: Math.round(5 + ((i + 1) / slides.length) * 30), message: `语音生成 ${i + 1}/${slides.length}` })
    }

    // ── 确保 Chromium 已就绪 ─────────────────────────────────────────────
    emit({ type: "step", step: "bundle", progress: 38, message: "检查 Chromium..." })
    await ensureBrowser()

    // ── Bundle（publicDir 指向 public/ 目录）────────────────────────────
    emit({ type: "step", step: "bundle", progress: 40, message: "正在打包渲染器..." })
    const bundlePath = await bundle({
      entryPoint: resolve(__dir, "src/index.ts"),
      publicDir: PUBLIC_DIR,
    })
    emit({ type: "step", step: "bundle", progress: 50, message: "正在启动渲染服务器..." })

    // serveStatic 把 bundle 目录转成 http://localhost:PORT
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

    // ── Render ────────────────────────────────────────────────────────────
    emit({ type: "step", step: "render", progress: 60, message: "正在渲染视频帧..." })
    const totalFrames = enrichedSlides.reduce((acc, s) => acc + s.durationInFrames, 0)
    const outputPath = join(tmpDir, "output.mp4")

    try {
      const compositions = await getCompositions(serveUrl, {
        inputProps: { slides: enrichedSlides },
        downloadMap,
      })
      const composition = compositions.find((c) => c.id === "VideoSlide")
      if (!composition) throw new Error("Composition VideoSlide not found")

      await renderMedia({
        composition: { ...composition, durationInFrames: totalFrames },
        serveUrl,
        outputLocation: outputPath,
        codec: "h264",
        inputProps: { slides: enrichedSlides },
        downloadMap,
        onProgress: ({ renderedFrames }) => {
          const pct = Math.round(60 + (renderedFrames / totalFrames) * 35)
          emit({ type: "step", step: "render", progress: Math.min(pct, 94), message: `渲染帧 ${renderedFrames}/${totalFrames}` })
        },
      })
    } finally {
      await closeServer()
    }

    emit({ type: "done", progress: 100, message: "视频生成完成！" })

  } finally {
    // 清理 public/ 里本次的临时音频文件
    for (const f of audioFilenames) {
      try { rmSync(join(PUBLIC_DIR, f)) } catch { /* ignore */ }
    }
  }
}

main().catch((err) => {
  emit({ type: "error", message: String(err?.message ?? err) })
  process.exit(1)
})
