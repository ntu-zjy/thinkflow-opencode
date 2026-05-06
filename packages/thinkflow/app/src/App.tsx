import { useState, useEffect, useCallback } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./pages/Canvas"
import { Landing } from "./pages/Landing"
import { Toolbar } from "./components/Toolbar"
import { MemoryPanel } from "./components/MemoryPanel"
import { WorkflowSidebar } from "./components/WorkflowSidebar"
import { TourGuide } from "./components/TourGuide"
// 触发输入卡片注册（副作用）
import "./input-cards"

export type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("thinkflow-theme") as Theme | null
  if (stored === "light" || stored === "dark") return stored
  return "light"
}

// 判断是否进入主应用：路径为 /app 或 /app/ 或带 ?app 参数
function isAppRoute(): boolean {
  const { pathname, search } = window.location
  return pathname.startsWith("/app") || search.includes("app")
}

export default function App() {
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("thinkflow-tour-done"))
  const [inApp] = useState(isAppRoute)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("thinkflow-theme", theme)
  }, [theme])

  // Landing 页时 body 可滚动
  useEffect(() => {
    if (!inApp) {
      document.documentElement.style.overflow = "auto"
      document.body.style.overflow = "auto"
      document.body.style.height = "auto"
    }
    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
      document.body.style.height = ""
    }
  }, [inApp])

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"))

  const handleTourClose = useCallback(() => {
    localStorage.setItem("thinkflow-tour-done", "1")
    setShowTour(false)
  }, [])

  const handleRestartTour = useCallback(() => {
    localStorage.removeItem("thinkflow-tour-done")
    setShowTour(true)
  }, [])

  // Landing 页路由
  if (!inApp) {
    return <Landing />
  }

  return (
    <ReactFlowProvider>
      <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
        <Toolbar
          theme={theme}
          onToggleTheme={toggleTheme}
          onRestartTour={handleRestartTour}
        />
        {showTour && <TourGuide onClose={handleTourClose} />}
        {/* 左侧工作流侧边栏 + 主内容区（画布或记忆库） */}
        <div style={{ position: "absolute", inset: 0, top: 52, display: "flex" }}>
          <WorkflowSidebar
            memoryOpen={memoryOpen}
            onToggleMemory={() => setMemoryOpen((v) => !v)}
          />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {memoryOpen ? (
              <MemoryPanel onClose={() => setMemoryOpen(false)} />
            ) : (
              <Canvas />
            )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
