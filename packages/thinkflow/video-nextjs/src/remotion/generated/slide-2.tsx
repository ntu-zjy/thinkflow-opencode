import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 2，audioFile: "output-1-1777939709388-audio-2.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const quoteScale = interpolate(frame, [fps * 0.2, fps * 0.8], [0.5, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #2d132c, #801336, #c72c41)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <div style={{ fontSize: 240, color: 'rgba(255,255,255,0.15)', fontWeight: 900, lineHeight: 1, transform: `scale(${quoteScale})`, opacity }}>"</div>
      <div style={{ color: 'white', fontSize: 52, fontStyle: 'italic', fontWeight: 600, textAlign: 'center', padding: '0 80px', opacity, marginTop: -40 }}>
        它不仅是工具<br/>更是思维的延伸
      </div>
    </AbsoluteFill>
  )
}
