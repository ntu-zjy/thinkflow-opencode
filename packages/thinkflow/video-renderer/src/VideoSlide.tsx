import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile, Easing } from "remotion"
import React from "react"

export interface SlideData {
  title: string
  voiceover: string
  audioFile: string
  background: string
  durationInFrames: number
  layout?: "default" | "bold" | "split" | "quote" | "list"
}

interface Props {
  slides: SlideData[]
}

// ─── 公共类型 ───────────────────────────────────────────────────────────────

interface LayoutProps {
  slide: SlideData
  slideIndex: number
  totalSlides: number
  fadeIn: number
  titleSlide: number
  captionSlide: number
  captionFade: number
  badgePop: number
}

// ─── 公共底部进度条 ──────────────────────────────────────────────────────────

function ProgressBar({ slideIndex, totalSlides }: { slideIndex: number; totalSlides: number }) {
  const w = ((slideIndex + 1) / totalSlides) * 100
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6, background: "rgba(255,255,255,0.15)" }}>
      <div style={{
        position: "absolute", left: 0, top: 0, height: "100%",
        width: `${w}%`, background: "rgba(255,255,255,0.6)", borderRadius: "0 3px 3px 0",
      }} />
    </div>
  )
}

// ─── 装饰圆圈配置 ─────────────────────────────────────────────────────────────

const DECORATION_CIRCLES = [
  { cx: "10%",  cy: "15%", r: 180, opacity: 0.08 },
  { cx: "88%",  cy: "8%",  r: 120, opacity: 0.12 },
  { cx: "5%",   cy: "55%", r: 90,  opacity: 0.07 },
  { cx: "92%",  cy: "42%", r: 200, opacity: 0.06 },
  { cx: "50%",  cy: "28%", r: 60,  opacity: 0.09 },
  { cx: "75%",  cy: "72%", r: 140, opacity: 0.08 },
  { cx: "20%",  cy: "85%", r: 100, opacity: 0.06 },
]

// ─── 布局 1：Default（原版，渐变背景+装饰圆圈+序号徽章+底部字幕） ────────────

function DefaultLayout({ slide, slideIndex, totalSlides, fadeIn, titleSlide, captionSlide, captionFade, badgePop }: LayoutProps) {
  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      {/* 背景装饰圆圈 */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
        {DECORATION_CIRCLES.map((c, i) => (
          <circle key={i} cx={c.cx} cy={c.cy} r={c.r} fill="white" opacity={c.opacity * fadeIn} style={{ filter: "blur(1px)" }} />
        ))}
        <line x1="860" y1="1700" x2="1080" y2="1550" stroke="white" strokeWidth="1.5" opacity={0.12 * fadeIn} />
        <line x1="900" y1="1750" x2="1080" y2="1620" stroke="white" strokeWidth="1.5" opacity={0.08 * fadeIn} />
        <line x1="0" y1="120" x2="200" y2="0" stroke="white" strokeWidth="1.5" opacity={0.10 * fadeIn} />
      </svg>

      {/* 序号徽章 */}
      <div style={{
        position: "absolute", top: 100, left: 72,
        width: 80, height: 80, borderRadius: "50%",
        background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: fadeIn, transform: `scale(${badgePop})`,
      }}>
        <span style={{ color: "white", fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
          {String(slideIndex + 1).padStart(2, "0")}
        </span>
      </div>

      {/* 主标题区域 */}
      <div style={{ position: "absolute", top: "22%", left: 0, right: 0, padding: "0 80px", opacity: fadeIn, transform: `translateY(${titleSlide}px)` }}>
        <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.7)", borderRadius: 2, marginBottom: 20 }} />
        <div style={{ color: "white", fontSize: 76, fontWeight: 900, lineHeight: 1.2, textShadow: "0 4px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)", letterSpacing: "-1px" }}>
          {slide.title}
        </div>
        <div style={{ width: 120, height: 3, background: "rgba(255,255,255,0.4)", borderRadius: 2, marginTop: 24 }} />
      </div>

      {/* 中间视觉隔断 */}
      <div style={{
        position: "absolute", top: "50%", left: 80, right: 80, height: 1,
        background: "linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)",
        opacity: fadeIn * 0.6,
      }} />

      {/* 底部字幕栏 */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 0 120px 0",
        background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)",
        opacity: captionFade, transform: `translateY(${captionSlide}px)`,
      }}>
        <div style={{ padding: "0 72px" }}>
          <div style={{
            display: "inline-block", background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.3)", borderRadius: 100,
            padding: "6px 20px", marginBottom: 16,
          }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 24, letterSpacing: "2px" }}>旁白</span>
          </div>
          <div style={{ color: "white", fontSize: 46, lineHeight: 1.65, fontWeight: 500, textShadow: "0 2px 12px rgba(0,0,0,0.8)", letterSpacing: "0.5px" }}>
            {slide.voiceover}
          </div>
        </div>
      </div>

      <ProgressBar slideIndex={slideIndex} totalSlides={totalSlides} />
    </AbsoluteFill>
  )
}

