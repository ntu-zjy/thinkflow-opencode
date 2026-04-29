import { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Play, Square, ChevronDown, ChevronRight, Cpu } from "lucide-react"
import type { AgentNodeType, AgentStatus } from "../types"
import useCanvasStore from "../store/canvasStore"

const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "var(--color-status-idle)",
  running: "var(--color-status-running)",
  done: "var(--color-status-done)",
  error: "var(--color-status-error)",
}

const STATUS_BORDER: Record<AgentStatus, string> = {
  idle: "var(--color-border-subtle)",
  running: "var(--color-status-running)",
  done: "var(--color-status-done)",
  error: "var(--color-status-error)",
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "空闲",
  running: "运行中",
  done: "完成",
  error: "错误",
}

const MODEL_OPTIONS = [
  { value: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
]

export default function AgentNode({ id, data, selected }: NodeProps<AgentNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const runWorkflow = useCanvasStore((s) => s.runWorkflow)
  const abortWorkflow = useCanvasStore((s) => s.abortWorkflow)
  const [logsOpen, setLogsOpen] = useState(false)

  const status = data.status ?? "idle"
  const isRunning = status === "running"

  const nodeStyle: React.CSSProperties = {
    width: 280,
    background: "var(--color-bg-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: selected
      ? `var(--shadow-node), 0 0 0 2px var(--color-accent-primary)`
      : "var(--shadow-node)",
    border: `1px solid ${selected ? "var(--color-accent-primary)" : STATUS_BORDER[status]}`,
    overflow: "hidden",
    fontFamily: "var(--font-body)",
    transition: "box-shadow 0.2s, border-color 0.2s",
  }

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px 8px",
    borderBottom: "1px solid var(--color-border-subtle)",
  }

  const bodyStyle: React.CSSProperties = {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }

  const selectStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
    cursor: "pointer",
  }

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 72,
    maxHeight: 96,
    background: "var(--color-bg-elevated)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    padding: "8px 10px",
    resize: "vertical",
    outline: "none",
    lineHeight: 1.5,
  }

  const runBtnStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "8px 0",
    background: isRunning ? "rgba(239,68,68,0.15)" : "var(--color-accent-primary)",
    color: isRunning ? "var(--color-status-error)" : "#000",
    border: isRunning ? "1px solid var(--color-status-error)" : "none",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "var(--font-body)",
    cursor: "pointer",
    transition: "background 0.15s",
  }

  const logToggleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 0",
    fontSize: 12,
    color: "var(--color-text-muted)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    width: "100%",
    textAlign: "left",
  }

  const ROLE_COLOR: Record<string, string> = {
    user: "var(--color-accent-primary)",
    assistant: "var(--color-status-done)",
    system: "var(--color-text-muted)",
  }

  return (
    <div style={nodeStyle} className={isRunning ? "node-running" : undefined}>
      {/* Target handles — left side */}
      <Handle type="target" position={Position.Left} id="input-0" style={{ top: "35%", left: -5 }} />
      <Handle type="target" position={Position.Left} id="input-1" style={{ top: "65%", left: -5 }} />

      {/* Header */}
      <div style={headerStyle}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-sm)",
            background: "var(--color-accent-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-accent-primary)",
          }}
        >
          <Cpu size={13} />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-display)",
            flex: 1,
          }}
        >
          思流 Agent
        </span>
        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: STATUS_COLOR[status],
              boxShadow: isRunning ? `0 0 6px ${STATUS_COLOR[status]}` : "none",
              transition: "background 0.2s",
            }}
          />
          <span style={{ fontSize: 11, color: STATUS_COLOR[status] }}>
            {STATUS_LABEL[status]}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        {/* Model selector */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              display: "block",
              marginBottom: 4,
            }}
          >
            模型
          </label>
          <select
            style={selectStyle}
            value={data.model ?? "moonshotai/kimi-k2.6"}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Idea textarea */}
        <div>
          <label
            style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              display: "block",
              marginBottom: 4,
            }}
          >
            想法
          </label>
          <textarea
            style={textareaStyle}
            placeholder="输入你的想法或指令..."
            value={data.idea ?? ""}
            rows={4}
            onChange={(e) => updateNodeData(id, { idea: e.target.value })}
          />
        </div>

        {/* Run / Stop button */}
        <button
          style={runBtnStyle}
          onClick={() => (isRunning ? abortWorkflow(id) : runWorkflow(id))}
        >
          {isRunning ? (
            <>
              <Square size={13} />
              停止
            </>
          ) : (
            <>
              <Play size={13} />
              运行
            </>
          )}
        </button>

        {/* Logs drawer */}
        <div>
          <button style={logToggleStyle} onClick={() => setLogsOpen((v) => !v)}>
            {logsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            查看日志
            {data.logs?.length > 0 && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 10,
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border-default)",
                  borderRadius: 10,
                  padding: "1px 6px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {data.logs.length}
              </span>
            )}
          </button>

          {logsOpen && (
            <div
              style={{
                maxHeight: 160,
                overflowY: "auto",
                background: "var(--color-bg-elevated)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border-subtle)",
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {!data.logs?.length ? (
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  暂无日志
                </span>
              ) : (
                data.logs.map((log) => (
                  <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: ROLE_COLOR[log.role] ?? "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {log.role}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        fontFamily: "var(--font-mono)",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {log.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Source handle — right side */}
      <Handle type="source" position={Position.Right} id="source" style={{ right: -5 }} />
    </div>
  )
}
