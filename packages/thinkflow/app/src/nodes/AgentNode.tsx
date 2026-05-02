import { useState, useEffect, useRef, useMemo } from "react"
import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { AgentNodeType, AgentNodeData, MatrixSlot } from "../types"
import { useCanvasStore } from "../store/canvasStore"
import { useMemoryStore } from "../store/memoryStore"
import { nanoid } from "nanoid"

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
  const setScheduleTimer = useCanvasStore((s) => s.setScheduleTimer)
  const clearScheduleTimer = useCanvasStore((s) => s.clearScheduleTimer)
  const folders = useMemoryStore((s) => s.folders)
  const allEntries = useMemoryStore((s) => s.entries)
  const entriesByFolder = useMemo(() => {
    const map: Record<string, typeof allEntries> = {}
    for (const e of allEntries) {
      if (!map[e.folderId]) map[e.folderId] = []
      map[e.folderId].push(e)
    }
    return map
  }, [allEntries])

  const [showLogs, setShowLogs] = useState(false)
  // 记录今天是否已经触发过，格式 "YYYY-MM-DD"
  const lastRunDateRef = useRef<string | null>(null)

  const isRunning = data.status === "running"

  const scheduleEnabled = data.scheduleEnabled ?? false
  const scheduleTime = data.scheduleTime ?? "09:00"
  const matrixMode = data.matrixMode ?? false
  const matrixSlots: MatrixSlot[] = data.matrixSlots ?? []

  // 每分钟轮询检查是否到达指定时间
  useEffect(() => {
    if (!scheduleEnabled) {
      clearScheduleTimer(id)
      lastRunDateRef.current = null
      return
    }

    const check = () => {
      const now = new Date()
      const hhmm = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      const today = now.toISOString().slice(0, 10)
      if (hhmm === scheduleTime && lastRunDateRef.current !== today) {
        const node = useCanvasStore.getState().nodes.find((n) => n.id === id) as AgentNodeType | undefined
        if (node?.data.status !== "running") {
          lastRunDateRef.current = today
          runWorkflow(id)
        }
      }
    }

    // 对齐到下一个整分钟再开始，减少误差
    const now = new Date()
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    const initialTimeout = setTimeout(() => {
      check()
      const timer = setInterval(check, 60_000)
      setScheduleTimer(id, timer)
    }, msToNextMinute)

    return () => {
      clearTimeout(initialTimeout)
      clearScheduleTimer(id)
    }
  }, [scheduleEnabled, scheduleTime, id])

  const statusLabel: Record<string, string> = {
    idle: "待运行",
    running: "运行中",
    done: "已完成",
    error: "错误",
  }

  const updateSlot = (slotId: string, patch: Partial<MatrixSlot>) => {
    updateNodeData<AgentNodeData>(id, {
      matrixSlots: matrixSlots.map((s) => (s.id === slotId ? { ...s, ...patch } : s)),
    })
  }

  const addSlot = () => {
    if (matrixSlots.length >= 6) return
    updateNodeData<AgentNodeData>(id, {
      matrixSlots: [...matrixSlots, { id: `slot-${nanoid(4)}`, folderId: "folder-persona" }],
    })
  }

  const removeSlot = (slotId: string) => {
    if (matrixSlots.length <= 2) return
    updateNodeData<AgentNodeData>(id, {
      matrixSlots: matrixSlots.filter((s) => s.id !== slotId),
    })
  }

  return (
    <div className={`tf-node${selected ? " selected" : ""}`} style={{ minWidth: 300 }}>
      <Handle type="target" position={Position.Left} />

      <div className="tf-node__header" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
          <span className="tf-node__title">Agent</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          {scheduleEnabled && (
            <span className="tf-schedule-status">⏰ 每天 {scheduleTime}</span>
          )}
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

        {/* 定时运行配置行 */}
        <div className="tf-agent-config-row">
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => updateNodeData<AgentNodeData>(id, { scheduleEnabled: e.target.checked })}
              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>定时运行</span>
          </label>
          {scheduleEnabled && (
            <>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>每天</span>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => updateNodeData<AgentNodeData>(id, { scheduleTime: e.target.value })}
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  color: "var(--text-primary)",
                  fontSize: 11,
                  padding: "2px 6px",
                  outline: "none",
                  cursor: "pointer",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>执行</span>
            </>
          )}
        </div>

        {/* 矩阵模式配置区 */}
        <div className="tf-agent-config-row" style={{ flexDirection: "column", alignItems: "flex-start" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={matrixMode}
              onChange={(e) => updateNodeData<AgentNodeData>(id, { matrixMode: e.target.checked })}
              style={{ accentColor: "var(--accent)", width: 14, height: 14 }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>矩阵模式（多账号运营）</span>
          </label>

          {matrixMode && (
            <div style={{ width: "100%", marginTop: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {matrixSlots.map((slot, i) => (
                <div key={slot.id} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, minWidth: 36 }}>
                      人设 {i + 1}
                    </span>
                    {/* 分类选择 */}
                    <select
                      className="tf-select"
                      value={slot.folderId}
                      onChange={(e) => updateSlot(slot.id, {
                        folderId: e.target.value,
                        memoryEntryId: undefined,
                        customPersona: undefined,
                      })}
                      style={{ fontSize: 11, padding: "2px 6px", flex: 1 }}
                    >
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                      <option value="custom">自定义</option>
                    </select>
                    {/* 条目选择（非自定义时显示） */}
                    {slot.folderId !== "custom" && (
                      <select
                        className="tf-select"
                        value={slot.memoryEntryId ?? ""}
                        onChange={(e) => updateSlot(slot.id, { memoryEntryId: e.target.value || undefined })}
                        style={{ fontSize: 11, padding: "2px 6px", flex: 2 }}
                      >
                        <option value="">— 选择人设 —</option>
                        {(entriesByFolder[slot.folderId] ?? []).map((entry) => (
                          <option key={entry.id} value={entry.id}>{entry.title}</option>
                        ))}
                      </select>
                    )}
                    {matrixSlots.length > 2 && (
                      <button
                        className="tf-node__delete"
                        style={{ flexShrink: 0 }}
                        onClick={() => removeSlot(slot.id)}
                        title="删除此 slot"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {/* 自定义人设文本 */}
                  {slot.folderId === "custom" && (
                    <textarea
                      className="tf-textarea"
                      placeholder={`人设 ${i + 1} 描述...`}
                      value={slot.customPersona ?? ""}
                      onChange={(e) => updateSlot(slot.id, { customPersona: e.target.value })}
                      rows={2}
                      style={{ fontSize: 11, marginLeft: 44 }}
                    />
                  )}
                </div>
              ))}
              {matrixSlots.length < 6 && (
                <button
                  className="tf-btn tf-btn-ghost"
                  style={{ fontSize: 11, padding: "3px 8px", alignSelf: "flex-start" }}
                  onClick={addSlot}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  添加 slot
                </button>
              )}
            </div>
          )}
        </div>

        {/* 运行/停止按钮 */}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {isRunning ? (
            <button className="tf-btn tf-btn-danger" style={{ flex: 1 }} onClick={() => abortWorkflow(id)}>
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
              {matrixMode ? "矩阵运行" : "运行"}
            </button>
          )}

          {data.logs.length > 0 && (
            <button className="tf-btn tf-btn-ghost" onClick={() => setShowLogs((v) => !v)} title="查看日志">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </button>
          )}
        </div>

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
