import { AbsoluteFill, Audio, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile, Easing } from "remotion"
import React from "react"

export interface SlideData {
  title: string
  voiceover: string
  audioFile: string        // 文件名，对应 public/ 目录下的 mp3
  background: string       // CSS gradient
  durationInFrames: number
}

interface Props {
  slides: SlideData[]
}

function SingleSlide({ slide, globalStartFrame }: { slide: SlideData; globalStartFrame: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // 相对于本 Sequence 起始的帧数
  const localFrame = frame - globalStartFrame

  const opacity = interpolate(localFrame, [0, Math.min(fps * 0.5, 15)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })
  const slideUp = interpolate(localFrame, [0, Math.min(fps * 0.5, 15)], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  })

  return (
    <AbsoluteFill style={{ background: slide.background, fontFamily: "sans-serif" }}>
      {slide.audioFile && (
        <Audio src={staticFile(slide.audioFile)} startFrom={0} />
      )}

      {/* 标题 */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          width: "100%",
          textAlign: "center",
          color: "white",
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.3,
          padding: "0 80px",
          opacity,
          transform: `translateY(${slideUp}px)`,
          textShadow: "0 4px 24px rgba(0,0,0,0.5)",
          boxSizing: "border-box",
        }}
      >
        {slide.title}
      </div>

      {/* 底部字幕渐变栏 */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "40px 60px 80px",
          background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
          opacity,
          transform: `translateY(${slideUp * 0.5}px)`,
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 44,
            lineHeight: 1.6,
            textAlign: "center",
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {slide.voiceover}
        </div>
      </div>
    </AbsoluteFill>
  )
}

export function VideoSlide({ slides }: Props) {
  // 计算每个 slide 的起始帧
  let accumulated = 0
  const slideOffsets: number[] = []
  for (const s of slides) {
    slideOffsets.push(accumulated)
    accumulated += s.durationInFrames
  }

  return (
    <AbsoluteFill>
      {slides.map((slide, idx) => (
        <Sequence
          key={idx}
          from={slideOffsets[idx]}
          durationInFrames={slide.durationInFrames}
        >
          <SingleSlide slide={slide} globalStartFrame={slideOffsets[idx]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
