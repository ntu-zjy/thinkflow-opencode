import React, { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Input, Select, Tooltip, Drawer, Spin } from "antd"
import type { AgentNodeData, AgentNodeType, NodeStatus } from "@/types/canvas"
import { useCanvasStore } from "@/store"
import { useAgentRunner } from "@/hooks/useAgentRunner"
import "./NodeBase.css"
import "./AgentNode.css"

const STATUS_LABELS: Record<NodeStatus, string> = {
  idle: "待运行",
  running: "运行中",
  done: "已完成",
  error: "出错",
}

const MODEL_OPTIONS = [
  { value: "moonshotai/kimi-k2:free", label: "Kimi K2" },
  { value: "anthropic/claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
]

export default function AgentNode({ id, data, selected }: NodeProps<AgentNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const deleteNode = useCanvasStore((s) => s.deleteNode)
  const [logsOpen, setLogsOpen] = useState(false)
  const { run } = useAgentRunner()

  function update(partial: Partial<AgentNodeData>) {
    updateNodeData(id, partial)
  }

  const isRunning = data.status === "running"
  const isDone = data.status === "done"
  const isError = data.status === "error"

  return (
    <div className={`tf-node tf-node--agent tf-node--status-${data.status} ${selected ? "tf-node--selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="tf-node__header">
        <StatusLight status={data.status} />
        <span className="tf-node__label">Agent</span>
        <Tooltip title="查看运行日志">
          <button className="tf-node__log-btn" onClick={() => setLogsOpen(true)}>
            <LogIcon />
          </button>
        </Tooltip>
        <button className="tf-node__delete" onClick={() => deleteNode(id)}>
          <CloseIcon />
        </button>
      </div>

      <div className="tf-node__body">
        <Select
          className="tf-agent-model-select"
          value={data.model}
          onChange={(v) => update({ model: v })}
          options={MODEL_OPTIONS}
          size="small"
        />

        <Input.TextArea
          className="tf-agent-idea"
          placeholder="在这里写下你的想法或指令..."
          value={data.idea}
          onChange={(e) => update({ idea: e.target.value })}
          autoSize={{ minRows: 2, maxRows: 5 }}
        />

        <div className="tf-agent-footer">
          <span className={`tf-agent-status tf-agent-status--${data.status}`}>
            {isRunning && <span className="tf-status-spinner" />}
            {STATUS_LABELS[data.status]}
          </span>
          <button
            className={`tf-run-btn ${isRunning ? "tf-run-btn--running" : ""}`}
            disabled={isRunning}
            onClick={() => run(id)}
          >
            {isRunning ? "运行中..." : "▶ 运行"}
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="output" />

      <Drawer
        title={`Agent 日志 · ${data.model}`}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        width={480}
        styles={{
          body: { background: "var(--tf-bg-primary)", padding: "12px" },
          header: { background: "var(--tf-bg-card)", borderColor: "var(--tf-border)" },
        }}
      >
        <div className="tf-agent-messages">
          {!data.messages?.length && (
            <div className="tf-agent-messages-empty">尚无消息，运行 Agent 后可在此查看对话过程</div>
          )}
          {data.messages?.map((msg) => (
            <div key={msg.id} className={`tf-agent-msg tf-agent-msg--${msg.role}`}>
              <span className="tf-agent-msg__role">{msg.role === "user" ? "输入" : msg.role === "assistant" ? "Assistant" : "工具"}</span>
              <pre className="tf-agent-msg__content">{msg.content}</pre>
            </div>
          ))}
          {isRunning && (
            <div className="tf-agent-msg tf-agent-msg--loading">
              <Spin size="small" />
              <span>正在思考...</span>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}

function StatusLight({ status }: { status: NodeStatus }) {
  return (
    <div className={`tf-status-light tf-status-light--${status}`} />
  )
}

function LogIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
}

function CloseIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
