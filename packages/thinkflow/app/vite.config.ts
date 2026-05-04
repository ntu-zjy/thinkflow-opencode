import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { spawn, spawnSync } from "child_process"
import { fileURLToPath } from "url"
import { resolve, extname, join } from "path"
import { readFileSync, writeFileSync, unlinkSync, mkdirSync, existsSync, createReadStream } from "fs"
import { homedir, tmpdir } from "os"
import type { IncomingMessage, ServerResponse } from "http"
import { HttpsProxyAgent } from "https-proxy-agent"
import type { ChildProcess } from "child_process"

function readAuthKey(provider: string, envFallback: string): string {
  const paths = [
    resolve(homedir(), ".local/share/opencode/auth.json"),
    resolve(homedir(), ".config/opencode/auth.json"),
  ]
  for (const p of paths) {
    try {
      const j = JSON.parse(readFileSync(p, "utf-8"))
      const key = j?.[provider]?.key as string | undefined
      if (key) return key
    } catch {
      // 文件不存在或格式不对，继续下一个
    }
  }
  return process.env[envFallback] ?? ""
}

// 读取本地代理配置，让 Vite proxy 能走系统代理（VPN）
function readLocalProxy(): string {
  return (
    process.env.https_proxy ??
    process.env.HTTPS_PROXY ??
    process.env.http_proxy ??
    process.env.HTTP_PROXY ??
    ""
  )
}

const OPENCODE_PORT = 4096
const OPENCODE_DIR = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../opencode",
)
const OPENCODE_SRC = resolve(OPENCODE_DIR, "src/index.ts")

function opencodePlugin() {
  let proc: ChildProcess | null = null

  return {
    name: "vite-plugin-opencode",
    configureServer(server: { httpServer?: { on: (event: string, cb: () => void) => void } | null }) {
      fetch(`http://localhost:${OPENCODE_PORT}/global/health`, {
        signal: AbortSignal.timeout(800),
      })
        .then((r) => {
          if (r.ok) console.log("[opencode] 已有服务在运行，跳过启动")
          else launch()
        })
        .catch(launch)

      function launch() {
        proc = spawn(
          "bun",
          ["run", "--conditions=browser", OPENCODE_SRC, "serve", "--port", String(OPENCODE_PORT)],
          {
            stdio: "inherit",
            detached: false,
            cwd: OPENCODE_DIR,
            // 用空 plugin 列表覆盖全局配置，避免用户本地插件安装失败阻塞服务启动
            env: { ...process.env, OPENCODE_CONFIG_CONTENT: '{"plugin":[]}' },
          },
        )
        proc.on("error", (e: Error) => console.error("[opencode] 启动失败:", e.message))
        console.log(`[opencode] 启动中 (port ${OPENCODE_PORT})...`)
      }

      const cleanup = () => {
        if (proc && !proc.killed) {
          proc.kill()
          console.log("[opencode] 已停止")
        }
      }
      process.on("exit", cleanup)
      process.on("SIGINT", cleanup)
      process.on("SIGTERM", cleanup)
      server.httpServer?.on("close", cleanup)
    },
  }
}

// ─── markitdown 文件转 Markdown 插件 ─────────────────────────────────────────

interface MultipartPart {
  filename: string
  data: Buffer
}

function extractFileFromMultipart(body: Buffer, boundary: string): MultipartPart | null {
  const sep = Buffer.from(`--${boundary}`)
  const partStart = body.indexOf(sep) + sep.length
  const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), partStart)
  if (headerEnd < 0) return null

  // 提取 header 中的 filename
  const headerSection = body.subarray(partStart, headerEnd).toString()
  const filenameMatch = headerSection.match(/filename="([^"]+)"/)
  const filename = filenameMatch?.[1] ?? "upload.bin"

  const dataStart = headerEnd + 4
  const end = body.indexOf(Buffer.from(`\r\n--${boundary}`), dataStart)
  const data = end < 0 ? body.subarray(dataStart) : body.subarray(dataStart, end)
  return { filename, data }
}

