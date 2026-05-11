import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "../store/authStore"

export function UserMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  if (!user) {
    return (
      <a href="/login" className="tf-btn tf-btn-ghost" style={{ fontSize: 12 }}>
        登录
      </a>
    )
  }

  const initial = user.email[0].toUpperCase()
  const isPro = user.plan === "pro"

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="tf-user-avatar"
        onClick={() => setOpen((v) => !v)}
        title={user.email}
        aria-label="用户菜单"
      >
        {initial}
        {isPro && <span className="tf-user-avatar__badge">PRO</span>}
      </button>

      {open && (
        <div className="tf-user-dropdown">
          <div className="tf-user-dropdown__info">
            <p className="tf-user-dropdown__email">{user.email}</p>
            <p className="tf-user-dropdown__plan">
              {isPro ? "专业版" : `免费版 · 今日剩余 ${user.credits} 次`}
            </p>
          </div>
          <div className="tf-user-dropdown__divider" />
          {!isPro && (
            <a href="/pricing" className="tf-user-dropdown__item tf-user-dropdown__item--upgrade" onClick={() => setOpen(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              升级专业版
            </a>
          )}
          <button
            className="tf-user-dropdown__item tf-user-dropdown__item--logout"
            onClick={() => { logout(); setOpen(false); window.location.href = "/login" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
