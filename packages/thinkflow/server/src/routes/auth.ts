import { Hono } from "hono"
import { hash, compare } from "bcryptjs"
import { sign } from "hono/jwt"
import { sql } from "../db"
import { requireAuth, getJwtSecret } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { getUserCredits } from "./credits"

const auth = new Hono()

// POST /auth/register
auth.post("/register", async (c) => {
  const raw = await c.req.json().catch(() => null)
  if (!raw || typeof raw !== "object") return c.json({ error: "请求格式错误" }, 400)
  const body = raw as Record<string, unknown>
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "邮箱格式不正确" }, 400)
  }
  if (!password || password.length < 6) {
    return c.json({ error: "密码至少 6 位" }, 400)
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`.catch(() => [])
  if (existing.length > 0) {
    return c.json({ error: "邮箱已被注册" }, 409)
  }

  const passwordHash = await hash(password, 10)
  const rows = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email, plan
  `
  const user = rows[0]
  const creditsInfo = await getUserCredits(user.id as string)

  const payload: JwtPayload = {
    sub: user.id as string,
    email: user.email as string,
    plan: user.plan as string,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }
  const token = await sign(payload, getJwtSecret(), "HS256")

  return c.json({
    token,
    user: { id: user.id, email: user.email, plan: user.plan, credits: creditsInfo.total },
  }, 201)
})

// POST /auth/login
auth.post("/login", async (c) => {
  const raw = await c.req.json().catch(() => null)
  if (!raw || typeof raw !== "object") return c.json({ error: "请求格式错误" }, 400)
  const body = raw as Record<string, unknown>
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return c.json({ error: "请填写邮箱和密码" }, 400)
  }

  const rows = await sql`SELECT id, email, password_hash, plan FROM users WHERE email = ${email}`
  const user = rows[0]

  if (!user) return c.json({ error: "邮箱或密码不正确" }, 401)

  const ok = await compare(password, user.password_hash as string)
  if (!ok) return c.json({ error: "邮箱或密码不正确" }, 401)

  // getUserCredits 内部会自动触发每日重置
  const creditsInfo = await getUserCredits(user.id as string)

  const payload: JwtPayload = {
    sub: user.id as string,
    email: user.email as string,
    plan: user.plan as string,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
  }
  const token = await sign(payload, getJwtSecret(), "HS256")

  return c.json({
    token,
    user: { id: user.id, email: user.email, plan: user.plan, credits: creditsInfo.total },
  })
})

// GET /auth/me
auth.get("/me", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const rows = await sql`SELECT id, email, display_name, plan, created_at FROM users WHERE id = ${jwt.sub}`
  const user = rows[0]
  if (!user) return c.json({ error: "用户不存在" }, 404)

  const creditsInfo = await getUserCredits(jwt.sub)

  return c.json({
    id: user.id,
    email: user.email,
    display_name: user.display_name ?? null,
    plan: user.plan,
    credits: creditsInfo.total,
    credits_daily: creditsInfo.daily,
    credits_permanent: creditsInfo.permanent,
    created_at: user.created_at,
  })
})

// PATCH /auth/profile — 修改显示名（不支持改密码，出于安全考虑需单独流程）
auth.patch("/profile", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => null)
  if (!raw || typeof raw !== "object") return c.json({ error: "请求格式错误" }, 400)
  const body = raw as Record<string, unknown>

  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 32) : null
  if (displayName === null) return c.json({ error: "display_name 不能为空" }, 400)

  await sql`UPDATE users SET display_name = ${displayName} WHERE id = ${jwt.sub}`
  return c.json({ ok: true, display_name: displayName })
})

// POST /auth/create-super — 创建或重置超级测试账号（仅开发环境可用）
auth.post("/create-super", async (c) => {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_SUPER_ACCOUNT) {
    return c.json({ error: "仅开发环境可用" }, 403)
  }

  const SUPER_EMAIL = "super@thinkflow.dev"
  const SUPER_PASSWORD = "thinkflow2026"
  const passwordHash = await hash(SUPER_PASSWORD, 10)

  // upsert：已存在则重置积分和 plan，不存在则新建
  await sql`
    INSERT INTO users (email, password_hash, plan, credits_permanent, credits_daily)
    VALUES (${SUPER_EMAIL}, ${passwordHash}, 'subscriber', 999, 30)
    ON CONFLICT (email) DO UPDATE SET
      password_hash    = EXCLUDED.password_hash,
      plan             = 'subscriber',
      credits_permanent = 999,
      credits_daily    = 30,
      credits_daily_reset_at = CURRENT_DATE
  `

  const rows = await sql`SELECT id, email, plan FROM users WHERE email = ${SUPER_EMAIL}`
  const user = rows[0]
  const creditsInfo = await getUserCredits(user.id as string)

  const payload: JwtPayload = {
    sub: user.id as string,
    email: user.email as string,
    plan: user.plan as string,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1年
  }
  const token = await sign(payload, getJwtSecret(), "HS256")

  return c.json({
    token,
    user: { id: user.id, email: user.email, plan: user.plan, credits: creditsInfo.total },
    credentials: { email: SUPER_EMAIL, password: SUPER_PASSWORD },
  }, 201)
})

export default auth
