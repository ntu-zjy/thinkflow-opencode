import React from "react"
import { Composition } from "remotion"
import { VideoComposition } from "./VideoComposition"

export function Root() {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition}
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={949}
    />
  )
}