// ─── 布局 2：Bold（超大全屏标题，极简冲击力） ────────────────────────────────

function BoldLayout({ slide, slideIndex, totalSlides, fadeIn }: LayoutProps) {
  const fontSize = slide.title.length <= 4 ? 180 : slide.title.length <= 8 ? 130 : 88
  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      {/* 全屏居中超大标题 */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "0 60px", opacity: fadeIn, gap: 48,
      }}>
        <div style={{
          color: "white", fontSize, fontWeight: 900, lineHeight: 1.1,
          textAlign: "center", textShadow: "0 8px 48px rgba(0,0,0,0.5)",
          letterSpacing: "-2px", wordBreak: "break-all",
        }}>
          {slide.title}
        </div>
        {/* 字幕行（小字，在大标题下方） */}
        <div style={{
          color: "rgba(255,255,255,0.65)", fontSize: 38, lineHeight: 1.5,
          textAlign: "center", fontWeight: 400, letterSpacing: "1px",
        }}>
          {slide.voiceover}
        </div>
      </div>

      <ProgressBar slideIndex={slideIndex} totalSlides={totalSlides} />
    </AbsoluteFill>
  )
}

// ─── 布局 3：Split（上半标题 + 分割线 + 下半字幕） ───────────────────────────

function SplitLayout({ slide, slideIndex, totalSlides, fadeIn, titleSlide, captionSlide, captionFade }: LayoutProps) {
  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      {/* 上半：标题 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 72px", opacity: fadeIn, transform: `translateY(${titleSlide}px)`,
      }}>
        <div style={{
          color: "white", fontSize: 80, fontWeight: 900, lineHeight: 1.2,
          textAlign: "center", textShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {slide.title}
        </div>
      </div>

      {/* 中间分割线 */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        height: 2, background: "rgba(255,255,255,0.3)", opacity: fadeIn,
      }} />

      {/* 下半：字幕（黑色半透明底） */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center",
        padding: "0 72px",
        opacity: captionFade, transform: `translateY(${captionSlide}px)`,
      }}>
        <div style={{ color: "white", fontSize: 50, lineHeight: 1.65, fontWeight: 400, letterSpacing: "0.5px" }}>
          {slide.voiceover}
        </div>
      </div>

      <ProgressBar slideIndex={slideIndex} totalSlides={totalSlides} />
    </AbsoluteFill>
  )
}

// ─── 布局 4：Quote（引言风格，大引号装饰） ───────────────────────────────────

function QuoteLayout({ slide, slideIndex, totalSlides, fadeIn }: LayoutProps) {
  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 100px", opacity: fadeIn, gap: 40,
      }}>
        {/* 大引号装饰（左上角） */}
        <div style={{
          color: "rgba(255,255,255,0.2)", fontSize: 240, fontWeight: 900,
          lineHeight: 0.5, alignSelf: "flex-start",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          "
        </div>
        {/* 斜体居中字幕 */}
        <div style={{
          color: "white", fontSize: 56, lineHeight: 1.7, fontWeight: 400,
          fontStyle: "italic", textAlign: "center",
          textShadow: "0 2px 16px rgba(0,0,0,0.6)",
          marginTop: -80,
        }}>
          {slide.voiceover}
        </div>
        {/* 标题作为来源标注（右下） */}
        <div style={{
          color: "rgba(255,255,255,0.6)", fontSize: 30, letterSpacing: "3px",
          alignSelf: "flex-end", fontStyle: "normal",
        }}>
          — {slide.title}
        </div>
      </div>

      <ProgressBar slideIndex={slideIndex} totalSlides={totalSlides} />
    </AbsoluteFill>
  )
}

