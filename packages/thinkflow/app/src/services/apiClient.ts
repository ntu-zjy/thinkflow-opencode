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
  display_name?: string | null
  plan: "free" | "pro" | "subscriber"
  credits: number
  credits_daily?: number
  credits_permanent?: number
  created_at?: string
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

  updateProfile: (displayName: string) =>
    request<{ ok: boolean; display_name: string }>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify({ display_name: displayName }),
    }),
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

export type RunType = "text" | "image" | "video"

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
    request<{ payUrl: string; outTradeNo: string; mock?: boolean }>("/pay/create", {
      method: "POST",
      body: JSON.stringify({ planId, payType }),
    }),
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export const uploadApi = {
  image: (base64: string, folder = "images") =>
    request<{ url: string }>("/upload/image", {
      method: "POST",
      body: JSON.stringify({ base64, folder }),
    }),
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  users: { total: number; new_7d: number; new_30d: number }
  canvases: { total: number }
  credits: { text_consumed: number; image_consumed: number; video_consumed: number; sold: number }
  usage: {
    text:  { runs: number; tokens_input: number; tokens_output: number; tokens_cache_read: number; cost_usd: number }
    image: { runs: number; tokens_input: number; tokens_output: number; tokens_cache_read: number; cost_usd: number }
    video: { runs: number; tokens_input: number; tokens_output: number; tokens_cache_read: number; cost_usd: number }
  }
  financials: { revenue: number; cost_usd: number; cost_cny: number; profit: number; margin: number }
  plans: Record<string, number>
}

export interface AdminRevenueDay {
  day: string
  txn_count: number
  credits_added: number
  revenue: number
  cost_usd: number
  cost_cny: number
  profit: number
  text_runs: number
  image_runs: number
  video_runs: number
  text_tokens_in: number
  text_tokens_out: number
  text_cache_read: number
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export interface UsageRecord {
  run_type: "text" | "image" | "video"
  model?: string
  tokens_input: number
  tokens_output: number
  tokens_cache_read?: number
  tokens_cache_write?: number
  cost_usd: number
}

export const usageApi = {
  record: (data: UsageRecord) =>
    request<{ ok: boolean }>("/usage/record", {
      method: "POST",
      body: JSON.stringify(data),
    }),
}

export interface AdminUser {
  id: string
  email: string
  display_name: string | null
  plan: string
  credits_daily: number
  credits_permanent: number
  created_at: string
}

export interface AdminTransaction {
  id: string
  delta: number
  reason: string
  created_at: string
  email: string
}

export const adminApi = {
  stats: () => request<AdminStats>("/admin/stats"),

  revenue: () => request<{ daily: AdminRevenueDay[] }>("/admin/revenue"),

  users: (page = 1, limit = 20, q = "") =>
    request<{ users: AdminUser[]; total: number; page: number; limit: number }>(
      `/admin/users?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`
    ),

  credits: (limit = 50, reason?: string) =>
    request<{ transactions: AdminTransaction[] }>(
      `/admin/credits?limit=${limit}${reason ? `&reason=${encodeURIComponent(reason)}` : ""}`
    ),

  adjustCredits: (userId: string, delta: number, reason = "admin_adjust") =>
    request<{ ok: boolean; updated: { credits_daily: number; credits_permanent: number } }>(
      `/admin/users/${userId}/credits`,
      { method: "PATCH", body: JSON.stringify({ delta, reason }) }
    ),
}
