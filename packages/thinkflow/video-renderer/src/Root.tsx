import React from "react"
import { Composition } from "remotion"
import { VideoSlide } from "./VideoSlide"
import type { SlideData } from "./VideoSlide"

const DEFAULT_SLIDES: SlideData[] = [
  {
    title: "示例分镜",
    voiceover: "这是示例旁白文字",
    audioFile: "",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    durationInFrames: 300,
  },
]

export function Root() {
  return (
    <Composition
      id="VideoSlide"
      component={VideoSlide}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={300}
      defaultProps={{ slides: DEFAULT_SLIDES }}
    />
  )
}
