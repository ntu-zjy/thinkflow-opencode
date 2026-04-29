import React, { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Select, Modal, Button, Tooltip } from "antd"
import type { OutputNodeData, OutputNodeType, PlatformType } from "@/types/canvas"
import { useCanvasStore } from "@/store"
import { useMemoryStore } from "@/store"
import { PLATFORM_FORMATS } from "@/types/platform"
import "./NodeBase.css"
import "./OutputNode.css"

const PLATFORM_OPTIONS = Object.values(PLATFORM_FORMATS).map((p) => ({
  value: p.id,
  label: p.name,
}))

export default function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const deleteNode = useCanvasStore((s) => s.deleteNode)
  const folders = useMemoryStore((s) => s.folders)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [memorySaved, setMemorySaved] = useState(false)

  function update(partial: Partial<OutputNodeData>) {
    updateNodeData(id, partial)
  }

  const platform = PLATFORM_FORMATS[data.platform]
  const hasContent = !!data.content

  function saveToMemory() {
    const materialFolder = folders.find((f) => f.type === "material")
    if (!materialFolder || !data.content) return
    addEntry(materialFolder.id, {
      title: `${platform.name} 输出 · ${new Date().toLocaleDateString()}`,
      type: "material",
      content: data.content,
      tags: [platform.name, "输出"],
      platform: data.platform,
    })
    setMemorySaved(true)
    setTimeout(() => setMemorySaved(false), 2000)
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(data.content)
  }

  return (
    <div className={`tf-node tf-node--output tf-node--status-${data.status} ${selected ? "tf-node--selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="tf-node__header">
        <span className="tf-node__type-indicator" style={{ background: "var(--tf-node-output)" }} />
        <span className="tf-node__label">输出</span>
        <button className="tf-node__delete" onClick={() => deleteNode(id)}>
          <CloseIcon />
        </button>
      </div>

      <div className="tf-node__body">
        <Select
          className="tf-output-platform-select"
          value={data.platform}
          onChange={(v: PlatformType) => update({ platform: v })}
          options={PLATFORM_OPTIONS}
          size="small"
        />

        <div className={`tf-output-preview ${!hasContent ? "tf-output-preview--empty" : ""}`}>
          {hasContent ? (
            <div className="tf-output-content">{data.content.slice(0, 120)}{data.content.length > 120 ? "..." : ""}</div>
          ) : (
            <div className="tf-output-placeholder">
              <OutputWaitIcon />
              <span>等待 Agent 输出</span>
            </div>
          )}
        </div>

        {hasContent && (
          <div className="tf-output-actions">
            <Tooltip title="预览完整内容">
              <button className="tf-output-btn" onClick={() => setPreviewOpen(true)}>
                <EyeIcon /> 预览
              </button>
            </Tooltip>
            <Tooltip title="复制内容">
              <button className="tf-output-btn" onClick={copyToClipboard}>
                <CopyIcon /> 复制
              </button>
            </Tooltip>
            <Tooltip title="存为记忆">
              <button
                className={`tf-output-btn ${memorySaved ? "tf-output-btn--saved" : ""}`}
                onClick={saveToMemory}
              >
                <MemoryIcon /> {memorySaved ? "已存！" : "存为记忆"}
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      <Modal
        title={`预览 · ${platform.name}`}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="copy" onClick={copyToClipboard}>复制内容</Button>,
          <Button key="memory" type="primary" onClick={saveToMemory}>存为记忆</Button>,
        ]}
        width={640}
        styles={{
          body: { background: "var(--tf-bg-primary)", padding: "16px", maxHeight: "60vh", overflowY: "auto" },
          header: { background: "var(--tf-bg-card)", borderColor: "var(--tf-border)" },
        }}
      >
        <pre className="tf-output-full">{data.content}</pre>
      </Modal>
    </div>
  )
}

function OutputWaitIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
}
function EyeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
}
function CopyIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
}
function MemoryIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" /><path d="M2 20c0-4 4-6 10-6s10 2 10 6" /></svg>
}
function CloseIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
