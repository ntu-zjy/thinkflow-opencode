import type { Context, Next } from "hono"
import { verify, sign } from "hono/jwt"

const JWT_SECRET = process.env.JWT_SECRET ?? "thinkflow_dev_secret_change_in_production"

export interface JwtPayload {
  sub: string    // user id
  email: string
  plan: string
  exp: number
  [key: string]: unknown  // hono JWTPayload index signature
}

export async function requireAuth(c: Context, next: Next) {
  const auth = c.req.header("Authorization")
  if (!auth?.startsWith("Bearer ")) {
    return c.json({ error: "未授权" }, 401)
  }
  const token = auth.slice(7)
  const payload = await verify(token, JWT_SECRET, "HS256").catch(() => null)
  if (!payload) return c.json({ error: "Token 无效或已过期" }, 401)
  c.set("jwtPayload", payload as JwtPayload)
  await next()
}

export { sign }

export function getJwtSecret() {
  return JWT_SECRET
}
