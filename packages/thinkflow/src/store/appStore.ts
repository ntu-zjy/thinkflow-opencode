import { create } from "zustand"
import { persist } from "zustand/middleware"

type Panel = "canvas" | "memory" | "settings"
type Theme = "dark" | "light"

interface AppState {
  panel: Panel
  theme: Theme
  sidebarCollapsed: boolean
  onboarded: boolean
  opencodeUrl: string

  setPanel: (p: Panel) => void
  setTheme: (t: Theme) => void
  toggleSidebar: () => void
  setOnboarded: () => void
  setOpencodeUrl: (url: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      panel: "canvas",
      theme: "dark",
      sidebarCollapsed: false,
      onboarded: false,
      opencodeUrl: "http://localhost:4096",

      setPanel: (p) => set({ panel: p }),
      setTheme: (t) => set({ theme: t }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setOnboarded: () => set({ onboarded: true }),
      setOpencodeUrl: (url) => set({ opencodeUrl: url }),
    }),
    { name: "thinkflow-app" },
  ),
)
