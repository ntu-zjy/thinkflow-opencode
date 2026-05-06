import React from "react"
import { AbsoluteFill, interpolate, Easing, staticFile } from "remotion"

interface SlideProps {
  frame: number
  fps: number
  durationInFrames: number
  audioFile: string
}

// Agent 生成的分镜组件（index: 4，audioFile: "output-1-1777939709388-audio-4.mp3"）
export default function Slide({ frame, fps, durationInFrames }: SlideProps) {
  const textY = interpolate(frame, [0, fps * 0.6], [50, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const circle1X = interpolate(frame, [0, durationInFrames], [-100, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const circle2X = interpolate(frame, [0, durationInFrames], [100, -100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #000000, #434343, #000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(233, 69, 96, 0.2)', transform: `translateX(${circle1X}px)`, top: 200 }}></div>
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(15, 52, 96, 0.3)', transform: `translateX(${circle2X}px)`, bottom: 300 }}></div>
      <div style={{ position: 'absolute', width: 150, height: 150, border: '3px solid rgba(255,255,255,0.1)', transform: `rotate(${frame * 0.5}deg)`, top: 400, right: 150 }}></div>
      <div style={{ color: 'white', fontSize: 100, fontWeight: 900, textAlign: 'center', transform: `translateY(${textY}px)`, opacity, zIndex: 10 }}>
        未来已来
      </div>
      <div style={{ position: 'absolute', bottom: 400, color: '#e94560', fontSize: 48, fontWeight: 700, opacity, zIndex: 10 }}>
        你准备好了吗？
      </div>
    </AbsoluteFill>
  )
}
