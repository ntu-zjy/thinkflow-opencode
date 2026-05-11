import { Hono } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { sql } from "../db"

const credits = new Hono()

// ─── 积分消耗定义 ─────────────────────────────────────────────────────────────
// 计费单位：以"次"为单位，不管图片生成几张都算1次
export const CREDIT_COST = {
  text: 8,    // 文字生成 1 次（知乎/公众号/日记等，成本¥0.48，毛利38%）
  image: 18,  // 图文生成 1 次（小红书，最多6张图，成本¥1.32，毛利38%）
} as const

// 内测每日赠送积分
export const DAILY_FREE_CREDITS = 30

export type RunType = keyof typeof CREDIT_COST

// ─── 辅助：读取用户当前可用积分（日常 + 永久），并自动重置每日积分 ──────────
export async function getUserCredits(userId: string): Promise<{
  daily: number
  permanent: number
  total: number
  plan: string
}> {
  const today = new Date().toISOString().slice(0, 10)

  // 若今天还没重置，先重置每日积分（免费用户 20，订阅用户 0）
  await sql`
    UPDATE users
    SET
      credits_daily = CASE WHEN plan = 'free' THEN 30 ELSE 0 END,
      credits_daily_reset_at = ${today}
    WHERE id = ${userId}
      AND credits_daily_reset_at < ${today}
  `

  const rows = await sql`
    SELECT credits_daily, credits_permanent, plan
    FROM users WHERE id = ${userId}
  `
  const u = rows[0]
  if (!u) return { daily: 0, permanent: 0, total: 0, plan: "free" }

  const daily = u.credits_daily as number
  const permanent = u.credits_permanent as number
  return { daily, permanent, total: daily + permanent, plan: u.plan as string }
}

// ─── 辅助：原子扣积分（先扣每日，不足再扣永久），返回是否成功 ───────────────
export async function deductCredits(userId: string, cost: number, reason: string): Promise<boolean> {
  // 在单个事务里完成：读取 → 校验 → 扣除 → 记流水
  const result = await sql.begin(async (tx) => {
    const today = new Date().toISOString().slice(0, 10)

    // 先做每日重置（幂等）
    await tx`
      UPDATE users
      SET
        credits_daily = CASE WHEN plan = 'free' THEN 30 ELSE 0 END,
        credits_daily_reset_at = ${today}
      WHERE id = ${userId}
        AND credits_daily_reset_at < ${today}
    `

    const rows = await tx`
      SELECT credits_daily, credits_permanent FROM users WHERE id = ${userId} FOR UPDATE
    `
    const u = rows[0]
    if (!u) return false

    const daily = u.credits_daily as number
    const permanent = u.credits_permanent as number
    const total = daily + permanent
    if (total < cost) return false

    // 先扣每日，不足再扣永久
    const deductDaily = Math.min(daily, cost)
    const deductPermanent = cost - deductDaily

    await tx`
      UPDATE users
      SET
        credits_daily = credits_daily - ${deductDaily},
        credits_permanent = credits_permanent - ${deductPermanent}
      WHERE id = ${userId}
    `

    await tx`
      INSERT INTO credit_transactions (user_id, delta, reason)
      VALUES (${userId}, ${-cost}, ${reason})
    `

    return true
  })

  return result ?? false
}

// ─── 辅助：退还积分（仅退回永久积分，日常积分已消耗） ────────────────────────
export async function refundCredits(userId: string, cost: number, reason: string): Promise<void> {
  await sql`
    UPDATE users SET credits_permanent = credits_permanent + ${cost} WHERE id = ${userId}
  `
  await sql`
    INSERT INTO credit_transactions (user_id, delta, reason)
    VALUES (${userId}, ${cost}, ${reason})
  `
}

// ─── GET /credits — 查询当前用户积分 ─────────────────────────────────────────
credits.get("/", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const info = await getUserCredits(jwt.sub)
  return c.json(info)
})

// ─── POST /credits/check — 预检：积分是否够用（不扣除）────────────────────────
credits.post("/check", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const runType = typeof raw.runType === "string" ? raw.runType as RunType : "text"
  const count = typeof raw.count === "number" ? raw.count : 1

  if (!(runType in CREDIT_COST)) return c.json({ error: "无效的运行类型" }, 400)

  const cost = CREDIT_COST[runType] * count
  const info = await getUserCredits(jwt.sub)

  return c.json({
    ok: info.total >= cost,
    required: cost,
    available: info.total,
    daily: info.daily,
    permanent: info.permanent,
  })
})

// ─── POST /credits/deduct — 扣积分（运行前调用） ─────────────────────────────
credits.post("/deduct", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const runType = typeof raw.runType === "string" ? raw.runType as RunType : "text"
  const count = typeof raw.count === "number" ? raw.count : 1

  if (!(runType in CREDIT_COST)) return c.json({ error: "无效的运行类型" }, 400)

  const cost = CREDIT_COST[runType] * count
  const reason = `run_${runType}`
  const ok = await deductCredits(jwt.sub, cost, reason)

  if (!ok) {
    const info = await getUserCredits(jwt.sub)
    return c.json({
      error: "积分不足",
      required: cost,
      available: info.total,
    }, 402)
  }

  const info = await getUserCredits(jwt.sub)
  return c.json({ ok: true, deducted: cost, remaining: info.total })
})

// ─── POST /credits/refund — 退还积分（运行失败时调用） ───────────────────────
credits.post("/refund", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const runType = typeof raw.runType === "string" ? raw.runType as RunType : "text"
  const count = typeof raw.count === "number" ? raw.count : 1

  if (!(runType in CREDIT_COST)) return c.json({ error: "无效的运行类型" }, 400)

  const cost = CREDIT_COST[runType] * count
  await refundCredits(jwt.sub, cost, `refund_${runType}`)

  return c.json({ ok: true, refunded: cost })
})

export default credits
