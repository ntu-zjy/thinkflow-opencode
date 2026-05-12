import { useState, useRef, useEffect } from "react"
import { useAuthStore } from "../store/authStore"

// ─── DiceBear 头像配置 ────────────────────────────────────────────────────────
const DICEBEAR_STYLES = [
  { id: "avataaars", label: "卡通人物" },
  { id: "lorelei",   label: "线条插画" },
  { id: "bottts",    label: "像素机器人" },
  { id: "thumbs",    label: "二次元" },
] as const

type AvatarStyle = typeof DICEBEAR_STYLES[number]["id"]

function getAvatarUrl(seed: string, style: AvatarStyle, size = 40): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50`
}

export function UserMenu() {
  const { user, logout } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<AvatarStyle>(
    () => (localStorage.getItem("thinkflow-avatar-style") as AvatarStyle) ?? "avataaars"
  )
  const [seed, setSeed] = useState<string>(
    () => localStorage.getItem("thinkflow-avatar-seed") ?? ""
  )
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

  const isPro = user.plan === "pro" || user.plan === "subscriber"
  const currentSeed = seed || user.email

  const handleStyleChange = (s: AvatarStyle) => {
    setStyle(s)
    localStorage.setItem("thinkflow-avatar-style", s)
  }

  // 从 Profile 页切换头像后，重新打开菜单时同步 seed
  const handleOpen = () => {
    setSeed(localStorage.getItem("thinkflow-avatar-seed") ?? "")
    setStyle((localStorage.getItem("thinkflow-avatar-style") as AvatarStyle) ?? "avataaars")
    setOpen((v) => !v)
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="tf-user-avatar"
        onClick={handleOpen}
        title={user.email}
        aria-label="用户菜单"
      >
        <img
          src={getAvatarUrl(currentSeed, style, 30)}
          width={30}
          height={30}
          alt="avatar"
          className="tf-user-avatar-img"
        />
        {isPro && <span className="tf-user-avatar__badge">{user.plan === "subscriber" ? "SUB" : "PRO"}</span>}
      </button>

      {open && (
        <div className="tf-user-dropdown">
          <div className="tf-user-dropdown__info">
            <div className="tf-user-dropdown__avatar-row">
              <img
                src={getAvatarUrl(currentSeed, style, 36)}
                width={36}
                height={36}
                alt="avatar"
                className="tf-user-avatar-img"
              />
              <div>
                <p className="tf-user-dropdown__email">{user.email}</p>
                <p className="tf-user-dropdown__plan">
                  {user.plan === "subscriber" ? "订阅版 · 文字无限" : isPro ? "专业版" : `免费版 · 今日剩余 ${user.credits} 积分`}
                </p>
              </div>
            </div>
          </div>

          {/* 头像风格选择 */}
          <div className="tf-user-dropdown__styles">
            <p className="tf-user-dropdown__styles-label">头像风格</p>
            <div className="tf-user-dropdown__styles-row">
              {DICEBEAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`tf-user-avatar-style-btn${style === s.id ? " active" : ""}`}
                  title={s.label}
                  onClick={() => handleStyleChange(s.id)}
                >
                  <img
                    src={getAvatarUrl(currentSeed, s.id, 28)}
                    width={28}
                    height={28}
                    alt={s.label}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="tf-user-dropdown__divider" />

          <a href="/dashboard" className="tf-user-dropdown__item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            我的画布
          </a>
          <a href="/profile" className="tf-user-dropdown__item" onClick={() => setOpen(false)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            账号设置
          </a>
          {!isPro && (
            <a href="/pricing" className="tf-user-dropdown__item tf-user-dropdown__item--upgrade" onClick={() => setOpen(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              升级订阅版
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
