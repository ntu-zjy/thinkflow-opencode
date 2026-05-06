import { NextRequest } from "next/server"
import { resolve, join } from "path"
import { existsSync, createReadStream, statSync } from "fs"
import { tmpdir } from "os"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await params
  if (!videoId) return new Response("missing videoId", { status: 400 })

  const tmpDir = resolve(tmpdir(), `thinkflow-video-${videoId}`)
  const videoPath = join(tmpDir, "output.mp4")
  if (!existsSync(videoPath)) return new Response("not found", { status: 404 })

  const stat = statSync(videoPath)
  const stream = createReadStream(videoPath) as unknown as ReadableStream

  return new Response(stream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="thinkflow-video.mp4"`,
    },
  })
}
