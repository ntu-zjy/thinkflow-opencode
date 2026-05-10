import type { VercelRequest, VercelResponse } from "@vercel/node"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(204).end()
  }

  const raw = req.query.path
  const path = Array.isArray(raw) ? raw.join("/") : (raw ?? "")
  const targetUrl = `https://openrouter.ai/api/${path}`

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "HTTP-Referer": "https://thinkflow.ai",
    "X-Title": "ThinkFlow",
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`

  const body = req.method !== "GET" ? JSON.stringify(req.body) : undefined

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
  })

  const data = await upstream.text()
  res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json")
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.status(upstream.status).send(data)
}
