import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { sql } from "./db"
import auth from "./routes/auth"
import canvas from "./routes/canvas"
import pay from "./routes/pay"
import credits from "./routes/credits"
import admin from "./routes/admin"

// 启动时自动执行 schema 迁移（幂等，多次执行安全）
const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "schema.sql")
const schema = readFileSync(schemaPath, "utf-8")
await sql.unsafe(schema).catch((e) => {
  console.error("[migrate] 迁移失败（不影响启动）:", e.message)
})
console.log("[migrate] schema 迁移完成")

const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:1421",
        "https://thinkflow.app",
        process.env.CORS_ORIGIN ?? "",
      ]
      return allowed.includes(origin) ? origin : "http://localhost:1421"
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
)

app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }))

app.route("/auth", auth)
app.route("/canvas", canvas)
app.route("/pay", pay)
app.route("/credits", credits)
app.route("/admin", admin)

const PORT = parseInt(process.env.PORT ?? "3456")

export default {
  port: PORT,
  fetch: app.fetch,
}

console.log(`ThinkFlow API server running on http://localhost:${PORT}`)
