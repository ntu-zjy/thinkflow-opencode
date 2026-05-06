// 每个分镜的输入数据
export interface VideoSlide {
  voiceover: string       // TTS 旁白文本
  durationHint?: number   // 建议秒数（不提供则从 TTS 音频时长自动推断）
  slideCode: string       // Agent 生成的 TSX 组件体（字符串），函数签名见 SlideProps
}

export interface VideoScript {
  title: string
  slides: VideoSlide[]
}

// render-worker 使用的增强类型（TTS 处理后填入）
export interface EnrichedSlide extends VideoSlide {
  audioFile: string           // 音频文件名（public/ 目录下），无音频时为空字符串
  durationInFrames: number    // 实际帧数（= ceil((audioDuration + 0.3) * fps)）
}
