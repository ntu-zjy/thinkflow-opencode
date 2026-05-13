import { Hono } from "hono"
import { requireAuth } from "../middleware/jwt"
import type { JwtPayload } from "../middleware/jwt"
import { sql } from "../db"

const canvas = new Hono()

canvas.use("*", requireAuth)

canvas.get("/", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const rows = await sql`
    SELECT id, title, created_at, updated_at
    FROM canvases
    WHERE user_id = ${jwt.sub}
    ORDER BY updated_at DESC
  `
  return c.json(rows)
})

canvas.post("/", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>
  const title = typeof raw.title === "string" ? raw.title : "未命名画布"
  const nodes = JSON.stringify(Array.isArray(raw.nodes_json) ? raw.nodes_json : [])
  const edges = JSON.stringify(Array.isArray(raw.edges_json) ? raw.edges_json : [])

  const rows = await sql`
    INSERT INTO canvases (user_id, title, nodes_json, edges_json)
    VALUES (${jwt.sub}, ${title}, ${nodes}, ${edges})
    RETURNING id, title, created_at, updated_at
  `
  return c.json(rows[0], 201)
})

canvas.get("/:id", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const id = c.req.param("id")
  const rows = await sql`
    SELECT id, title, nodes_json, edges_json, created_at, updated_at
    FROM canvases
    WHERE id = ${id} AND user_id = ${jwt.sub}
  `
  const row = rows[0]
  if (!row) return c.json({ error: "画布不存在" }, 404)
  // 历史存量数据可能 nodes_json/edges_json 是对象或 null（迁移前的脏数据），
  // 出口处兜底成数组，避免前端 .map 崩溃。
  return c.json({
    ...row,
    nodes_json: Array.isArray(row.nodes_json) ? row.nodes_json : [],
    edges_json: Array.isArray(row.edges_json) ? row.edges_json : [],
  })
})

canvas.put("/:id", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const id = c.req.param("id")
  const raw = await c.req.json().catch(() => ({})) as Record<string, unknown>

  const existing = await sql`SELECT id FROM canvases WHERE id = ${id} AND user_id = ${jwt.sub}`
  if (!existing[0]) return c.json({ error: "画布不存在" }, 404)

  const newTitle = typeof raw.title === "string" ? raw.title : null
  const newNodes = Array.isArray(raw.nodes_json) ? JSON.stringify(raw.nodes_json) : null
  const newEdges = Array.isArray(raw.edges_json) ? JSON.stringify(raw.edges_json) : null

  const rows = await sql`
    UPDATE canvases
    SET
      title = COALESCE(${newTitle}, title),
      nodes_json = COALESCE(${newNodes}::jsonb, nodes_json),
      edges_json = COALESCE(${newEdges}::jsonb, edges_json)
    WHERE id = ${id}
    RETURNING id, title, updated_at
  `
  return c.json(rows[0])
})

canvas.delete("/:id", async (c) => {
  const jwt = c.get("jwtPayload") as JwtPayload
  const id = c.req.param("id")
  const result = await sql`
    DELETE FROM canvases WHERE id = ${id} AND user_id = ${jwt.sub}
    RETURNING id
  `
  if (!result[0]) return c.json({ error: "画布不存在" }, 404)
  return c.json({ ok: true })
})

export default canvas
