import { create } from "zustand"
import { authApi, creditsApi } from "../services/apiClient"
import type { User } from "../services/apiClient"

interface AuthStore {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  // 积分详情（从后端刷新）
  creditsDaily: number
  creditsPermanent: number
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  refreshCredits: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem("thinkflow-token"),
  loading: false,
  error: null,
  creditsDaily: 0,
  creditsPermanent: 0,

  login: async (email, password) => {
    set({ loading: true, error: null })
    const { token, user } = await authApi.login(email, password).finally(() =>
      set({ loading: false }),
    )
    localStorage.setItem("thinkflow-token", token)
    set({ token, user })
    // 登录后拉取积分详情
    get().refreshCredits()
  },

  register: async (email, password) => {
    set({ loading: true, error: null })
    const { token, user } = await authApi.register(email, password).finally(() =>
      set({ loading: false }),
    )
    localStorage.setItem("thinkflow-token", token)
    set({ token, user })
    get().refreshCredits()
  },

  logout: () => {
    localStorage.removeItem("thinkflow-token")
    set({ user: null, token: null, creditsDaily: 0, creditsPermanent: 0 })
  },

  fetchMe: async () => {
    const token = localStorage.getItem("thinkflow-token")
    if (!token) return
    set({ loading: true })
    const data = await authApi.me().catch(() => null) as (User & { credits_daily?: number; credits_permanent?: number }) | null
    set({ loading: false })
    if (!data) {
      localStorage.removeItem("thinkflow-token")
      set({ user: null, token: null })
      return
    }
    set({
      user: { id: data.id, email: data.email, plan: data.plan, credits: data.credits },
      token,
      creditsDaily: data.credits_daily ?? 0,
      creditsPermanent: data.credits_permanent ?? 0,
    })
  },

  refreshCredits: async () => {
    const info = await creditsApi.get().catch(() => null)
    if (!info) return
    set((s) => ({
      creditsDaily: info.daily,
      creditsPermanent: info.permanent,
      user: s.user ? { ...s.user, credits: info.total } : null,
    }))
  },

  clearError: () => set({ error: null }),
}))
