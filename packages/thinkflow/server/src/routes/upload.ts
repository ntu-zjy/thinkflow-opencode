import { Hono } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { uploadBase64Image } from "../lib/s3"
import { sql } from "../db"

const upload = new Hono()

upload.use("*", requireAuth)

// POST /upload/image
// Body: { base64: string, folder?: string }
// Returns: { url: string }
upload.post("/image", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => null) as Record<string, unknown> | null
  if (!raw?.base64 || typeof raw.base64 !== "string") {
    return c.json({ error: "base64 字段必填" }, 400)
  }

  // 限制大小：base64 字符数 / 1.33 ≈ 字节数，限 8MB
  if (raw.base64.length > 8 * 1024 * 1024 * 1.4) {
    return c.json({ error: "图片超过 8MB 限制" }, 413)
  }

  const folder = typeof raw.folder === "string" ? raw.folder : "images"

  const url = await uploadBase64Image(raw.base64, folder).catch((e: Error) => {
    console.error("[upload] S3 上传失败:", e.message)
    return null
  })

  if (!url) return c.json({ error: "上传失败，请稍后重试" }, 500)

  // 记录到 assets 表（可选，用于资产管理）
  await sql`
    INSERT INTO assets (user_id, url, type)
    VALUES (${jwt.sub}, ${url}, 'image')
  `.catch(() => {})

  return c.json({ url })
})

export default upload
