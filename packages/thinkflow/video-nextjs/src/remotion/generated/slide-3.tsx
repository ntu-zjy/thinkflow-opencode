import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 3，audioFile: "output-1-1777939709388-audio-3.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const titleOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const item1Y = interpolate(frame, [fps * 0.3, fps * 0.8], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const item2Y = interpolate(frame, [fps * 0.5, fps * 1.0], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const item3Y = interpolate(frame, [fps * 0.7, fps * 1.2], [100, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1b262c, #0f4c75, #3282b8)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 160 }}>
      <div style={{ color: 'white', fontSize: 64, fontWeight: 800, marginBottom: 80, opacity: titleOpacity }}>AI三大应用</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'flex-start', width: 800 }}>
        <div style={{ color: 'white', fontSize: 48, fontWeight: 700, transform: `translateY(${item1Y}px)`, opacity: interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <span style={{ color: '#bbe1fa', marginRight: 20 }}>01</span>医疗诊断
        </div>
        <div style={{ color: 'white', fontSize: 48, fontWeight: 700, transform: `translateY(${item2Y}px)`, opacity: interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <span style={{ color: '#bbe1fa', marginRight: 20 }}>02</span>自动驾驶
        </div>
        <div style={{ color: 'white', fontSize: 48, fontWeight: 700, transform: `translateY(${item3Y}px)`, opacity: interpolate(frame, [fps * 0.7, fps * 1.2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <span style={{ color: '#bbe1fa', marginRight: 20 }}>03</span>创意生成
        </div>
      </div>
    </AbsoluteFill>
  )
}
