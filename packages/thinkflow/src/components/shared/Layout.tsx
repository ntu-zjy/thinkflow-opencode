import React from "react"
import Sidebar from "./Sidebar"
import TopBar from "./TopBar"
import CanvasView from "@/components/canvas/CanvasView"
import MemoryLibrary from "@/components/memory/MemoryLibrary"
import { useAppStore } from "@/store"
import "./Layout.css"

export default function Layout() {
  const panel = useAppStore((s) => s.panel)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)

  return (
    <div className="tf-layout" data-sidebar-collapsed={sidebarCollapsed}>
      <Sidebar />
      <div className="tf-layout__main">
        <TopBar />
        <div className="tf-layout__content">
          {panel === "canvas" && <CanvasView />}
          {panel === "memory" && <MemoryLibrary />}
        </div>
      </div>
    </div>
  )
}
