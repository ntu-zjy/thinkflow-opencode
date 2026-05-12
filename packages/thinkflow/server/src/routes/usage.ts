import { Hono } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { sql } from "../db"

const usage = new Hono()

// POST /usage/record
// 前端每次生成完成后调用，写入真实 tokens + cost
// Body: { run_type, model?, tokens_input, tokens_output, tokens_cache_read?, tokens_cache_write?, cost_usd }
usage.post("/record", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => null) as Record<string, unknown> | null
  if (!raw) return c.json({ error: "请求格式错误" }, 400)

  const run_type = typeof raw.run_type === "string" ? raw.run_type : null
  if (!run_type || !["text", "image", "video"].includes(run_type)) {
    return c.json({ error: "run_type 必须为 text / image / video" }, 400)
  }

  const tokens_input       = typeof raw.tokens_input === "number"       ? Math.round(raw.tokens_input)       : 0
  const tokens_output      = typeof raw.tokens_output === "number"      ? Math.round(raw.tokens_output)      : 0
  const tokens_cache_read  = typeof raw.tokens_cache_read === "number"  ? Math.round(raw.tokens_cache_read)  : 0
  const tokens_cache_write = typeof raw.tokens_cache_write === "number" ? Math.round(raw.tokens_cache_write) : 0
  const cost_usd           = typeof raw.cost_usd === "number"           ? raw.cost_usd                       : 0
  const model              = typeof raw.model === "string"              ? raw.model                          : null

  await sql`
    INSERT INTO usage_records
      (user_id, run_type, model, tokens_input, tokens_output, tokens_cache_read, tokens_cache_write, cost_usd)
    VALUES
      (${jwt.sub}, ${run_type}, ${model}, ${tokens_input}, ${tokens_output}, ${tokens_cache_read}, ${tokens_cache_write}, ${cost_usd})
  `

  return c.json({ ok: true })
})

export default usage
