import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { invoke } from "@tauri-apps/api/core"

// ── Types ─────────────────────────────────────────────────────────────────────

type ServerReadyData = {
  url: string
  password?: string
}

type AppState =
  | { phase: "loading" }
  | { phase: "ready"; serverUrl: string }
  | { phase: "error"; message: string }

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  const [dots, setDots] = useState(".")
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0b0f1a",
        fontFamily: "'Outfit', sans-serif",
        gap: 20,
      }}
    >
      {/* Animated logo */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color: "#f59e0b",
          letterSpacing: "-0.02em",
          fontFamily: "'Syne', sans-serif",
        }}
      >
        思流
      </div>
      <div style={{ color: "#8a9bbf", fontSize: 14, letterSpacing: "0.06em" }}>
        ThinkFlow
      </div>

      {/* Spinner ring */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "2px solid rgba(245,158,11,0.15)",
          borderTop: "2px solid #f59e0b",
          animation: "spin 0.8s linear infinite",
          marginTop: 8,
        }}
      />

      <p style={{ color: "#4a5a7a", fontSize: 13 }}>
        正在启动 AI 引擎{dots}
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0b0f1a",
        fontFamily: "'Outfit', sans-serif",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 40, color: "#f59e0b", fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>
        思流
      </div>
      <div style={{ color: "#ef4444", fontSize: 14, maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
        启动失败：{message}
      </div>
      <button
        style={{
          marginTop: 8,
          padding: "8px 20px",
          background: "#f59e0b",
          color: "#000",
          border: "none",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
        onClick={() => window.location.reload()}
      >
        重试
      </button>
    </div>
  )
}

// ── Canvas app iframe ─────────────────────────────────────────────────────────
// Desktop shell renders app in an iframe so we can pass the server URL
// without rebuilding the app package. In production the app is bundled
// alongside this shell and served from the same origin.

function AppShell({ serverUrl }: { serverUrl: string }) {
  // Store server URL in sessionStorage so the app package can read it
  sessionStorage.setItem("thinkflow_server_url", serverUrl)

  // The app (from packages/thinkflow/app/dist) is bundled into the desktop
  // and served at the same origin. We just mount it directly.
  // In dev mode this redirects to the app dev server.
  useEffect(() => {
    // Signal to the embedded app that server URL has been set
    window.dispatchEvent(new CustomEvent("thinkflow:server-ready", { detail: { serverUrl } }))
  }, [serverUrl])

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* App content is mounted in the same window; this file just handles startup */}
      <div id="app-content" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

function Root() {
  const [state, setState] = useState<AppState>({ phase: "loading" })

  useEffect(() => {
    invoke<ServerReadyData>("ensure_server_ready")
      .then((data) => {
        console.log("[ThinkFlow] Server ready at", data.url)
        // Write server URL so opencodeClient can pick it up
        sessionStorage.setItem("thinkflow_server_url", data.url)
        if (data.password) {
          sessionStorage.setItem("thinkflow_server_password", data.password)
        }
        setState({ phase: "ready", serverUrl: data.url })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("[ThinkFlow] Server startup failed:", msg)
        setState({ phase: "error", message: msg })
      })
  }, [])

  if (state.phase === "loading") return <LoadingScreen />
  if (state.phase === "error") return <ErrorScreen message={state.message} />

  // Once server is ready, render the app.
  // The actual React app from packages/thinkflow/app is bundled here.
  return <AppShell serverUrl={state.serverUrl} />
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
