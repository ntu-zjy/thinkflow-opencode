import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile, Easing } from "remotion"
import React from "react"

export interface SlideData {
  title: string
  voiceover: string
  audioFile: string
  background: string
  durationInFrames: number
}

interface Props {
  slides: SlideData[]
}

// 装饰圆圈配置
const DECORATION_CIRCLES = [
  { cx: "10%",  cy: "15%", r: 180, opacity: 0.08 },
  { cx: "88%",  cy: "8%",  r: 120, opacity: 0.12 },
  { cx: "5%",   cy: "55%", r: 90,  opacity: 0.07 },
  { cx: "92%",  cy: "42%", r: 200, opacity: 0.06 },
  { cx: "50%",  cy: "28%", r: 60,  opacity: 0.09 },
  { cx: "75%",  cy: "72%", r: 140, opacity: 0.08 },
  { cx: "20%",  cy: "85%", r: 100, opacity: 0.06 },
]

function SingleSlide({
  slide,
  globalStartFrame,
  slideIndex,
  totalSlides,
}: {
  slide: SlideData
  globalStartFrame: number
  slideIndex: number
  totalSlides: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - globalStartFrame

  // ── 淡入动画 ─────────────────────────────────────────────────────────────
  const fadeIn = interpolate(localFrame, [0, Math.min(fps * 0.4, 12)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  // 标题从上方滑入
  const titleSlide = interpolate(localFrame, [0, Math.min(fps * 0.5, 15)], [-50, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  // 字幕从下方滑入（稍微延迟）
  const captionDelay = Math.round(fps * 0.12)
  const captionSlide = interpolate(
    localFrame,
    [captionDelay, captionDelay + Math.min(fps * 0.5, 15)],
    [60, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) },
  )
  const captionFade = interpolate(
    localFrame,
    [captionDelay, captionDelay + Math.min(fps * 0.4, 12)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )

  // 序号徽章动画
  const badgePop = interpolate(localFrame, [0, Math.min(fps * 0.35, 10)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1), // 弹性
  })

  // 底部进度条
  const progressWidth = ((slideIndex + 1) / totalSlides) * 100

  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "'PingFang SC', 'Helvetica Neue', sans-serif", overflow: "hidden" }}>

      {/* 音频 */}
      {slide.audioFile && <Audio src={staticFile(slide.audioFile)} startFrom={0} />}

      {/* ── 背景装饰圆圈 ─────────────────────────────────────────────────── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
      >
        {DECORATION_CIRCLES.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={c.r}
            fill="white"
            opacity={c.opacity * fadeIn}
            style={{ filter: "blur(1px)" }}
          />
        ))}
        {/* 右下角装饰线条 */}
        <line x1="860" y1="1700" x2="1080" y2="1550" stroke="white" strokeWidth="1.5" opacity={0.12 * fadeIn} />
        <line x1="900" y1="1750" x2="1080" y2="1620" stroke="white" strokeWidth="1.5" opacity={0.08 * fadeIn} />
        {/* 左上角装饰线条 */}
        <line x1="0" y1="120" x2="200" y2="0" stroke="white" strokeWidth="1.5" opacity={0.10 * fadeIn} />
      </svg>

      {/* ── 序号徽章 ──────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 72,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.18)",
          border: "2px solid rgba(255,255,255,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: fadeIn,
          transform: `scale(${badgePop})`,
        }}
      >
        <span style={{ color: "white", fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
          {String(slideIndex + 1).padStart(2, "0")}
        </span>
      </div>

      {/* ── 主标题区域 ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          left: 0,
          right: 0,
          padding: "0 80px",
          opacity: fadeIn,
          transform: `translateY(${titleSlide}px)`,
        }}
      >
        {/* 标题上方装饰横线 */}
        <div
          style={{
            width: 60,
            height: 4,
            background: "rgba(255,255,255,0.7)",
            borderRadius: 2,
            marginBottom: 20,
          }}
        />
        <div
          style={{
            color: "white",
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.2,
            textShadow: "0 4px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)",
            letterSpacing: "-1px",
          }}
        >
          {slide.title}
        </div>
        {/* 标题下方装饰横线 */}
        <div
          style={{
            width: 120,
            height: 3,
            background: "rgba(255,255,255,0.4)",
            borderRadius: 2,
            marginTop: 24,
          }}
        />
      </div>

      {/* ── 中间视觉隔断 ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 80,
          right: 80,
          height: 1,
          background: "linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)",
          opacity: fadeIn * 0.6,
        }}
      />

      {/* ── 底部字幕栏 ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 0 120px 0",
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)",
          opacity: captionFade,
          transform: `translateY(${captionSlide}px)`,
        }}
      >
        <div style={{ padding: "0 72px" }}>
          {/* 旁白标签 */}
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 100,
              padding: "6px 20px",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 24, letterSpacing: "2px" }}>旁白</span>
          </div>
          {/* 旁白正文 */}
          <div
            style={{
              color: "white",
              fontSize: 46,
              lineHeight: 1.65,
              fontWeight: 500,
              textShadow: "0 2px 12px rgba(0,0,0,0.8)",
              letterSpacing: "0.5px",
            }}
          >
            {slide.voiceover}
          </div>
        </div>
      </div>

      {/* ── 底部进度指示器 ────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          background: "rgba(255,255,255,0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${progressWidth}%`,
            background: "rgba(255,255,255,0.6)",
            borderRadius: "0 3px 3px 0",
          }}
        />
      </div>
    </AbsoluteFill>
  )
}

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
            globalStartFrame={slideOffsets[idx]}
            slideIndex={idx}
            totalSlides={slides.length}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
