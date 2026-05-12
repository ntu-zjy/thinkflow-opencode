import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import auth from "./routes/auth"
import canvas from "./routes/canvas"
import pay from "./routes/pay"
import credits from "./routes/credits"
import admin from "./routes/admin"

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
