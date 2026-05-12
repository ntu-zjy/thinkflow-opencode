import { useState, useEffect, useCallback } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Canvas } from "./pages/Canvas"
import { Landing } from "./pages/Landing"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import { Pricing } from "./pages/Pricing"
import { Dashboard } from "./pages/Dashboard"
import { Profile } from "./pages/Profile"
import { Toolbar } from "./components/Toolbar"
import { MemoryPanel } from "./components/MemoryPanel"
import { WorkflowSidebar } from "./components/WorkflowSidebar"
import { TourGuide } from "./components/TourGuide"
import { useAuthStore } from "./store/authStore"
import { useCanvasStore } from "./store/canvasStore"
// 触发输入卡片注册（副作用）
import "./input-cards"

export type Theme = "light" | "dark"

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("thinkflow-theme") as Theme | null
  if (stored === "light" || stored === "dark") return stored
  return "light"
}

type Route = "landing" | "login" | "register" | "pricing" | "app" | "dashboard" | "profile"

function getRoute(): Route {
  const { pathname, search } = window.location
  if (pathname === "/login") return "login"
  if (pathname === "/register") return "register"
  if (pathname === "/pricing") return "pricing"
  if (pathname === "/dashboard") return "dashboard"
  if (pathname === "/profile") return "profile"
  if (pathname.startsWith("/app") || search.includes("app")) return "app"
  return "landing"
}

export default function App() {
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [showTour, setShowTour] = useState(() => !localStorage.getItem("thinkflow-tour-done"))
  const [route] = useState<Route>(getRoute)
  const { user, fetchMe, token } = useAuthStore()
  const syncCanvasesFromServer = useCanvasStore((s) => s.syncCanvasesFromServer)

  // 初始化时用 token 恢复用户信息，登录后同步服务端画布
  useEffect(() => {
    if (token && !user) {
      fetchMe().then(() => syncCanvasesFromServer())
    } else if (token && user) {
      syncCanvasesFromServer()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("thinkflow-theme", theme)
  }, [theme])

  // Landing/Login/Register 页时 body 可滚动
  const isScrollable = route !== "app"
  useEffect(() => {
    if (isScrollable) {
      document.documentElement.style.overflow = "auto"
      document.body.style.overflow = "auto"
      document.body.style.height = "auto"
    }
    return () => {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
      document.body.style.height = ""
    }
  }, [isScrollable])

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"))

  const handleTourClose = useCallback(() => {
    localStorage.setItem("thinkflow-tour-done", "1")
    setShowTour(false)
  }, [])

  const handleRestartTour = useCallback(() => {
    localStorage.removeItem("thinkflow-tour-done")
    setShowTour(true)
  }, [])

  if (route === "login") return <Login />
  if (route === "register") return <Register />
  if (route === "pricing") return <Pricing />
  if (route === "landing") return <Landing />
  if (route === "dashboard") return <Dashboard />
  if (route === "profile") return <Profile />

  // /app 路由守卫：未登录且无 token → 跳转登录页
  if (!token && !user) {
    window.location.replace("/login")
    return null
  }

  return (
    <ReactFlowProvider>
      <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
        <Toolbar
          theme={theme}
          onToggleTheme={toggleTheme}
          onRestartTour={handleRestartTour}
        />
        {showTour && <TourGuide onClose={handleTourClose} />}
        {/* 左侧工作流侧边栏 + 主内容区（画布或记忆库） */}
        <div style={{ position: "absolute", inset: 0, top: 52, display: "flex" }}>
          <WorkflowSidebar
            memoryOpen={memoryOpen}
            onToggleMemory={() => setMemoryOpen((v) => !v)}
          />
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {memoryOpen ? (
              <MemoryPanel onClose={() => setMemoryOpen(false)} />
            ) : (
              <Canvas />
            )}
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