function markitdownPlugin() {
  const uvxAvailable = spawnSync("uvx", ["--version"], { timeout: 5000 }).status === 0

  return {
    name: "vite-plugin-markitdown",
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {
      if (!uvxAvailable) {
        console.warn("[markitdown] uvx 不可用，文件转换将降级为纯文本读取。安装 uv 可启用完整文档解析：curl -LsSf https://astral.sh/uv/install.sh | sh")
      }

      server.middlewares.use("/api/convert-to-markdown", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end()
          return
        }
        if (!uvxAvailable) {
          res.statusCode = 503
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ error: "uvx not available" }))
          return
        }

        const chunks: Buffer[] = []
        req.on("data", (chunk: Buffer) => chunks.push(chunk))
        req.on("end", () => {
          const body = Buffer.concat(chunks)
          const contentType = (req.headers["content-type"] as string) ?? ""
          const boundary = contentType.split("boundary=")[1]
          if (!boundary) {
            res.statusCode = 400
            res.end()
            return
          }

          const part = extractFileFromMultipart(body, boundary)
          if (!part) {
            res.statusCode = 400
            res.setHeader("Content-Type", "application/json")
            res.end(JSON.stringify({ error: "no file found in request" }))
            return
          }

          // 写临时文件（保留扩展名，markitdown 依赖扩展名判断格式）
          const ext = extname(part.filename) || ".bin"
          const tmpPath = resolve(tmpdir(), `thinkflow-upload-${Date.now()}${ext}`)
          try {
            writeFileSync(tmpPath, part.data)
            // 使用 markitdown[all] 以支持 PDF/Word/PPT/图片等全部格式
            const result = spawnSync("uvx", ["--from", "markitdown[all]", "--quiet", "markitdown", tmpPath], {
              timeout: 60_000,
              encoding: "utf-8",
            })

            if (result.status === 0) {
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ markdown: result.stdout ?? "" }))
            } else {
              res.statusCode = 500
              res.setHeader("Content-Type", "application/json")
              res.end(JSON.stringify({ error: result.stderr ?? "markitdown failed" }))
            }
          } finally {
            try { unlinkSync(tmpPath) } catch { /* ignore */ }
          }
        })
      })
    },
  }
}

// ─── 视频生成插件 ─────────────────────────────────────────────────────────────

const VIDEO_RENDERER_DIR = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../video-renderer",
)

interface VideoSlideInput {
  title: string
  voiceover: string
  background: string
  duration?: number
}

interface VideoGenRequest {
  videoId: string
  title: string
  slides: VideoSlideInput[]
}

