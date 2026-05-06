// Agent 生成的每个分镜组件必须满足此接口
// 文件由 render-worker 写入 generated/slide-{i}.tsx，每个文件 export default 一个组件

export interface SlideProps {
  frame: number           // 当前帧（0 = 该分镜第一帧）
  fps: number             // 帧率（固定 30）
  durationInFrames: number // 该分镜总帧数
  audioFile: string       // 音频文件名（可能为空字符串）
}

// 可用的 Remotion 工具（Agent 代码中直接解构使用）：
// import { AbsoluteFill, Audio, interpolate, Easing, staticFile, useCurrentFrame, useVideoConfig } from "remotion"
// 注意：Agent 代码已在 Sequence 内部，useCurrentFrame() 返回分镜局部帧（从 0 开始）
// 但 Agent 代码通过 props.frame 获取帧，不用 useCurrentFrame()（已由外层注入）
