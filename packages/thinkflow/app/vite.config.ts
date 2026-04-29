import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { spawn } from "child_process"
import { fileURLToPath } from "url"
import { resolve } from "path"
import type { ChildProcess } from "child_process"

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

export default defineConfig({
  plugins: [react(), opencodePlugin()],
  define: {
    "import.meta.env.VITE_OPENCODE_WORKDIR": JSON.stringify(OPENCODE_DIR),
  },
  server: {
    port: 1421,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    globals: true,
  },
})
