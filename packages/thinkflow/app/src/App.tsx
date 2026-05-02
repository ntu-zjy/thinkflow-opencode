import { useState, useEffect, useCallback } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./pages/Canvas"
import { Toolbar } from "./components/Toolbar"
import { MemoryPanel } from "./components/MemoryPanel"
import { WorkflowSidebar } from "./components/WorkflowSidebar"
import { TourGuide } from "./components/TourGuide"

export type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("thinkflow-theme") as Theme | null
  if (stored === "light" || stored === "dark") return stored
  return "light"
}

export default function App() {
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("thinkflow-tour-done"))

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("thinkflow-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"))

  const handleTourClose = useCallback(() => {
    localStorage.setItem("thinkflow-tour-done", "1")
    setShowTour(false)
  }, [])

  const handleRestartTour = useCallback(() => {
    localStorage.removeItem("thinkflow-tour-done")
    setShowTour(true)
  }, [])

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
