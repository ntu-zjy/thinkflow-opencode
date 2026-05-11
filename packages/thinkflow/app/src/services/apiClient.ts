// ThinkFlow 后端 API 客户端
// 所有请求经 /api/thinkflow 代理到本地后端（开发）或生产 API 服务

const BASE = "/api/thinkflow"

function getToken(): string | null {
  return localStorage.getItem("thinkflow-token")
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const resp = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` })) as { error?: string }
    throw new Error(body.error ?? `请求失败: ${resp.status}`)
  }
  return resp.json() as Promise<T>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  plan: "free" | "pro"
  credits: number
}

export interface AuthResponse {
  token: string
  user: User
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<User>("/auth/me"),
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

export interface CanvasMeta {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface CanvasFull extends CanvasMeta {
  nodes_json: unknown[]
  edges_json: unknown[]
}

export const canvasApi = {
  list: () => request<CanvasMeta[]>("/canvas"),

  create: (title: string, nodes: unknown[], edges: unknown[]) =>
    request<CanvasMeta>("/canvas", {
      method: "POST",
      body: JSON.stringify({ title, nodes_json: nodes, edges_json: edges }),
    }),

  get: (id: string) => request<CanvasFull>(`/canvas/${id}`),

  update: (id: string, payload: { title?: string; nodes_json?: unknown[]; edges_json?: unknown[] }) =>
    request<{ id: string; title: string; updated_at: string }>(`/canvas/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  remove: (id: string) =>
    request<{ ok: boolean }>(`/canvas/${id}`, { method: "DELETE" }),
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export type RunType = "text" | "image"

export interface CreditsInfo {
  daily: number
  permanent: number
  total: number
  plan: string
}

export interface CheckResult {
  ok: boolean
  required: number
  available: number
  daily: number
  permanent: number
}

export const creditsApi = {
  get: () => request<CreditsInfo>("/credits"),

  check: (runType: RunType, count = 1) =>
    request<CheckResult>("/credits/check", {
      method: "POST",
      body: JSON.stringify({ runType, count }),
    }),

  deduct: (runType: RunType, count = 1) =>
    request<{ ok: boolean; deducted: number; remaining: number }>("/credits/deduct", {
      method: "POST",
      body: JSON.stringify({ runType, count }),
    }),

  refund: (runType: RunType, count = 1) =>
    request<{ ok: boolean; refunded: number }>("/credits/refund", {
      method: "POST",
      body: JSON.stringify({ runType, count }),
    }),
}

// ─── Pay ──────────────────────────────────────────────────────────────────────

export const payApi = {
  create: (planId: string, payType: "wxpay" | "alipay" = "wxpay") =>
    request<{ payUrl: string; outTradeNo: string }>("/pay/create", {
      method: "POST",
      body: JSON.stringify({ planId, payType }),
    }),
}
