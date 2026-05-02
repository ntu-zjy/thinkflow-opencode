import { useEffect, useRef, useState } from "react"
import { type Editor, EditorContent } from "@tiptap/react"

// ─── 类型 ─────────────────────────────────────────────────────────────────────

interface ToolBtnProps {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
  small?: boolean
}

// ─── 工具按钮 ──────────────────────────────────────────────────────────────────

function ToolBtn({ active, onClick, title, children, danger, small }: ToolBtnProps) {
  return (
    <button
      className={`tf-editor-btn${active ? " active" : ""}${danger ? " danger" : ""}${small ? " small" : ""}`}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
    >
      {children}
    </button>
  )
}

// ─── SVG 图标 ─────────────────────────────────────────────────────────────────

const B   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 010 8H6z"/><path d="M6 12h9a4 4 0 010 8H6z"/></svg>
const I   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
const S   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 14.5 4 12 4C9.5 4 8 5.5 8 7.5C8 9 9 10 12 10.5"/><path d="M8 18C8 18 9.5 20 12 20C14.5 20 16 18.5 16 16.5C16 15 15 14 12 13.5"/></svg>
const Code= () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
const HL  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l-1 9 7-4 7 4-1-9"/><path d="M3 3h18v6H3z"/></svg>
const UL  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>
const OL  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="9" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">1.</text><text x="2" y="15" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">2.</text><text x="2" y="21" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">3.</text></svg>
const Q   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
const CB  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 9 5 12 9 15"/><polyline points="15 9 19 12 15 15"/></svg>
const Tbl = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
const HR  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>
const H   = (n: 1|2|3) => <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: -0.5 }}>H{n}</span>

// ─── 固定 Toolbar ─────────────────────────────────────────────────────────────

function EditorToolbar({ editor }: { editor: Editor }) {
  const Sep = () => <div className="tf-editor-toolbar-sep" />
  return (
    <div className="tf-editor-toolbar">
      <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="标题 1">{H(1)}</ToolBtn>
      <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="标题 2">{H(2)}</ToolBtn>
      <ToolBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="标题 3">{H(3)}</ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}      title="粗体 (Ctrl+B)"><B/></ToolBtn>
      <ToolBtn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="斜体 (Ctrl+I)"><I/></ToolBtn>
      <ToolBtn active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}    title="删除线"><S/></ToolBtn>
      <ToolBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="高亮"><HL/></ToolBtn>
      <ToolBtn active={editor.isActive("code")}      onClick={() => editor.chain().focus().toggleCode().run()}      title="内联代码"><Code/></ToolBtn>
      <Sep />
      <ToolBtn active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="无序列表"><UL/></ToolBtn>
      <ToolBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="有序列表"><OL/></ToolBtn>
      <ToolBtn active={editor.isActive("blockquote")}  onClick={() => editor.chain().focus().toggleBlockquote().run()}  title="引用"><Q/></ToolBtn>
      <ToolBtn active={editor.isActive("codeBlock")}   onClick={() => editor.chain().focus().toggleCodeBlock().run()}   title="代码块"><CB/></ToolBtn>
      <Sep />
      <ToolBtn active={false} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="插入表格"><Tbl/></ToolBtn>
      <ToolBtn active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="分割线"><HR/></ToolBtn>
    </div>
  )
}

// ─── Bubble Menu（选中文字时浮出） ────────────────────────────────────────────

function BubbleMenuPortal({ editor }: { editor: Editor }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const { from, to } = editor.state.selection
      if (from === to || editor.isActive("table")) { setPos(null); return }
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) { setPos(null); return }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (!rect.width) { setPos(null); return }
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 })
    }
    editor.on("selectionUpdate", update)
    editor.on("blur", () => setPos(null))
    return () => { editor.off("selectionUpdate", update); editor.off("blur", () => setPos(null)) }
  }, [editor])

  if (!pos) return null
  const menuWidth = ref.current?.offsetWidth ?? 300
  return (
    <div
      ref={ref}
      className="tf-bubble-menu"
      style={{ left: pos.x - menuWidth / 2, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <ToolBtn active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}      title="粗体"><B/></ToolBtn>
      <ToolBtn active={editor.isActive("italic")}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="斜体"><I/></ToolBtn>
      <ToolBtn active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}    title="删除线"><S/></ToolBtn>
      <ToolBtn active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} title="高亮"><HL/></ToolBtn>
      <ToolBtn active={editor.isActive("code")}      onClick={() => editor.chain().focus().toggleCode().run()}      title="代码"><Code/></ToolBtn>
      <div className="tf-bubble-menu-sep" />
      <ToolBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1">{H(1)}</ToolBtn>
      <ToolBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2">{H(2)}</ToolBtn>
      <ToolBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="引用"><Q/></ToolBtn>
    </div>
  )
}

