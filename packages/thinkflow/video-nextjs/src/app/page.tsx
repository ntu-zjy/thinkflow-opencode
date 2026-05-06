export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>ThinkFlow Video Renderer</h1>
      <p>API 端点：</p>
      <ul>
        <li><code>POST /api/render</code> — 提交视频生成任务（SSE 进度流）</li>
        <li><code>GET /api/video-file/:videoId</code> — 下载生成的 MP4</li>
      </ul>
    </main>
  )
}
