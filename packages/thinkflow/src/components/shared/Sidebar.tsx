import React from "react"
import { Tooltip } from "antd"
import { useAppStore } from "@/store"
import { useCanvasStore } from "@/store"
import "./Sidebar.css"

const Logo = () => (
  <div className="tf-sidebar__logo">
    <span className="tf-logo-mark">TF</span>
  </div>
)

const NavItem = ({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) => (
  <Tooltip title={label} placement="right">
    <button className={`tf-nav-item ${active ? "tf-nav-item--active" : ""}`} onClick={onClick}>
      {icon}
    </button>
  </Tooltip>
)

export default function Sidebar() {
  const { panel, setPanel, toggleSidebar, sidebarCollapsed } = useAppStore()
  const canvases = useCanvasStore((s) => s.canvases)
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)
  const createCanvas = useCanvasStore((s) => s.createCanvas)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  return (
    <aside className={`tf-sidebar ${sidebarCollapsed ? "tf-sidebar--collapsed" : ""}`}>
      <Logo />

      <nav className="tf-sidebar__nav">
        <NavItem
          icon={<CanvasIcon />}
          label="画布"
          active={panel === "canvas"}
          onClick={() => setPanel("canvas")}
        />
        <NavItem
          icon={<MemoryIcon />}
          label="记忆库"
          active={panel === "memory"}
          onClick={() => setPanel("memory")}
        />
      </nav>

      {panel === "canvas" && !sidebarCollapsed && (
        <div className="tf-sidebar__canvases">
          <div className="tf-sidebar__section-header">
            <span>画布</span>
            <button className="tf-icon-btn" onClick={() => createCanvas()} title="新建画布">
              <PlusIcon />
            </button>
          </div>
          <ul className="tf-canvas-list">
            {canvases.map((c) => (
              <li
                key={c.id}
                className={`tf-canvas-item ${c.id === activeCanvasId ? "tf-canvas-item--active" : ""}`}
                onClick={() => {
                  setActiveCanvas(c.id)
                  setPanel("canvas")
                }}
              >
                <span className="tf-canvas-item__dot" />
                <span className="tf-canvas-item__title">{c.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tf-sidebar__footer">
        <button className="tf-icon-btn" onClick={toggleSidebar} title="折叠侧边栏">
          <CollapseIcon collapsed={sidebarCollapsed} />
        </button>
      </div>
    </aside>
  )
}

function CanvasIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function MemoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" />
      <path d="M2 20c0-4 4-6 10-6s10 2 10 6" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}