// ─── Slash Menu（空行时浮出命令列表） ─────────────────────────────────────────

const SLASH_ITEMS = [
  { label: "标题 1",  desc: "大号标题",  icon: <span style={{fontSize:11,fontWeight:700}}>H1</span>, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: "标题 2",  desc: "中号标题",  icon: <span style={{fontSize:11,fontWeight:700}}>H2</span>, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "标题 3",  desc: "小号标题",  icon: <span style={{fontSize:11,fontWeight:700}}>H3</span>, action: (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: "无序列表", desc: "· 项目符号", icon: <UL/>,   action: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { label: "有序列表", desc: "1. 编号列表", icon: <OL/>,  action: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { label: "引用",    desc: "引用块",    icon: <Q/>,    action: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { label: "代码块",  desc: "多行代码",  icon: <CB/>,   action: (e: Editor) => e.chain().focus().toggleCodeBlock().run() },
  { label: "表格",    desc: "3×3 表格",  icon: <Tbl/>,  action: (e: Editor) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "分割线",  desc: "水平分隔",  icon: <HR/>,   action: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
]

function SlashMenu({ editor }: { editor: Editor }) {
  const [visible, setVisible] = useState(false)
  const [cursorRect, setCursorRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const handleUpdate = () => {
      const { $from } = editor.state.selection
      // 只在行首输入了 "/" 时显示
      const text = $from.parent.textContent
      const isSlash = text === "/" && $from.parent.type.name !== "tableCell"
      if (!isSlash) { setVisible(false); return }
      const coords = editor.view.coordsAtPos(editor.state.selection.from)
      setCursorRect(new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top))
      setVisible(true)
    }
    const handleHide = () => setVisible(false)
    editor.on("update", handleUpdate)
    editor.on("selectionUpdate", handleHide)
    editor.on("blur", handleHide)
    return () => {
      editor.off("update", handleUpdate)
      editor.off("selectionUpdate", handleHide)
      editor.off("blur", handleHide)
    }
  }, [editor])

  if (!visible || !cursorRect) return null
  return (
    <div
      className="tf-slash-menu"
      style={{ left: cursorRect.left, top: cursorRect.bottom + 4 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {SLASH_ITEMS.map((item) => (
        <button
          key={item.label}
          className="tf-slash-item"
          onMouseDown={(e) => {
            e.preventDefault()
            // 先删掉 "/" 字符，再执行格式命令
            editor.chain().focus().deleteRange({
              from: editor.state.selection.from - 1,
              to: editor.state.selection.from,
            }).run()
            item.action(editor)
            setVisible(false)
          }}
        >
          <span className="tf-slash-item-icon">{item.icon}</span>
          <span className="tf-slash-item-label">{item.label}</span>
          <span className="tf-slash-item-desc">{item.desc}</span>
        </button>
      ))}
    </div>
  )
}

// ─── 表格工具栏 ───────────────────────────────────────────────────────────────

function TableMenu({ editor }: { editor: Editor }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () => setActive(editor.isActive("table"))
    editor.on("selectionUpdate", update)
    return () => { editor.off("selectionUpdate", update) }
  }, [editor])

  if (!active) return null
  return (
    <div className="tf-table-menu">
      <ToolBtn small active={false} onClick={() => editor.chain().focus().addColumnBefore().run()} title="左插列">←列</ToolBtn>
      <ToolBtn small active={false} onClick={() => editor.chain().focus().addColumnAfter().run()}  title="右插列">列→</ToolBtn>
      <ToolBtn small active={false} onClick={() => editor.chain().focus().addRowBefore().run()}    title="上插行">↑行</ToolBtn>
      <ToolBtn small active={false} onClick={() => editor.chain().focus().addRowAfter().run()}     title="下插行">行↓</ToolBtn>
      <div className="tf-editor-toolbar-sep" />
      <ToolBtn small danger active={false} onClick={() => editor.chain().focus().deleteColumn().run()} title="删列">删列</ToolBtn>
      <ToolBtn small danger active={false} onClick={() => editor.chain().focus().deleteRow().run()}    title="删行">删行</ToolBtn>
      <ToolBtn small danger active={false} onClick={() => editor.chain().focus().deleteTable().run()}  title="删表">删表</ToolBtn>
    </div>
  )
}

// ─── 主导出：完整编辑器区域 ───────────────────────────────────────────────────

interface MemoryEditorProps {
  editor: Editor | null
}

export function MemoryEditor({ editor }: MemoryEditorProps) {
  if (!editor) return null
  return (
    <div className="tf-memory-tiptap-wrapper">
      <EditorToolbar editor={editor} />
      <TableMenu editor={editor} />
      <div className="tf-memory-tiptap-body">
        <BubbleMenuPortal editor={editor} />
        <SlashMenu editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
