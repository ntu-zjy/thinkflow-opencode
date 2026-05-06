import { VideoLogo } from "./logos"
import { registerCard } from "./registry"

// 视频平台的完整指令（与 canvasStore 原有逻辑保持一致）
const VIDEO_INSTRUCTION = `你是一个视频创作专家。请根据输入内容，在 packages/thinkflow/video-nextjs/ 目录下创作并渲染一段有配音的竖版短视频（1080×1920，30fps）。

## 完整工作流程

### 第一步：规划分镜
为内容规划 5-7 个分镜，每个分镜包含：
- 旁白文字（10-20字，口语化，适合 TTS）
- 视觉风格描述

### 第二步：生成 TTS 配音
为每个分镜用 edge-tts 生成 mp3，保存到 packages/thinkflow/video-nextjs/public/ 目录：
\`\`\`bash
cd packages/thinkflow/video-nextjs
mkdir -p public out
edge-tts --voice zh-CN-XiaoxiaoNeural --text "分镜1旁白文字" --write-media public/audio-0.mp3
edge-tts --voice zh-CN-XiaoxiaoNeural --text "分镜2旁白文字" --write-media public/audio-1.mp3
# ... 每个分镜都生成一个 mp3
\`\`\`

用 ffprobe 获取每段音频的时长（秒），分镜帧数 = ceil((时长 + 0.3) * 30)：
\`\`\`bash
ffprobe -v quiet -print_format json -show_format public/audio-0.mp3
\`\`\`

### 第三步：修改 VideoComposition.tsx
在 packages/thinkflow/video-nextjs/src/remotion/VideoComposition.tsx 中，为每个分镜添加 Audio 组件播放对应的 mp3：
\`\`\`tsx
import { AbsoluteFill, Audio, Sequence, useCurrentFrame, interpolate, Easing, staticFile } from "remotion"

// 每个分镜组件内部加：
<Audio src={staticFile("audio-0.mp3")} />
\`\`\`
每个分镜的 durationInFrames 要和对应音频时长匹配。

### 第四步：修改 Root.tsx
设置总 durationInFrames = 所有分镜帧数之和。

### 第五步：确认浏览器并渲染视频
\`\`\`bash
cd packages/thinkflow/video-nextjs

if [ -d "node_modules/.remotion/chrome-headless-shell" ]; then
  npx remotion render VideoComposition out/video.mp4
else
  npx remotion browser ensure 2>&1
  if [ -d "node_modules/.remotion/chrome-headless-shell" ]; then
    npx remotion render VideoComposition out/video.mp4
  elif [ -f "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; then
    npx remotion render VideoComposition out/video.mp4 --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  else
    echo "错误：未找到可用浏览器"
    exit 1
  fi
fi
\`\`\`

### 第六步：完成
输出以下 JSON（不加 markdown 代码块）：
{"title":"视频标题","outputPath":"packages/thinkflow/video-nextjs/out/video.mp4"}

## 重要约束
- 视频必须有配音，每个分镜对应一段 TTS 音频
- 音频文件放在 packages/thinkflow/video-nextjs/public/ 目录下
- 动画只用 interpolate() + useCurrentFrame()，不用 CSS transitions/animations
- 渲染时优先使用 Remotion 自带的 chrome-headless-shell`

registerCard({
  key: "video",
  label: "视频",
  LogoComponent: VideoLogo,
  color: "#b06060",
  darkColor: "#c08080",
  bgColor: "rgba(176,96,96,0.06)",
  borderColor: "rgba(176,96,96,0.25)",
  darkBgColor: "rgba(192,128,128,0.08)",
  darkBorderColor: "rgba(192,128,128,0.35)",
  defaultInstruction: (_fmt) => VIDEO_INSTRUCTION,
  supportedFormats: ["auto"],
})
