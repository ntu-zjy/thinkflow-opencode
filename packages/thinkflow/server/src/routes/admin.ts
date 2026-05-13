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

// GET /admin/stats — 总览统计（成本从 usage_records 取真实数据）
admin.get("/stats", async (c) => {
  const [users, canvases, txns, plans, usageStats] = await Promise.all([
    sql`SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '7 days') AS new_7d,
          COUNT(*) FILTER (WHERE created_at > now() - INTERVAL '30 days') AS new_30d
        FROM users`,
    sql`SELECT COUNT(*) AS total FROM canvases`,
    sql`SELECT
          COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_text'), 0)  AS text_credits,
          COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_image'), 0) AS image_credits,
          COALESCE(SUM(ABS(delta)) FILTER (WHERE delta < 0 AND reason = 'run_video'), 0) AS video_credits,
          COALESCE(SUM(delta)      FILTER (WHERE delta > 0 AND reason LIKE 'purchase%' AND reason NOT LIKE 'mock_%'), 0) AS credits_sold
        FROM credit_transactions`,
    sql`SELECT plan, COUNT(*) AS count FROM users GROUP BY plan ORDER BY plan`,
    sql`SELECT
          run_type,
          COUNT(*)                          AS runs,
          COALESCE(SUM(tokens_input), 0)        AS tokens_input,
          COALESCE(SUM(tokens_output), 0)       AS tokens_output,
          COALESCE(SUM(tokens_cache_read), 0)   AS tokens_cache_read,
          COALESCE(SUM(tokens_cache_write), 0)  AS tokens_cache_write,
          COALESCE(SUM(cost_usd), 0)            AS cost_usd
        FROM usage_records
        GROUP BY run_type`,
  ])

  type UsageRow = { run_type: string; runs: string; tokens_input: string; tokens_output: string; tokens_cache_read: string; tokens_cache_write: string; cost_usd: string }
  const byType: Record<string, UsageRow> = {}
  for (const r of usageStats as unknown as UsageRow[]) byType[r.run_type] = r

  const get = (t: string, f: keyof UsageRow) => Number(byType[t]?.[f] ?? 0)

  const creditsSold = Number(txns[0].credits_sold)
  const revenue     = +(creditsSold * 0.1).toFixed(2)
  const costText    = +get("text",  "cost_usd").toFixed(4)
  const costImage   = +get("image", "cost_usd").toFixed(4)
  const costVideo   = +get("video", "cost_usd").toFixed(4)
  // 美元转人民币（汇率约 7.2，保守用 7）
  const CNY_RATE = 7
  const totalCostCny = +((costText + costImage + costVideo) * CNY_RATE).toFixed(2)
  const profit   = +(revenue - totalCostCny).toFixed(2)

  return c.json({
    users: {
      total: Number(users[0].total),
      new_7d: Number(users[0].new_7d),
      new_30d: Number(users[0].new_30d),
    },
    canvases: { total: Number(canvases[0].total) },
    credits: {
      text_consumed:  Number(txns[0].text_credits),
      image_consumed: Number(txns[0].image_credits),
      video_consumed: Number(txns[0].video_credits),
      sold: creditsSold,
    },
    usage: {
      text:  { runs: get("text",  "runs"), tokens_input: get("text",  "tokens_input"), tokens_output: get("text",  "tokens_output"), tokens_cache_read: get("text",  "tokens_cache_read"), cost_usd: costText  },
      image: { runs: get("image", "runs"), tokens_input: get("image", "tokens_input"), tokens_output: get("image", "tokens_output"), tokens_cache_read: get("image", "tokens_cache_read"), cost_usd: costImage },
      video: { runs: get("video", "runs"), tokens_input: get("video", "tokens_input"), tokens_output: get("video", "tokens_output"), tokens_cache_read: get("video", "tokens_cache_read"), cost_usd: costVideo },
    },
    financials: {
      revenue,
      cost_usd: +(costText + costImage + costVideo).toFixed(4),
      cost_cny: totalCostCny,
      profit,
      margin: revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0,
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

  // mock_purchase 做前缀匹配，其余精确匹配
  const rows = await (reason
    ? reason === "mock_purchase"
      ? sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id WHERE ct.reason LIKE 'mock_purchase%' ORDER BY ct.created_at DESC LIMIT ${limit}`
      : reason === "purchase"
        ? sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id WHERE ct.reason LIKE 'purchase%' AND ct.reason NOT LIKE 'mock_%' ORDER BY ct.created_at DESC LIMIT ${limit}`
        : sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id WHERE ct.reason = ${reason} ORDER BY ct.created_at DESC LIMIT ${limit}`
    : sql`SELECT ct.id, ct.delta, ct.reason, ct.created_at, u.email FROM credit_transactions ct JOIN users u ON u.id = ct.user_id ORDER BY ct.created_at DESC LIMIT ${limit}`)

  return c.json({ transactions: rows })
})

const CNY_RATE = 7  // 美元兑人民币保守汇率

// GET /admin/revenue — 收入 + 真实成本（按天，近 30 天）
admin.get("/revenue", async (c) => {
  const [income, costs] = await Promise.all([
    sql`
      SELECT
        DATE_TRUNC('day', created_at)::date AS day,
        COUNT(*) AS txn_count,
        SUM(delta) AS credits_added
      FROM credit_transactions
      WHERE reason LIKE 'purchase%' AND reason NOT LIKE 'mock_%' AND delta > 0
      GROUP BY day ORDER BY day DESC LIMIT 30`,
    sql`
      SELECT
        DATE_TRUNC('day', created_at)::date AS day,
        COALESCE(SUM(cost_usd) FILTER (WHERE run_type = 'text'),  0) AS text_cost_usd,
        COALESCE(SUM(cost_usd) FILTER (WHERE run_type = 'image'), 0) AS image_cost_usd,
        COALESCE(SUM(cost_usd) FILTER (WHERE run_type = 'video'), 0) AS video_cost_usd,
        COALESCE(SUM(tokens_input)       FILTER (WHERE run_type = 'text'),  0) AS text_tokens_in,
        COALESCE(SUM(tokens_output)      FILTER (WHERE run_type = 'text'),  0) AS text_tokens_out,
        COALESCE(SUM(tokens_cache_read)  FILTER (WHERE run_type = 'text'),  0) AS text_cache_read,
        COUNT(*) FILTER (WHERE run_type = 'text')  AS text_runs,
        COUNT(*) FILTER (WHERE run_type = 'image') AS image_runs,
        COUNT(*) FILTER (WHERE run_type = 'video') AS video_runs
      FROM usage_records
      WHERE created_at > now() - INTERVAL '30 days'
      GROUP BY day ORDER BY day DESC`,
  ])

  type CostRow = { day: string; text_cost_usd: string; image_cost_usd: string; video_cost_usd: string; text_tokens_in: string; text_tokens_out: string; text_cache_read: string; text_runs: string; image_runs: string; video_runs: string }
  const costMap = new Map((costs as unknown as CostRow[]).map((r) => [
    String(r.day).slice(0, 10),
    {
      cost_usd: Number(r.text_cost_usd) + Number(r.image_cost_usd) + Number(r.video_cost_usd),
      text_runs: Number(r.text_runs),
      image_runs: Number(r.image_runs),
      video_runs: Number(r.video_runs),
      text_tokens_in: Number(r.text_tokens_in),
      text_tokens_out: Number(r.text_tokens_out),
      text_cache_read: Number(r.text_cache_read),
    },
  ]))

  const daily = (income as unknown as Array<{ day: string; txn_count: string; credits_added: string }>).map((r) => {
    const day = String(r.day).slice(0, 10)
    const revenue = +(Number(r.credits_added) * 0.1).toFixed(2)
    const c = costMap.get(day) ?? { cost_usd: 0, text_runs: 0, image_runs: 0, video_runs: 0, text_tokens_in: 0, text_tokens_out: 0, text_cache_read: 0 }
    const cost_cny = +(c.cost_usd * CNY_RATE).toFixed(2)
    return {
      day,
      txn_count: Number(r.txn_count),
      credits_added: Number(r.credits_added),
      revenue,
      cost_usd: +c.cost_usd.toFixed(4),
      cost_cny,
      profit: +(revenue - cost_cny).toFixed(2),
      text_runs: c.text_runs,
      image_runs: c.image_runs,
      video_runs: c.video_runs,
      text_tokens_in: c.text_tokens_in,
      text_tokens_out: c.text_tokens_out,
      text_cache_read: c.text_cache_read,
    }
  })

  return c.json({ daily })
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
