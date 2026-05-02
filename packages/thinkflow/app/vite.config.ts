import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { spawn, spawnSync } from "child_process"
import { fileURLToPath } from "url"
import { resolve, extname } from "path"
import { readFileSync, writeFileSync, unlinkSync } from "fs"
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

const OPENROUTER_KEY = readAuthKey("openrouter", "OPENROUTER_API_KEY")
const SILICONFLOW_KEY = readAuthKey("siliconflow", "SILICONFLOW_API_KEY")
const LOCAL_PROXY = readLocalProxy()

export default defineConfig({
  plugins: [react(), opencodePlugin(), markitdownPlugin()],
  define: {
    "import.meta.env.VITE_OPENCODE_WORKDIR": JSON.stringify(OPENCODE_DIR),
  },
  server: {
    port: 1421,
    strictPort: true,
    proxy: {
      // OpenRouter proxy（走 VPN 时有效，国内备用 siliconflow）
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
      // 硅基流动 proxy（国内直连，fallback 图片生成）
      "/api/siliconflow": {
        target: "https://api.siliconflow.cn",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/siliconflow/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (SILICONFLOW_KEY) {
              proxyReq.setHeader("Authorization", `Bearer ${SILICONFLOW_KEY}`)
            }
          })
        },
      },
    },
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
