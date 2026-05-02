import { useState, useEffect, type CSSProperties } from "react"
import { createPortal } from "react-dom"

interface TourGuideProps {
  onClose: () => void
}

interface TourStep {
  title: string
  content: string
  targetSelector: string
  placement: "top" | "bottom" | "left" | "right"
  tip?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "第 1 步：添加输入节点",
    content: "右键画布空白区域，在菜单中选择\n「输入节点」，创建你的第一个节点。\n\n输入节点可以是文本、链接、文件等内容。",
    targetSelector: ".react-flow__pane",
    placement: "right",
    tip: "输入节点支持文本、链接、文件、记忆、信息流五种类型",
  },
  {
    title: "第 2 步：添加 Agent 节点",
    content: "再次右键画布，选择「Agent 节点」。\n然后从输入节点的右侧圆点拖线到\nAgent，完成连接。",
    targetSelector: ".react-flow__pane",
    placement: "right",
    tip: "在 Agent 的「想法」框中写下你想创作的主题或指令",
  },
  {
    title: "第 3 步：添加输出平台",
    content: "右键画布，选择「输出节点」，选择\n一个平台（如知乎、公众号）。\n同样从 Agent 拖线连到输出节点。",
    targetSelector: ".react-flow__pane",
    placement: "right",
    tip: "可以同时添加多个输出节点，并行生成不同平台的内容",
  },
  {
    title: "第 4 步：运行工作流",
    content: "点击 Agent 节点上的「运行」按钮，\n或使用快捷键 ⌘↵（Ctrl+Enter）。\n输出节点会实时展示 AI 生成的内容！",
    targetSelector: ".react-flow__node-agent",
    placement: "bottom",
    tip: "开启「dry-run」模式可在不调用真实 AI 的情况下测试流程",
  },
  {
    title: "✓ 你已上手 ThinkFlow！",
    content: "恭喜完成新手教程！继续探索更多功能：\n• 记忆面板 — 保存灵感和账号人设\n• 矩阵模式 — 批量生成多账号内容\n• 定时任务 — 自动运行工作流",
    targetSelector: ".react-flow__renderer",
    placement: "bottom",
    tip: "⌘Z 撤销 · 空格/H 归位 · ⌘A 全选 · 点 ? 按钮重启教程",
  },
]

const PAD = 8
const CARD_WIDTH = 320
const CARD_OFFSET = 16

export function TourGuide({ onClose }: TourGuideProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(TOUR_STEPS[step].targetSelector)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [step])

  function getCardStyle(placement: TourStep["placement"], r: DOMRect | null): CSSProperties {
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (!r) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
    }

    switch (placement) {
      case "right": {
        const left = Math.min(r.right + CARD_OFFSET, vw - CARD_WIDTH - 16)
        const top = Math.max(16, Math.min(r.top + r.height / 2 - 100, vh - 320))
        return { top, left }
      }
      case "left": {
        const left = Math.max(16, r.left - CARD_WIDTH - CARD_OFFSET)
        const top = Math.max(16, Math.min(r.top + r.height / 2 - 100, vh - 320))
        return { top, left }
      }
      case "bottom": {
        const left = Math.max(16, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - 16))
        const top = Math.min(r.bottom + CARD_OFFSET, vh - 320)
        return { top, left }
      }
      case "top": {
        const left = Math.max(16, Math.min(r.left + r.width / 2 - CARD_WIDTH / 2, vw - CARD_WIDTH - 16))
        const top = Math.max(16, r.top - CARD_OFFSET - 300)
        return { top, left }
      }
    }
  }

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  return createPortal(
    <>
      {/* 全屏可点击遮罩（不阻断点击，教程期间允许操作画布） */}
      <div className="tf-tour-overlay" />

      {/* 镂空聚光灯 */}
      {rect && (
        <div
          className="tf-tour-spotlight"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      {/* 步骤对话框 */}
      <div className="tf-tour-card" style={getCardStyle(current.placement, rect)}>
        {/* 进度点 */}
        <div className="tf-tour-dots">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tf-tour-dot${i === step ? " tf-tour-dot--active" : ""}`}
            />
          ))}
        </div>

        <div className="tf-tour-card__step">第 {step + 1} 步 / {TOUR_STEPS.length}</div>
        <div className="tf-tour-card__title">{current.title}</div>
        <div className="tf-tour-card__content">{current.content}</div>

        {current.tip && (
          <div className="tf-tour-card__tip">{current.tip}</div>
        )}

        <div className="tf-tour-card__actions">
          <button className="tf-btn tf-btn-ghost" onClick={onClose}>
            跳过
          </button>
          {isLast ? (
            <button className="tf-btn tf-btn-primary" onClick={onClose}>
              开始探索
            </button>
          ) : (
            <button className="tf-btn tf-btn-primary" onClick={() => setStep((s) => s + 1)}>
              下一步 →
            </button>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
