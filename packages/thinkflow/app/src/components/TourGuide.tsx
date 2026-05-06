import { useState, useEffect, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { nanoid } from "nanoid"
import { useCanvasStore } from "../store/canvasStore"
import type { FlowNode, FlowEdge } from "../types"

interface TourGuideProps {
  onClose: () => void
}

interface TourStep {
  title: string
  content: string
  targetSelector: string | null
  placement: "top" | "bottom" | "left" | "right" | "fixed"
  fixedPos?: CSSProperties
  tip?: string
}

// 画布左上角（侧边栏右侧）固定位置
const CANVAS_TOP_LEFT: CSSProperties = { top: 72, left: 176 }

const TOUR_STEPS: TourStep[] = [
  {
    title: "ThinkFlow 是什么？",
    content: "传统 AI 聊天软件是「一问一答」——你问，AI 答，每次都要重新说明背景。\n\nThinkFlow 是「工作流画布」——你把内容、指令、输出目标用节点连成图，AI 按图自动完成整个创作流程。\n\n适合场景：\n• 内容创作者 — 一键生成多平台稿件\n• 多账号运营 — 不同人设批量产出\n• 信息处理 — 定时抓取+自动总结\n• 视频生产 — 文稿→配音→MP4",
    targetSelector: null,
    placement: "fixed",
    fixedPos: CANVAS_TOP_LEFT,
    tip: "最大的区别：你只需配置一次工作流，之后每次运行 AI 都能精准执行",
  },
  {
    title: "输入节点",
    content: "右键画布空白处，选择「输入节点」即可创建。\n\n支持 5 种输入类型：\n• 文本 — 直接填写内容\n• 链接 — 传 URL，Agent 自动读取\n• 文件 — 上传文档，自动转文本\n• 记忆 — 调用记忆库中已有内容\n• 信息流 — 接入 RSS/GitHub 数据源",
    targetSelector: ".react-flow__node-input",
    placement: "right",
    tip: "每个工作流可以连接多个输入节点",
  },
  {
    title: "Agent 节点",
    content: "右键画布选择「Agent 节点」，从输入节点的右侧圆点拖线到 Agent 完成连接。\n\n• 在「想法」框写下创作指令\n• 可开启 dry-run 模式本地测试\n• 支持定时运行和矩阵模式",
    targetSelector: ".react-flow__node-agent",
    placement: "right",
    tip: "Agent 会把所有连入的输入内容整合为上下文",
  },
  {
    title: "输出节点",
    content: "右键画布选择「输出节点」，再从 Agent 拖线到输出节点。\n\n支持 6 个内容平台：\n• 知乎 — 长文专栏\n• 公众号 — 图文推送\n• 日记 — 口语化流水记录\n• 笔记 — 正式结构化记录\n• 小红书 — 图文笔记\n• 视频 — 竖版短视频",
    targetSelector: ".react-flow__node-output",
    placement: "left",
    tip: "可同时连多个输出节点，并行生成不同平台的内容",
  },
  {
    title: "运行工作流",
    content: "节点连好后，点击 Agent 节点上的「运行」按钮，或使用快捷键 ⌘↵（Ctrl+Enter）。\n\n输出节点会实时流式展示 AI 生成的内容。",
    targetSelector: ".react-flow__node-agent",
    placement: "right",
    tip: "Toolbar 的「运行全部」会同时触发画布上所有 Agent",
  },
  {
    title: "定时任务",
    content: "在 Agent 节点中开启「定时运行」开关，可设定自动执行周期（1h / 6h / 12h / 24h）。\n\n适合：定时抓取信息流 → 自动生成日报/周报。",
    targetSelector: ".react-flow__node-agent",
    placement: "right",
    tip: "开启后 Agent header 会显示「⏰ 下次 HH:MM」倒计时",
  },
  {
    title: "矩阵模式",
    content: "在 Agent 节点中开启「矩阵模式」，可同时以多个账号人设批量生成内容。\n\n需先在记忆库「人设」分类下保存账号人设，矩阵运行时会自动读取。",
    targetSelector: ".react-flow__node-agent",
    placement: "right",
    tip: "矩阵运行完成后可一键下载所有人设的输出内容（ZIP）",
  },
  {
    title: "记忆库",
    content: "点击左下角「记忆」按钮打开记忆库。\n\n分为 5 个分类：\n• 人设 — 账号定位和写作风格\n• 灵感 — 随手记录的想法\n• 素材 — 参考资料和数据\n• 作品 — 自动保存每次创作结果\n• 其他",
    targetSelector: ".tf-wf-sidebar__memory-btn",
    placement: "top",
    tip: "每次 Agent 运行完成后，输出内容会自动存入「作品」分类",
  },
  {
    title: "✓ 开始创作！",
    content: "你已了解 ThinkFlow 的全部核心功能。\n\n常用快捷键：\n• ⌘Z / ⌘⇧Z — 撤销 / 重做\n• ⌘↵ — 运行选中 Agent\n• ⌘A — 全选节点\n• 空格/H — 归位视图",
    targetSelector: null,
    placement: "fixed",
    fixedPos: CANVAS_TOP_LEFT,
    tip: "点 Toolbar「?」按钮可随时重启本教程",
  },
]

const PAD = 8
const CARD_W = 320
const CARD_H_EST = 380
const GAP = 14

// ─── 示例画布数据 ──────────────────────────────────────────────────────────────

function makeExampleNodes(
  inputType: string,
  inputValue: string,
  agentIdea: string,
  outputPlatform: string,
  extraOutputs?: Array<{ platform: string; offsetY: number }>,
  agentExtras?: Record<string, unknown>,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const inputId = `ex-input-${nanoid(4)}`
  const agentId = `ex-agent-${nanoid(4)}`
  const outputId = `ex-output-${nanoid(4)}`

  const nodes: FlowNode[] = [
    {
      id: inputId,
      type: "input",
      position: { x: -560, y: -160 },
      data: { inputType: inputType as "text", value: inputValue, label: "输入" },
      style: { width: 280 },
    } as FlowNode,
    {
      id: agentId,
      type: "agent",
      position: { x: -160, y: -160 },
      data: {
        idea: agentIdea,
        model: "moonshotai/kimi-k2.6",
        status: "idle",
        logs: [],
        dryRun: false,
        scheduleEnabled: false,
        scheduleTime: "09:00",
        matrixMode: false,
        matrixSlots: [
          { id: "slot-1", folderId: "folder-persona" },
          { id: "slot-2", folderId: "folder-persona" },
        ],
        ...agentExtras,
      },
      style: { width: 300 },
    } as FlowNode,
    {
      id: outputId,
      type: "output",
      position: { x: 280, y: -160 },
      data: { platform: outputPlatform as "zhihu", content: "", label: "输出", contentFormat: "auto" },
      style: { width: 320 },
    } as FlowNode,
  ]

  const edges: FlowEdge[] = [
    { id: `ex-e1-${nanoid(4)}`, source: inputId, target: agentId, animated: false },
    { id: `ex-e2-${nanoid(4)}`, source: agentId, target: outputId, animated: false },
  ]

  if (extraOutputs) {
    for (const extra of extraOutputs) {
      const extraId = `ex-out-${nanoid(4)}`
      nodes.push({
        id: extraId,
        type: "output",
        position: { x: 280, y: -160 + extra.offsetY },
        data: { platform: extra.platform as "wechat", content: "", label: "输出", contentFormat: "auto" },
        style: { width: 320 },
      } as FlowNode)
      edges.push({ id: `ex-e3-${nanoid(4)}`, source: agentId, target: extraId, animated: false })
    }
  }

  return { nodes, edges }
}

const EXAMPLE_SCENARIOS = [
  {
    icon: "📰",
    title: "公众号运营",
    desc: "粘贴文章或网页 URL，Agent 自动读取内容后，生成适配移动端的图文推送。",
    flow: "链接输入 → Agent → 公众号",
    detail: "适合内容创作者：每天粘贴一篇参考文章，Agent 帮你改写成公众号风格，省去排版烦恼。",
    getWorkflow: () => makeExampleNodes(
      "url",
      "https://example.com/article",
      "请将输入内容改写为适合微信公众号的图文推送。要求：标题吸引人，开头有钩子，正文分段清晰，结尾有互动引导。",
      "wechat",
    ),
  },
  {
    icon: "🧬",
    title: "矩阵运营",
    desc: "开启矩阵模式，一个 Agent 读取记忆库中多个人设，并发生成差异化内容，适合多账号同时运营。",
    flow: "文本输入 → Agent（矩阵）→ 小红书 × 3",
    detail: "适合多账号运营者：在记忆库「人设」分类保存各账号人设，矩阵运行时 AI 自动针对每个人设写出风格各异的内容。",
    getWorkflow: () => makeExampleNodes(
      "text",
      "今天分享一个关于早起习惯的心得体会",
      "根据账号人设，写一篇适合小红书的生活分享笔记。语气符合人设特点，配上合适的emoji，末尾加3-5个相关话题标签。",
      "xiaohongshu",
      [
        { platform: "xiaohongshu", offsetY: 220 },
        { platform: "xiaohongshu", offsetY: 440 },
      ],
      { matrixMode: true },
    ),
  },
  {
    icon: "📅",
    title: "定时日报",
    desc: "信息流输入接入 RSS/GitHub，开启 Agent 定时运行，每天自动抓取并生成日记或笔记。",
    flow: "信息流输入 → Agent（定时 24h）→ 日记输出",
    detail: "适合信息密集型用户：接入你关注的 RSS 源或 GitHub 动态，每天早上 9 点自动生成一篇精简日报。",
    getWorkflow: () => makeExampleNodes(
      "feed",
      "",
      "将今天抓取到的信息整理成一篇口语化的日记，记录今天有价值的内容和自己的感想，保持轻松自然的语气。",
      "diary",
      undefined,
      { scheduleEnabled: true, scheduleTime: "09:00" },
    ),
  },
  {
    icon: "🎬",
    title: "视频脚本生成",
    desc: "输入主题或文章链接，Agent 将内容转化为竖版短视频分镜脚本，自动分配布局，一键渲染 MP4。",
    flow: "文本/链接 → Agent → 视频输出 → 生成 MP4",
    detail: "适合短视频创作者：输入一个话题或文章，Agent 帮你设计分镜、写旁白文案，最后渲染带配音的竖版视频。",
    getWorkflow: () => makeExampleNodes(
      "text",
      "分享一个提高工作效率的实用技巧",
      "将输入内容制作为竖版短视频脚本。要求：3-5个分镜，每个分镜包含画面描述和旁白文案，总时长控制在60秒以内，风格简洁现代。",
      "video",
    ),
  },
]

export function TourGuide({ onClose }: TourGuideProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [showExampleModal, setShowExampleModal] = useState(false)
  const [loadedExample, setLoadedExample] = useState<string | null>(null)
  const loadExampleWorkflow = useCanvasStore((s) => s.loadExampleWorkflow)

  useEffect(() => {
    let cancelled = false

    const update = () => {
      const sel = TOUR_STEPS[step].targetSelector
      if (!sel) { setTargetRect(null); return }
      const el = document.querySelector(sel)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else {
        setTargetRect(null)
      }
    }

    let attempts = 0
    const tryUpdate = () => {
      if (cancelled) return
      const sel = TOUR_STEPS[step].targetSelector
      if (!sel) { update(); return }
      const el = document.querySelector(sel)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      } else if (attempts < 6) {
        attempts++
        setTimeout(tryUpdate, 100)
      }
    }
    tryUpdate()

    window.addEventListener("resize", update)
    return () => {
      cancelled = true
      window.removeEventListener("resize", update)
    }
  }, [step])

  function handleLoadExample(scenario: typeof EXAMPLE_SCENARIOS[0]) {
    const { nodes, edges } = scenario.getWorkflow()
    loadExampleWorkflow(scenario.title, nodes, edges)
    setLoadedExample(scenario.title)
    setTimeout(() => setLoadedExample(null), 2000)
    setShowExampleModal(false)
    onClose()
  }

  function cardStyle(s: TourStep, r: DOMRect | null): CSSProperties {
    if (s.placement === "fixed") return s.fixedPos ?? CANVAS_TOP_LEFT

    const vw = window.innerWidth
    const vh = window.innerHeight
    const clampL = (v: number) => Math.max(16, Math.min(v, vw - CARD_W - 16))
    const clampT = (v: number) => Math.max(16, Math.min(v, vh - CARD_H_EST - 16))

    if (!r) return CANVAS_TOP_LEFT

    switch (s.placement) {
      case "bottom":
        return { top: clampT(r.bottom + GAP), left: clampL(r.left + r.width / 2 - CARD_W / 2) }
      case "top":
        return { top: clampT(r.top - GAP - CARD_H_EST), left: clampL(r.left + r.width / 2 - CARD_W / 2) }
      case "right":
        return { top: clampT(r.top + r.height / 2 - CARD_H_EST / 2), left: clampL(r.right + GAP) }
      case "left": {
        const leftPref = r.left - GAP - CARD_W
        const left = leftPref >= 16 ? leftPref : clampL(r.right + GAP)
        return { top: clampT(r.top + r.height / 2 - CARD_H_EST / 2), left }
      }
    }
  }

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  return createPortal(
    <>
      <div className="tf-tour-overlay" />

      {targetRect && (
        <div
          className="tf-tour-spotlight"
          style={{
            top: targetRect.top - PAD,
            left: targetRect.left - PAD,
            width: targetRect.width + PAD * 2,
            height: targetRect.height + PAD * 2,
          }}
        />
      )}

      <div className="tf-tour-card" style={cardStyle(current, targetRect)}>
        <div className="tf-tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span key={i} className={`tf-tour-dot${i === step ? " tf-tour-dot--active" : ""}`} />
          ))}
        </div>

        <div className="tf-tour-card__step">第 {step + 1} 步 / {TOUR_STEPS.length}</div>
        <div className="tf-tour-card__title">{current.title}</div>
        <div className="tf-tour-card__content">{current.content}</div>
        {current.tip && <div className="tf-tour-card__tip">{current.tip}</div>}

        <div className="tf-tour-card__actions">
          <button className="tf-btn tf-btn-ghost" onClick={onClose}>跳过</button>
          <button className="tf-btn tf-btn-ghost" onClick={() => setShowExampleModal(true)}>查看示例</button>
          {isLast ? (
            <button className="tf-btn tf-btn-primary" onClick={onClose}>开始创作</button>
          ) : (
            <button className="tf-btn tf-btn-primary" onClick={() => setStep((s) => s + 1)}>下一步 →</button>
          )}
        </div>
      </div>

      {loadedExample && (
        <div style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          background: "var(--accent)",
          color: "#fff",
          padding: "8px 20px",
          borderRadius: "var(--radius-md)",
          fontSize: 13,
          fontWeight: 600,
          zIndex: 10001,
          pointerEvents: "none",
        }}>
          ✓ 已创建「{loadedExample}」示例画布
        </div>
      )}

      {showExampleModal && (
        <div
          className="tf-modal-overlay"
          style={{ zIndex: 10000 }}
          onClick={() => setShowExampleModal(false)}
        >
          <div
            className="tf-modal"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tf-modal__header">
              <span style={{ fontWeight: 700, fontSize: 15 }}>使用场景示例</span>
              <button
                className="tf-btn tf-btn-ghost"
                style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={() => setShowExampleModal(false)}
              >
                关闭
              </button>
            </div>
            <div className="tf-modal__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              {EXAMPLE_SCENARIOS.map((s) => (
                <div
                  key={s.title}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{s.title}</span>
                    </div>
                    <button
                      className="tf-btn tf-btn-primary"
                      style={{ padding: "4px 12px", fontSize: 12, flexShrink: 0 }}
                      onClick={() => handleLoadExample(s)}
                    >
                      创建此画布
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 var(--space-2) 0" }}>
                    {s.desc}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary, var(--text-secondary))", lineHeight: 1.6, margin: "0 0 var(--space-2) 0", fontStyle: "italic" }}>
                    {s.detail}
                  </p>
                  <div style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 10px",
                    fontFamily: "var(--font-code)",
                    fontSize: 11,
                    color: "var(--accent)",
                  }}>
                    {s.flow}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
