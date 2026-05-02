import { useState, useEffect, type CSSProperties } from "react"
import { createPortal } from "react-dom"

interface TourGuideProps {
  onClose: () => void
}

interface TourStep {
  title: string
  content: string
  // 要高亮的元素选择器，null 表示无高亮（全屏遮罩）
  targetSelector: string | null
  // 卡片相对于高亮元素的位置；"center" 表示屏幕正中
  placement: "top" | "bottom" | "left" | "right" | "center"
  tip?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "第 1 步：添加输入节点",
    content: "在画布上右键，选择「输入节点」，然后选择类型（文本/链接/文件等），创建第一个节点。",
    targetSelector: ".tf-toolbar",
    placement: "bottom",
    tip: "输入节点支持文本、链接、文件、记忆、信息流五种类型",
  },
  {
    title: "第 2 步：添加 Agent 节点",
    content: "再次右键画布，选择「Agent 节点」。\n\n然后从输入节点右侧的圆形连接点拖线到 Agent，建立连接。",
    targetSelector: ".tf-toolbar",
    placement: "bottom",
    tip: "Agent 的「想法」输入框里写下你想创作的主题或指令",
  },
  {
    title: "第 3 步：添加输出平台",
    content: "右键画布，选择「输出节点」，选择平台（知乎/公众号/日记/小红书）。\n\n同样从 Agent 拖线连到输出节点。",
    targetSelector: ".tf-toolbar",
    placement: "bottom",
    tip: "可同时添加多个输出节点，并行生成不同平台的内容",
  },
  {
    title: "第 4 步：运行工作流",
    content: "点击 Agent 节点上的「运行」按钮，或使用快捷键 ⌘↵（Ctrl+Enter）。\n\n输出节点会实时展示 AI 生成的内容！",
    // 优先高亮 Agent 节点，找不到时退回到 Toolbar
    targetSelector: ".react-flow__node-agent",
    placement: "left",
    tip: "开启「dry-run」模式可在不调用真实 AI 的情况下测试流程",
  },
  {
    title: "✓ 你已上手 ThinkFlow！",
    content: "恭喜完成新手教程！继续探索更多功能：\n• 记忆面板 — 保存灵感和账号人设\n• 矩阵模式 — 批量生成多账号内容\n• 定时任务 — 自动运行工作流",
    targetSelector: null,
    placement: "center",
    tip: "⌘Z 撤销 · 空格/H 归位 · ⌘A 全选 · 点 Toolbar「?」按钮重启教程",
  },
]

const PAD = 8
const CARD_W = 320
const CARD_H_EST = 280 // 估算高度，用于边界计算
const GAP = 14

export function TourGuide({ onClose }: TourGuideProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    const update = () => {
      const sel = TOUR_STEPS[step].targetSelector
      if (!sel) {
        setTargetRect(null)
        return
      }
      const el = document.querySelector(sel)
      // 第4步：若找不到 agent 节点，fallback 到 toolbar
      if (!el && sel === ".react-flow__node-agent") {
        const fallback = document.querySelector(".tf-toolbar")
        setTargetRect(fallback ? fallback.getBoundingClientRect() : null)
      } else {
        setTargetRect(el ? el.getBoundingClientRect() : null)
      }
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [step])

  function cardStyle(placement: TourStep["placement"], r: DOMRect | null): CSSProperties {
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (placement === "center" || !r) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }
    }

    // 辅助：把 left 夹在合理范围内
    const clampLeft = (v: number) => Math.max(16, Math.min(v, vw - CARD_W - 16))
    // 辅助：把 top 夹在合理范围内
    const clampTop = (v: number) => Math.max(16, Math.min(v, vh - CARD_H_EST - 16))

    switch (placement) {
      case "bottom":
        return {
          top: clampTop(r.bottom + GAP),
          left: clampLeft(r.left + r.width / 2 - CARD_W / 2),
        }
      case "top":
        return {
          top: clampTop(r.top - GAP - CARD_H_EST),
          left: clampLeft(r.left + r.width / 2 - CARD_W / 2),
        }
      case "right":
        return {
          top: clampTop(r.top + r.height / 2 - CARD_H_EST / 2),
          left: clampLeft(r.right + GAP),
        }
      case "left": {
        // 卡片在目标左侧；如果左侧空间不足则改为右侧
        const leftCandidate = r.left - GAP - CARD_W
        const left = leftCandidate >= 16 ? leftCandidate : clampLeft(r.right + GAP)
        return {
          top: clampTop(r.top + r.height / 2 - CARD_H_EST / 2),
          left,
        }
      }
    }
  }

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  return createPortal(
    <>
      {/* 半透明遮罩（pointer-events: none，不阻断画布操作） */}
      <div className="tf-tour-overlay" />

      {/* 镂空聚光灯 — 只在有目标元素时显示 */}
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

      {/* 步骤卡片 */}
      <div className="tf-tour-card" style={cardStyle(current.placement, targetRect)}>
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
