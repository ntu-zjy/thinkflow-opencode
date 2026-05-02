import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

// 直接复用 app 包的样式和根组件
import "@thinkflow/app/src/styles/global.css"
import App from "@thinkflow/app/src/App"

// ─── 加载画面（等待 sidecar 启动） ──────────────────────────────────────────

const LoadingScreen = () => (
  <div
    style={{
      width: "100vw",
      height: "100vh",
      background: "#0b0f1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
      fontFamily: "'Outfit', sans-serif",
    }}
  >
    <div
      style={{
        fontFamily: "'Syne', sans-serif",
        fontSize: 32,
        fontWeight: 800,
        color: "#f1f5f9",
        letterSpacing: "-0.03em",
      }}
    >
      Think<span style={{ color: "#f59e0b" }}>Flow</span>
    </div>
    <div
      style={{
        width: 32,
        height: 32,
        border: "3px solid #1e293b",
        borderTopColor: "#f59e0b",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <div style={{ fontSize: 13, color: "#4b5563" }}>正在启动服务...</div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

// ─── 启动流程 ─────────────────────────────────────────────────────────────────

async function boot() {
  const root = createRoot(document.getElementById("root")!)
  root.render(<StrictMode><LoadingScreen /></StrictMode>)

  try {
    // 检查是否在 Tauri 环境中
    if (typeof window.__TAURI_INTERNALS__ !== "undefined") {
      const { invoke } = await import("@tauri-apps/api/core")
      // 轮询等待 sidecar 启动（最多 60 次 × 500ms = 30 秒）
      let url: string | null = null
      for (let i = 0; i < 60; i++) {
        try {
          const data = await invoke<{ url: string }>("ensure_server_ready")
          url = data.url
          break
        } catch {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
      if (url) {
        sessionStorage.setItem("thinkflow_server_url", url)
      } else {
        console.warn("Sidecar startup timeout, using default server URL")
      }
    }
  } catch (err) {
    console.warn("Tauri sidecar not available, using default server URL:", err)
  }

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