// ─── 布局 5：List（顶部标题 + voiceover 分割为编号要点） ──────────────────────

function ListLayout({ slide, slideIndex, totalSlides, fadeIn, titleSlide }: LayoutProps) {
  // 按句号/逗号/换行分割为要点
  const points = slide.voiceover
    .split(/[。，,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      {/* 顶部标题 */}
      <div style={{
        position: "absolute", top: 160, left: 0, right: 0,
        padding: "0 80px", opacity: fadeIn, transform: `translateY(${titleSlide}px)`,
      }}>
        <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.7)", borderRadius: 2, marginBottom: 24 }} />
        <div style={{
          color: "white", fontSize: 72, fontWeight: 900, lineHeight: 1.2,
          textShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {slide.title}
        </div>
      </div>

      {/* 要点列表 */}
      <div style={{
        position: "absolute", top: "42%", left: 80, right: 80,
        display: "flex", flexDirection: "column", gap: 32,
        opacity: fadeIn,
      }}>
        {points.map((point, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "rgba(255,255,255,0.2)", border: "1.5px solid rgba(255,255,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>{i + 1}</span>
            </div>
            <div style={{
              color: "white", fontSize: 44, lineHeight: 1.5, fontWeight: 400,
              textShadow: "0 2px 8px rgba(0,0,0,0.5)",
            }}>
              {point}
            </div>
          </div>
        ))}
      </div>

      <ProgressBar slideIndex={slideIndex} totalSlides={totalSlides} />
    </AbsoluteFill>
  )
}

// ─── 轮转顺序（不含 list，list 需 AI 显式指定） ────────────────────────────────

const LAYOUT_CYCLE = ["default", "bold", "split", "quote"] as const

// ─── SingleSlide：计算动画参数并分发布局 ─────────────────────────────────────

function SingleSlide({
  slide,
  slideIndex,
  totalSlides,
}: {
  slide: SlideData
  slideIndex: number
  totalSlides: number
}) {
  // Sequence 内部 useCurrentFrame() 已自动归零，直接用即可
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // ── 统一动画参数 ─────────────────────────────────────────────────────────────
  const fadeIn = interpolate(frame, [0, Math.min(fps * 0.4, 12)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const titleSlide = interpolate(frame, [0, Math.min(fps * 0.5, 15)], [-50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const captionDelay = Math.round(fps * 0.12)
  const captionSlide = interpolate(
    frame,
    [captionDelay, captionDelay + Math.min(fps * 0.5, 15)],
    [60, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  )
  const captionFade = interpolate(
    frame,
    [captionDelay, captionDelay + Math.min(fps * 0.4, 12)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )
  const badgePop = interpolate(frame, [0, Math.min(fps * 0.35, 10)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  })

  const layoutProps: LayoutProps = { slide, slideIndex, totalSlides, fadeIn, titleSlide, captionSlide, captionFade, badgePop }

  // 优先用 slide.layout，否则按序号轮转
  const effectiveLayout = slide.layout ?? LAYOUT_CYCLE[slideIndex % LAYOUT_CYCLE.length]

  switch (effectiveLayout) {
    case "bold":  return <BoldLayout {...layoutProps} />
    case "split": return <SplitLayout {...layoutProps} />
    case "quote": return <QuoteLayout {...layoutProps} />
    case "list":  return <ListLayout {...layoutProps} />
    default:      return <DefaultLayout {...layoutProps} />
  }
}

// ─── 主组件：按帧偏移分发各分镜 ──────────────────────────────────────────────

export function VideoSlide({ slides }: Props) {
  let accumulated = 0
  const slideOffsets: number[] = []
  for (const s of slides) {
    slideOffsets.push(accumulated)
    accumulated += s.durationInFrames
  }

  return (
    <AbsoluteFill>
      {slides.map((slide, idx) => (
        <Sequence key={idx} from={slideOffsets[idx]} durationInFrames={slide.durationInFrames}>
          <SingleSlide
            slide={slide}
            slideIndex={idx}
            totalSlides={slides.length}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
