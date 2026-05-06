import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 1，audioFile: "output-1-1777939709388-audio-1.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const circleY = interpolate(frame, [0, durationInFrames], [100, 150], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #1a1a2e, #16213e, #0f3460)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={{ position: 'absolute', top: circleY, right: 100, opacity: 0.3 }} width="200" height="200">
        <circle cx="100" cy="100" r="80" fill="none" stroke="#e94560" strokeWidth="3"/>
      </svg>
      <svg style={{ position: 'absolute', bottom: 200, left: 80, opacity: 0.2 }} width="150" height="150">
        <circle cx="75" cy="75" r="60" fill="none" stroke="#0f3460" strokeWidth="2"/>
      </svg>
      <div style={{ color: 'white', fontSize: 80, fontWeight: 800, opacity, marginBottom: 40 }}>人工智能</div>
      <div style={{ color: '#e94560', fontSize: 36, opacity, fontWeight: 600 }}>正在重塑我们的世界</div>
      <div style={{ position: 'absolute', bottom: 120, color: 'rgba(255,255,255,0.6)', fontSize: 28, opacity }}>旁白：人工智能正在重塑我们的世界</div>
    </AbsoluteFill>
  )
}
