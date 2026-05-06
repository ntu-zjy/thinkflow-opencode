import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 5，audioFile: "output-1-1777939709388-audio-5.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const opacity = interpolate(frame, [0, fps * 0.5], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 80, fontWeight: 900, textAlign: 'center', opacity, transform: `scale(${scale})` }}>
        拥抱AI<br/>
        <span style={{ fontSize: 48, fontWeight: 600, color: '#e94560' }}>共创智能未来</span>
      </div>
    </AbsoluteFill>
  )
}
