import React, { useState } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Select, Input, Tooltip } from "antd"
import type { InputNodeData, InputNodeType, InputType } from "@/types/canvas"
import { useCanvasStore } from "@/store"
import { useMemoryStore } from "@/store"
import "./NodeBase.css"
import "./InputNode.css"

const INPUT_TYPES: { value: InputType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "文本", icon: <TextIcon /> },
  { value: "url", label: "链接", icon: <UrlIcon /> },
  { value: "file", label: "文件", icon: <FileIcon /> },
  { value: "memory", label: "记忆", icon: <MemoryIcon /> },
  { value: "feed", label: "信息流", icon: <FeedIcon /> },
]

export default function InputNode({ id, data, selected }: NodeProps<InputNodeType>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const deleteNode = useCanvasStore((s) => s.deleteNode)
  const folders = useMemoryStore((s) => s.folders)

  function update(partial: Partial<InputNodeData>) {
    updateNodeData(id, partial)
  }

  const selectedType = INPUT_TYPES.find((t) => t.value === data.inputType)

  return (
    <div className={`tf-node tf-node--input ${selected ? "tf-node--selected" : ""}`}>
      <div className="tf-node__header">
        <span className="tf-node__type-indicator" style={{ background: "var(--tf-node-input)" }} />
        <span className="tf-node__label">输入</span>
        <button className="tf-node__delete" onClick={() => deleteNode(id)}>
          <CloseIcon />
        </button>
      </div>

      <div className="tf-node__body">
        <Select
          className="tf-input-type-select"
          value={data.inputType}
          onChange={(v: InputType) => update({ inputType: v })}
          size="small"
          options={INPUT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />

        {data.inputType === "text" && (
          <Input.TextArea
            className="tf-input-textarea"
            placeholder="输入文本内容..."
            value={data.value}
            onChange={(e) => update({ value: e.target.value })}
            autoSize={{ minRows: 2, maxRows: 6 }}
          />
        )}

        {data.inputType === "url" && (
          <Input
            className="tf-input-field"
            placeholder="粘贴网页链接..."
            value={data.value}
            onChange={(e) => update({ value: e.target.value })}
            prefix={<UrlIcon />}
          />
        )}

        {data.inputType === "file" && (
          <div
            className={`tf-drop-zone ${data.fileInfo ? "tf-drop-zone--has-file" : ""}`}
            onClick={() => {
              // In Tauri env, trigger file dialog
              const input = document.createElement("input")
              input.type = "file"
              input.accept = ".pdf,.png,.jpg,.jpeg,.txt,.md"
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0]
                if (f) {
                  update({
                    value: f.name,
                    fileInfo: { name: f.name, path: f.name, mimeType: f.type },
                  })
                }
              }
              input.click()
            }}
          >
            {data.fileInfo ? (
              <>
                <FileIcon />
                <span className="tf-drop-zone__name">{data.fileInfo.name}</span>
              </>
            ) : (
              <>
                <UploadIcon />
                <span>拖拽或点击上传文件</span>
                <span className="tf-drop-zone__hint">支持 PDF、图片、文本</span>
              </>
            )}
          </div>
        )}

        {data.inputType === "memory" && (
          <Select
            className="tf-input-type-select"
            placeholder="选择记忆..."
            value={data.memoryRef}
            onChange={(v) => update({ memoryRef: v, value: v })}
            size="small"
            options={folders.flatMap((f) =>
              f.entries.map((e) => ({
                value: e.id,
                label: `[${f.name}] ${e.title}`,
              })),
            )}
          />
        )}

        {data.inputType === "feed" && (
          <div className="tf-feed-config">
            <Input
              className="tf-input-field"
              placeholder="信息流名称，如：GitHub 热榜"
              value={data.feedConfig?.source ?? ""}
              onChange={(e) =>
                update({
                  feedConfig: { source: e.target.value, url: data.feedConfig?.url ?? "" },
                })
              }
            />
            <Input
              className="tf-input-field"
              placeholder="数据源 URL"
              value={data.feedConfig?.url ?? ""}
              onChange={(e) =>
                update({
                  feedConfig: { source: data.feedConfig?.source ?? "", url: e.target.value },
                })
              }
              prefix={<UrlIcon />}
            />
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="output" />
    </div>
  )
}

function TextIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
}
function UrlIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
}
function FileIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
}
function MemoryIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a5 5 0 0 1 5 5v2a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" /><path d="M2 20c0-4 4-6 10-6s10 2 10 6" /></svg>
}
function FeedIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 11a9 9 0 0 1 9 9" /><path d="M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></svg>
}
function UploadIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
}
function CloseIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
}
