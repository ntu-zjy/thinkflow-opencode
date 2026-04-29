import { useState, useRef, useEffect } from "react"
import { Play, Brain, Settings, ChevronDown, Plus } from "lucide-react"
import useCanvasStore from "../store/canvasStore"

type Props = {
  onToggleSidebar: () => void
}

export default function Toolbar({ onToggleSidebar }: Props) {
  const nodes = useCanvasStore((s) => s.nodes)
  const addNode = useCanvasStore((s) => s.addNode)
  const runWorkflow = useCanvasStore((s) => s.runWorkflow)
  const [addOpen, setAddOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!addOpen) return
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAddOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [addOpen])

  function runAll() {
    nodes.filter((n) => n.type === "agent").forEach((n) => runWorkflow(n.id))
  }

  function handleAddNode(type: "input" | "agent" | "output") {
    const offset = nodes.length * 20
    const positions: Record<string, { x: number; y: number }> = {
      input: { x: 100 + offset, y: 200 + offset },
      agent: { x: 420 + offset, y: 180 + offset },
      output: { x: 740 + offset, y: 200 + offset },
    }
    addNode(type, positions[type])
    setAddOpen(false)
  }

  const toolbarStyle: React.CSSProperties = {
    height: 48,
    background: "var(--color-bg-surface)",
    borderBottom: "1px solid var(--color-border-subtle)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: 12,
    flexShrink: 0,
    zIndex: 10,
  }

  const iconBtnStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s, border-color 0.15s",
  }

  const addBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "0 12px",
    height: 32,
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-secondary)",
    fontSize: 13,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
  }

  const runAllBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "0 14px",
    height: 32,
    background: "var(--color-accent-primary)",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: "#000",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
    transition: "background 0.15s",
  }

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-md)",
    boxShadow: "var(--shadow-elevated)",
    padding: "6px",
    minWidth: 160,
    zIndex: 100,
    fontFamily: "var(--font-body)",
  }

  const dropItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "var(--color-text-primary)",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    border: "none",
    background: "none",
    width: "100%",
    textAlign: "left",
    fontFamily: "var(--font-body)",
    transition: "background 0.12s",
  }

  const NODE_ITEMS = [
    { type: "input" as const, label: "输入节点", dot: "rgba(245,158,11,0.8)" },
    { type: "agent" as const, label: "Agent 节点", dot: "rgba(59,130,246,0.8)" },
    { type: "output" as const, label: "输出节点", dot: "rgba(16,185,129,0.8)" },
  ]

  return (
    <div style={toolbarStyle}>
      {/* Left: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--color-accent-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          思流
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-body)",
            letterSpacing: "0.02em",
          }}
        >
          ThinkFlow
        </span>
      </div>

      {/* Divider */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "var(--color-border-subtle)",
          flexShrink: 0,
        }}
      />

      {/* Center: Add node + Run all */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        {/* Add node dropdown */}
        <div ref={dropRef} style={{ position: "relative" }}>
          <button
            style={addBtnStyle}
            onClick={() => setAddOpen((v) => !v)}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-overlay)"
              ;(e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)"
              ;(e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"
            }}
          >
            <Plus size={14} />
            添加节点
            <ChevronDown size={12} />
          </button>

          {addOpen && (
            <div style={dropdownStyle}>
              {NODE_ITEMS.map((item) => (
                <button
                  key={item.type}
                  style={dropItemStyle}
                  onClick={() => handleAddNode(item.type)}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-overlay)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = "none"
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.dot,
                      flexShrink: 0,
                    }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Run all */}
        <button
          style={runAllBtnStyle}
          onClick={runAll}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "var(--color-accent-hover)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "var(--color-accent-primary)"
          }}
        >
          <Play size={13} />
          运行全部
        </button>
      </div>

      {/* Right: Memory + Settings */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          style={iconBtnStyle}
          onClick={onToggleSidebar}
          title="记忆库"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)"
            ;(e.currentTarget as HTMLElement).style.color = "var(--color-accent-primary)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent-primary)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "none"
            ;(e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "var(--color-border-subtle)"
          }}
        >
          <Brain size={15} />
        </button>

        <button
          style={iconBtnStyle}
          title="设置（待接入）"
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "var(--color-bg-elevated)"
            ;(e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = "none"
            ;(e.currentTarget as HTMLElement).style.color = "var(--color-text-secondary)"
          }}
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  )
}
