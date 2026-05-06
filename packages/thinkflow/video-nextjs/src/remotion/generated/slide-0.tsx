import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 0，audioFile: "output-1-1777939709388-audio-0.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const scale = interpolate(frame, [0, fps * 0.5], [0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'white', fontSize: 140, fontWeight: 900, transform: `scale(${scale})`, opacity, textAlign: 'center', lineHeight: 1.2 }}>
        AI<br/>时代
      </div>
    </AbsoluteFill>
  )
}
