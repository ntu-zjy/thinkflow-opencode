import { ReactFlowProvider } from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import Canvas from "./pages/Canvas"
import MemorySidebar from "./components/MemorySidebar"
import Toolbar from "./components/Toolbar"
import { useState } from "react"

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--color-bg-base)",
        overflow: "hidden",
      }}
    >
      <Toolbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {sidebarOpen && <MemorySidebar onClose={() => setSidebarOpen(false)} />}
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </div>
    </div>
  )
}
