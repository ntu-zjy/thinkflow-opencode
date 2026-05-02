import { useCanvasStore } from "../store/canvasStore"
import type { Theme } from "../App"

interface ToolbarProps {
  theme: Theme
  onToggleTheme: () => void
}

export function Toolbar({ theme, onToggleTheme }: ToolbarProps) {
  const nodes = useCanvasStore((s) => s.nodes)
  const runWorkflow = useCanvasStore((s) => s.runWorkflow)
  const abortWorkflow = useCanvasStore((s) => s.abortWorkflow)

  const agentNodes = nodes.filter((n) => n.type === "agent")
  const anyRunning = agentNodes.some((n) => (n.data as { status: string }).status === "running")

  const handleRunAll = () => {
    agentNodes.forEach((n) => {
      if ((n.data as { status: string }).status !== "running") runWorkflow(n.id)
    })
  }

  const handleAbortAll = () => {
    agentNodes.forEach((n) => abortWorkflow(n.id))
  }

  return (
    <div className="tf-toolbar">
      <div className="tf-toolbar__logo">
        ThinkFlow<span className="tf-toolbar__logo-cn"> · 思流</span>
      </div>

      <div className="tf-toolbar__spacer" />

      <div className="tf-toolbar__actions">
        {anyRunning ? (
          <button className="tf-btn tf-btn-danger" onClick={handleAbortAll}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            停止全部
          </button>
        ) : (
          <button className="tf-btn tf-btn-primary" onClick={handleRunAll} disabled={agentNodes.length === 0}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            运行全部
          </button>
        )}

        <button
          className="tf-btn tf-btn-ghost tf-theme-toggle"
          onClick={onToggleTheme}
          title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
          aria-label="切换主题"
        >
          {theme === "light" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
