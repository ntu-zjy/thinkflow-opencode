import { Hono } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { sql } from "../db"

const pay = new Hono()

const ZPAY_PID = process.env.ZPAY_PID ?? ""
const ZPAY_KEY = process.env.ZPAY_KEY ?? ""
const ZPAY_API = process.env.ZPAY_API ?? "https://zpayz.cn/submit.php"
const SITE_URL = process.env.SITE_URL ?? "https://thinkflow.app"

type PlanType = "subscription" | "credits"

interface Plan {
  name: string
  price: string
  type: PlanType
  credits?: number       // 充入的永久积分数量
  plan?: "subscriber"    // 订阅后更新的 plan 字段
}

const PLANS: Record<string, Plan> = {
  // 订阅套餐：¥39/月，文字无限 + 赠100积分
  subscriber_monthly: { name: "订阅版月付", price: "39.00", type: "subscription", plan: "subscriber", credits: 100 },
  // 积分充值包
  credits_100:  { name: "100积分包", price: "15.00",  type: "credits", credits: 100 },
  credits_300:  { name: "300积分包", price: "40.00",  type: "credits", credits: 300 },
  credits_1000: { name: "1000积分包", price: "118.00", type: "credits", credits: 1000 },
}

function zpaySign(params: Record<string, string>, key: string): string {
  const sorted = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k])
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&")
  // Bun 内置 crypto，使用 SubtleCrypto 的同步哈希替代方案
  // 由于 Web Crypto API 异步，使用 Bun 提供的 crypto.createHash
  const { createHash } = require("crypto") as typeof import("crypto")
  return createHash("md5").update(sorted + key).digest("hex")
}

pay.post("/create", requireAuth, async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const planId = typeof raw.planId === "string" ? raw.planId : ""
  const payType = typeof raw.payType === "string" ? raw.payType : "wxpay"

  if (!PLANS[planId]) return c.json({ error: "套餐不存在" }, 400)
  if (!ZPAY_PID || !ZPAY_KEY) return c.json({ error: "支付未配置，请联系管理员" }, 503)

  const plan = PLANS[planId]
  const outTradeNo = `tf_${Date.now()}_${jwt.sub.slice(0, 8)}`

  const params: Record<string, string> = {
    pid: ZPAY_PID,
    type: payType,
    out_trade_no: outTradeNo,
    notify_url: `${SITE_URL}/api/thinkflow/pay/notify`,
    return_url: `${SITE_URL}/app?payment=success`,
    name: plan.name,
    money: plan.price,
    param: `${jwt.sub}|${planId}`,
    sign_type: "MD5",
  }
  params.sign = zpaySign(params, ZPAY_KEY)

  const payUrl = `${ZPAY_API}?${new URLSearchParams(params).toString()}`
  return c.json({ payUrl, outTradeNo })
})

pay.post("/notify", async (c) => {
  const body = await c.req.parseBody() as Record<string, string>
  const sign = body.sign

  if (!sign || !ZPAY_KEY) return c.text("fail")

  const calculated = zpaySign(body, ZPAY_KEY)
  if (calculated !== sign) return c.text("fail")
  if (body.trade_status !== "TRADE_SUCCESS") return c.text("ok")

  const param = body.param ?? ""
  const [userId, planId] = param.split("|")
  if (!userId || !planId || !PLANS[planId]) return c.text("fail")

  const plan = PLANS[planId]

  if (plan.type === "subscription") {
    // 订阅：更新 plan 字段 + 充入赠送积分
    await sql`
      UPDATE users
      SET plan = 'subscriber',
          credits_permanent = credits_permanent + ${plan.credits ?? 0}
      WHERE id = ${userId}
    `
  } else {
    // 积分包：只充入永久积分
    await sql`
      UPDATE users
      SET credits_permanent = credits_permanent + ${plan.credits ?? 0}
      WHERE id = ${userId}
    `
  }

  // 记录积分流水
  const creditsAdded = plan.credits ?? 0
  if (creditsAdded > 0) {
    await sql`
      INSERT INTO credit_transactions (user_id, delta, reason)
      VALUES (${userId}, ${creditsAdded}, ${"purchase_" + planId})
    `
  }

  return c.text("success")
})

export default pay