function sseWrite(res: ServerResponse, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

const WORKER_SCRIPT = resolve(VIDEO_RENDERER_DIR, "render-worker.mjs")

function videoGeneratorPlugin() {
  // 存储已生成视频的临时目录
  const videoTmpDirs = new Map<string, string>()

  return {
    name: "vite-plugin-video-generator",
    configureServer(server: { middlewares: { use: (path: string, handler: (req: IncomingMessage, res: ServerResponse) => void) => void } }) {

      // ─── POST /api/generate-video ─────────────────────────────────────────
      server.middlewares.use("/api/generate-video", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") { res.statusCode = 405; res.end(); return }

        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")
        res.setHeader("Access-Control-Allow-Origin", "*")

        const chunks: Buffer[] = []
        req.on("data", (chunk: Buffer) => chunks.push(chunk))
        req.on("end", () => {
          let body: VideoGenRequest
          try {
            body = JSON.parse(Buffer.concat(chunks).toString()) as VideoGenRequest
          } catch {
            sseWrite(res, { type: "error", message: "invalid JSON" })
            res.end()
            return
          }

          const { videoId } = body
          const tmpDir = resolve(tmpdir(), `thinkflow-video-${videoId}`)
          mkdirSync(tmpDir, { recursive: true })
          videoTmpDirs.set(videoId, tmpDir)

          // spawn 独立 worker：detached=true 让 worker 有独立进程组
          // 这样 Vite/Shell 的 SIGTERM 不会通过进程组广播给 worker
          const nodeBin = process.execPath  // 用当前 Node.js 的完整路径，避免 PATH 问题
          const workerConfig = JSON.stringify({ ...body, tmpDir })
          const worker = spawn(nodeBin, [WORKER_SCRIPT, workerConfig], {
            stdio: ["ignore", "pipe", "pipe"],
            cwd: VIDEO_RENDERER_DIR,
            detached: true,  // 独立进程组，不受 Vite 进程的信号影响
          })
          worker.unref()  // 不阻止 Vite 主进程退出

          let lineBuf = ""
          worker.stdout.on("data", (chunk: Buffer) => {
            lineBuf += chunk.toString()
            const lines = lineBuf.split("\n")
            lineBuf = lines.pop() ?? ""
            for (const line of lines) {
              if (!line.trim()) continue
              try {
                const evt = JSON.parse(line) as Record<string, unknown>
                if (evt.type === "done") {
                  // 注入 videoUrl
                  sseWrite(res, { ...evt, videoUrl: `/api/video-file/${videoId}` })
                } else {
                  sseWrite(res, evt)
                }
              } catch { /* 忽略非 JSON 行 */ }
            }
          })

          worker.stderr.on("data", (chunk: Buffer) => {
            // worker stderr 直接打印到 Vite 终端（用于调试）
            process.stderr.write(`[video-worker] ${chunk.toString()}`)
          })

          worker.on("close", (code, signal) => {
            if (code !== 0) {
              if (signal) {
                sseWrite(res, { type: "error", message: `Worker 被信号 ${signal} 终止` })
              } else {
                sseWrite(res, { type: "error", message: `Worker 退出码 ${code}` })
              }
            }
            res.end()
          })

          worker.on("error", (err) => {
            sseWrite(res, { type: "error", message: err.message })
            res.end()
          })

          // 客户端主动断开时 kill worker 进程组（监听 res close 更可靠）
          res.on("close", () => {
            if (!res.writableEnded && !worker.killed) {
              try {
                process.kill(-(worker.pid as number), "SIGKILL")
              } catch { worker.kill("SIGKILL") }
            }
          })
        })
      })

      // ─── GET /api/video-file/:videoId ─────────────────────────────────────
      server.middlewares.use("/api/video-file", (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "GET") { res.statusCode = 405; res.end(); return }
        const videoId = (req.url ?? "").replace(/^\//, "").split("?")[0]
        const tmpDir = videoTmpDirs.get(videoId)
        if (!tmpDir) { res.statusCode = 404; res.end(); return }
        const videoPath = join(tmpDir, "output.mp4")
        if (!existsSync(videoPath)) { res.statusCode = 404; res.end(); return }

        res.setHeader("Content-Type", "video/mp4")
        res.setHeader("Content-Disposition", `attachment; filename="thinkflow-video.mp4"`)
        createReadStream(videoPath).pipe(res)
      })
    },
  }
}

const OPENROUTER_KEY = readAuthKey("openrouter", "OPENROUTER_API_KEY")
const LOCAL_PROXY = readLocalProxy()

export default defineConfig({
  plugins: [react(), opencodePlugin(), markitdownPlugin(), videoGeneratorPlugin()],
  define: {
    "import.meta.env.VITE_OPENCODE_WORKDIR": JSON.stringify(OPENCODE_DIR),
  },
  server: {
    port: 1421,
    strictPort: true,
    proxy: {
      "/api/openrouter": {
        target: "https://openrouter.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openrouter/, "/api"),
        ...(LOCAL_PROXY ? ({ agent: new HttpsProxyAgent(LOCAL_PROXY) } as object) : {}),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (OPENROUTER_KEY) {
              proxyReq.setHeader("Authorization", `Bearer ${OPENROUTER_KEY}`)
              proxyReq.setHeader("HTTP-Referer", "http://localhost:1421")
              proxyReq.setHeader("X-Title", "ThinkFlow")
            }
          })
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["@remotion/renderer", "@remotion/bundler", "remotion", "@remotion/cli"],
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
  },
})
