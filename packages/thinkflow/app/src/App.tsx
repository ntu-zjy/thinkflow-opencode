import { useState, useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./pages/Canvas"
import { Toolbar } from "./components/Toolbar"
import { MemorySidebar } from "./components/MemorySidebar"

export type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("thinkflow-theme") as Theme | null
  if (stored === "light" || stored === "dark") return stored
  return "light"
}

export default function App() {
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("thinkflow-theme", theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"))

  return (
    <ReactFlowProvider>
      <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
        <Toolbar
          onToggleMemory={() => setMemoryOpen((v) => !v)}
          memoryOpen={memoryOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div style={{ position: "absolute", inset: 0, top: 52 }}>
          <Canvas />
        </div>
        <MemorySidebar open={memoryOpen} onClose={() => setMemoryOpen(false)} />
      </div>
    </ReactFlowProvider>
  )
}
