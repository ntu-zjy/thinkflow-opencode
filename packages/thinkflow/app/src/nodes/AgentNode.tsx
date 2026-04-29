import { useState } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { AgentNodeType, AgentNodeData } from "../types"
import { useCanvasStore } from "../store/canvasStore"

const MODELS = [
  { id: "moonshotai/kimi-k2.6", label: "Kimi K2.6 (默认)" },
  { id: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
]

export function AgentNode({ id, data, selected }: NodeProps<AgentNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const runWorkflow = useCanvasStore((s) => s.runWorkflow)
  const abortWorkflow = useCanvasStore((s) => s.abortWorkflow)

  const [showLogs, setShowLogs] = useState(false)

  const isRunning = data.status === "running"

  const statusLabel: Record<string, string> = {
    idle: "待运行",
    running: "运行中",
    done: "已完成",
    error: "错误",
  }

  return (
    <div className={`tf-node${selected ? " selected" : ""}`} style={{ minWidth: 300 }}>
      <Handle type="target" position={Position.Left} />

      <div className="tf-node__header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          <span className="tf-node__title">Agent</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div className={`tf-status-dot ${data.status}`} title={statusLabel[data.status]} />
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{statusLabel[data.status]}</span>
          {!isRunning && (
            <button className="tf-node__delete" onClick={() => removeNode(id)} title="删除节点">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="tf-node__body">
        {/* 模型选择 */}
        <select
          className="tf-select"
          value={data.model}
          onChange={(e) => updateNodeData<AgentNodeData>(id, { model: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>

        {/* 想法输入框 */}
        <textarea
          className="tf-textarea"
          placeholder="写下你的想法或指令（可选）..."
          value={data.idea}
          onChange={(e) => updateNodeData<AgentNodeData>(id, { idea: e.target.value })}
          rows={3}
        />

        {/* dry-run 开关 */}
        <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={data.dryRun}
            onChange={(e) => updateNodeData<AgentNodeData>(id, { dryRun: e.target.checked })}
            style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Dry-run（模拟运行）</span>
        </label>

        {/* 运行/停止按钮 */}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {isRunning ? (
            <button
              className="tf-btn tf-btn-danger"
              style={{ flex: 1 }}
              onClick={() => abortWorkflow(id)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              停止
            </button>
          ) : (
            <button
              className="tf-btn tf-btn-primary"
              style={{ flex: 1 }}
              onClick={() => runWorkflow(id)}
              disabled={data.status === "running"}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              运行
            </button>
          )}

          {data.logs.length > 0 && (
            <button
              className="tf-btn tf-btn-ghost"
              onClick={() => setShowLogs((v) => !v)}
              title="查看日志"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </button>
          )}
        </div>

        {/* 日志展示 */}
        {showLogs && data.logs.length > 0 && (
          <div className="tf-logs">
            {data.logs.map((log) => (
              <div key={log.id} className={`tf-log-line ${log.type}`}>
                <span style={{ opacity: 0.4, marginRight: 6 }}>
                  {new Date(log.timestamp).toLocaleTimeString("zh-CN", { hour12: false })}
                </span>
                {log.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  )
}
