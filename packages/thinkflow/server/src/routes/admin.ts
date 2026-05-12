import { Hono } from "hono"
import type { MiddlewareHandler } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { sql } from "../db"

const admin = new Hono()

// 管理员邮箱白名单（后续可改为数据库 role 字段）
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "super@thinkflow.dev").split(",").map((s) => s.trim())

const requireAdmin: MiddlewareHandler = async (c, next) => {
  await requireAuth(c, async () => {})
  const jwt = c.get("jwtPayload") as JwtPayload | undefined
  if (!jwt?.email || !ADMIN_EMAILS.includes(jwt.email)) {
    return c.json({ error: "无权限" }, 403)
  }
  await next()
}

admin.use("*", requireAdmin)

// GET /admin/stats — 总览统计
admin.get("/stats", async (c) => {
  const [users, canvases, txns, plans] = await Promise.all([
    sql`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') AS new_7d, COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '30 days') AS new_30d FROM users`,
    sql`SELECT COUNT(*) AS total FROM canvases`,
    sql`SELECT COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_text'), 0) AS text_credits, COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_image'), 0) AS image_credits, COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_video'), 0) AS video_credits, COALESCE(SUM(delta) FILTER (WHERE delta > 0 AND reason LIKE 'purchase%'), 0) AS credits_sold FROM credit_transactions`,
    sql`SELECT plan, COUNT(*) AS count FROM users GROUP BY plan ORDER BY plan`,
  ])

  return c.json({
    users: {
      total: Number(users[0].total),
      new_7d: Number(users[0].new_7d),
      new_30d: Number(users[0].new_30d),
    },
    canvases: { total: Number(canvases[0].total) },
    credits: {
      text_consumed: Number(txns[0].text_credits),
      image_consumed: Number(txns[0].image_credits),
      video_consumed: Number(txns[0].video_credits),
      sold: Number(txns[0].credits_sold),
    },
    plans: Object.fromEntries((plans as unknown as Array<{ plan: string; count: string }>).map((r) => [r.plan, Number(r.count)])),
  })
})

// GET /admin/users — 用户列表（分页）
admin.get("/users", async (c) => {
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1"))
  const limit = Math.min(50, Math.max(1, parseInt(c.req.query("limit") ?? "20")))
  const offset = (page - 1) * limit
  const search = c.req.query("q")?.trim() ?? ""

  const rows = await (search
    ? sql`
        SELECT id, email, display_name, plan, credits_daily, credits_permanent, created_at
        FROM users
        WHERE email ILIKE ${"%" + search + "%"}
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`
    : sql`
        SELECT id, email, display_name, plan, credits_daily, credits_permanent, created_at
        FROM users
        ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`)

  const countResult = await (search
    ? sql`SELECT COUNT(*) AS c FROM users WHERE email ILIKE ${"%" + search + "%"}`
    : sql`SELECT COUNT(*) AS c FROM users`)
  const total = Number(countResult[0].c)

  return c.json({ users: rows, total, page, limit })
})

// GET /admin/credits — 积分流水（最近 100 条）
admin.get("/credits", async (c) => {
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "50")))
  const reason = c.req.query("reason")

  const rows = await (reason
    ? sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id WHERE ct.reason = ${reason} ORDER BY ct.created_at DESC LIMIT ${limit}`
    : sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id ORDER BY ct.created_at DESC LIMIT ${limit}`)

  return c.json({ transactions: rows })
})

// GET /admin/revenue — 收入估算（基于积分流水中 purchase 类型）
admin.get("/revenue", async (c) => {
  const rows = await sql`
    SELECT
      DATE_TRUNC('day', created_at) AS day,
      COUNT(*) AS txn_count,
      SUM(delta) AS credits_added
    FROM credit_transactions
    WHERE reason = 'purchase' AND delta > 0
    GROUP BY day
    ORDER BY day DESC
    LIMIT 30
  `
  return c.json({ daily: rows })
})

// PATCH /admin/users/:id/credits — 手动调整用户积分
admin.patch("/users/:id/credits", async (c) => {
  const userId = c.req.param("id")
  const raw = await c.req.json().catch(() => null) as Record<string, unknown> | null
  if (!raw) return c.json({ error: "请求格式错误" }, 400)

  const delta = typeof raw.delta === "number" ? Math.trunc(raw.delta) : null
  const reason = typeof raw.reason === "string" ? raw.reason : "admin_adjust"
  if (delta === null || delta === 0) return c.json({ error: "delta 必须为非零整数" }, 400)

  const existing = await sql`SELECT id FROM users WHERE id = ${userId}`
  if (!existing[0]) return c.json({ error: "用户不存在" }, 404)

  if (delta > 0) {
    await sql`UPDATE users SET credits_permanent = credits_permanent + ${delta} WHERE id = ${userId}`
  } else {
    await sql`UPDATE users SET credits_permanent = GREATEST(0, credits_permanent + ${delta}) WHERE id = ${userId}`
  }
  await sql`INSERT INTO credit_transactions (user_id, delta, reason) VALUES (${userId}, ${delta}, ${reason})`

  const updated = await sql`SELECT credits_daily, credits_permanent FROM users WHERE id = ${userId}`
  return c.json({ ok: true, updated: updated[0] })
})

export default admin
