import { useState, useEffect } from "react"
import { useAuthStore } from "../store/authStore"
import { authApi } from "../services/apiClient"

// DiceBear 头像（与 UserMenu 保持一致）
const DICEBEAR_STYLES = [
  { id: "avataaars", label: "卡通人物" },
  { id: "lorelei",   label: "线条插画" },
  { id: "bottts",    label: "像素机器人" },
  { id: "thumbs",    label: "二次元" },
] as const
type AvatarStyle = typeof DICEBEAR_STYLES[number]["id"]

function getAvatarUrl(seed: string, style: AvatarStyle, size = 80): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&radius=50`
}

function formatDate(iso?: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })
}

export function Profile() {
  const { user, token, fetchMe, refreshCredits } = useAuthStore()
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(
    () => (localStorage.getItem("thinkflow-avatar-style") as AvatarStyle) ?? "avataaars"
  )

  useEffect(() => {
    if (!token) { window.location.replace("/login"); return }
    if (!user) fetchMe()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.display_name) setDisplayName(user.display_name)
    refreshCredits()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveName = async () => {
    if (!displayName.trim()) return
    setSaving(true)
    await authApi.updateProfile(displayName.trim()).catch(() => null)
    await fetchMe()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAvatarStyle = (s: AvatarStyle) => {
    setAvatarStyle(s)
    localStorage.setItem("thinkflow-avatar-style", s)
  }

  const isSubscriber = user?.plan === "subscriber"
  const creditsDaily = (user as { credits_daily?: number })?.credits_daily ?? 0
  const creditsPermanent = (user as { credits_permanent?: number })?.credits_permanent ?? 0

  return (
    <div className="profile-page">
      <nav className="profile-nav">
        <a href="/" className="profile-nav__logo">ThinkFlow<span> · 思流</span></a>
        <a href="/app" className="profile-nav__back">← 返回工作台</a>
      </nav>

      <div className="profile-content">
        <h1 className="profile-title">账号设置</h1>

        {/* ── 头像区 ── */}
        <section className="profile-section">
          <h2 className="profile-section__title">头像</h2>
          <div className="profile-avatar-row">
            {user && (
              <img
                src={getAvatarUrl(user.email, avatarStyle, 80)}
                width={80}
                height={80}
                alt="avatar"
                className="profile-avatar-img"
              />
            )}
            <div>
              <p className="profile-avatar-label">选择风格</p>
              <div className="profile-avatar-styles">
                {DICEBEAR_STYLES.map((s) => (
                  <button
                    key={s.id}
                    className={`profile-avatar-style-btn${avatarStyle === s.id ? " active" : ""}`}
                    title={s.label}
                    onClick={() => handleAvatarStyle(s.id)}
                  >
                    {user && (
                      <img
                        src={getAvatarUrl(user.email, s.id, 36)}
                        width={36}
                        height={36}
                        alt={s.label}
                      />
                    )}
                  </button>
                ))}
              </div>
              <p className="profile-avatar-hint">头像基于你的邮箱生成，风格偏好保存在本地</p>
            </div>
          </div>
        </section>

        {/* ── 个人信息 ── */}
        <section className="profile-section">
          <h2 className="profile-section__title">个人信息</h2>
          <div className="profile-field">
            <label className="profile-field__label">邮箱</label>
            <div className="profile-field__value profile-field__value--muted">{user?.email ?? "—"}</div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label">显示名称</label>
            <div className="profile-field__input-row">
              <input
                className="profile-field__input"
                placeholder="设置你的昵称（最多 32 字）"
                value={displayName}
                maxLength={32}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName() }}
              />
              <button
                className="profile-field__save-btn"
                onClick={handleSaveName}
                disabled={saving || !displayName.trim()}
              >
                {saving ? "保存中..." : saved ? "✓ 已保存" : "保存"}
              </button>
            </div>
          </div>
          <div className="profile-field">
            <label className="profile-field__label">注册时间</label>
            <div className="profile-field__value profile-field__value--muted">{formatDate(user?.created_at)}</div>
          </div>
        </section>

        {/* ── 积分与订阅 ── */}
        <section className="profile-section">
          <h2 className="profile-section__title">积分与订阅</h2>
          <div className="profile-credits-grid">
            <div className="profile-credits-card">
              <p className="profile-credits-card__label">今日剩余积分</p>
              <p className="profile-credits-card__value">{creditsDaily}</p>
              <p className="profile-credits-card__hint">每日 00:00 重置</p>
            </div>
            <div className="profile-credits-card">
              <p className="profile-credits-card__label">永久积分余额</p>
              <p className="profile-credits-card__value">{creditsPermanent}</p>
              <p className="profile-credits-card__hint">永不过期</p>
            </div>
            <div className={`profile-credits-card${isSubscriber ? " profile-credits-card--highlight" : ""}`}>
              <p className="profile-credits-card__label">当前套餐</p>
              <p className="profile-credits-card__value" style={{ fontSize: 18 }}>
                {isSubscriber ? "订阅版" : "免费版"}
              </p>
              {!isSubscriber && (
                <a href="/pricing" className="profile-credits-card__upgrade">升级 →</a>
              )}
            </div>
          </div>
          <div className="profile-credits-note">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            文字创作消耗 8 积分/次，图文创作消耗 18 积分/次。订阅版文字创作无需积分。
          </div>
          <div style={{ marginTop: 16 }}>
            <a href="/pricing" className="profile-pricing-link">查看充值方案 →</a>
          </div>
        </section>

        {/* ── 数据管理 ── */}
        <section className="profile-section">
          <h2 className="profile-section__title">数据</h2>
          <a href="/dashboard" className="profile-data-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            管理我的画布
          </a>
        </section>
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
.profile-page {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  padding-bottom: 80px;
}

/* ── Nav ── */
.profile-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 48px; height: 60px;
  border-bottom: 1px solid var(--border);
}
.profile-nav__logo {
  font-size: 15px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--text-primary); text-decoration: none;
}
.profile-nav__logo span { font-weight: 400; color: var(--text-muted); }
.profile-nav__back {
  font-size: 13px; color: var(--text-muted); text-decoration: none;
  transition: color 0.15s;
}
.profile-nav__back:hover { color: var(--text-primary); }

/* ── Content ── */
.profile-content {
  max-width: 640px; margin: 0 auto; padding: 48px 24px 0;
}
.profile-title {
  font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 36px;
}

/* ── Section ── */
.profile-section {
  margin-bottom: 40px;
  padding-bottom: 40px;
  border-bottom: 1px solid var(--border);
}
.profile-section:last-child { border-bottom: none; }
.profile-section__title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--text-muted); margin: 0 0 20px;
}

/* ── Avatar ── */
.profile-avatar-row {
  display: flex; align-items: flex-start; gap: 24px;
}
.profile-avatar-img {
  width: 80px; height: 80px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
  border: 2px solid var(--border);
}
.profile-avatar-label {
  font-size: 12px; color: var(--text-muted); margin: 0 0 10px;
}
.profile-avatar-styles {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.profile-avatar-style-btn {
  width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid transparent; background: var(--bg-node);
  cursor: pointer; padding: 3px;
  transition: border-color 0.12s, transform 0.1s;
}
.profile-avatar-style-btn.active { border-color: var(--accent); }
.profile-avatar-style-btn:hover:not(.active) { border-color: var(--border-hover); transform: scale(1.08); }
.profile-avatar-hint { font-size: 11px; color: var(--text-muted); margin: 10px 0 0; }

/* ── Fields ── */
.profile-field { margin-bottom: 20px; }
.profile-field__label {
  font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; display: block;
}
.profile-field__value {
  font-size: 14px; padding: 8px 12px;
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.profile-field__value--muted { color: var(--text-muted); }
.profile-field__input-row { display: flex; gap: 8px; }
.profile-field__input {
  flex: 1; padding: 8px 12px; font-size: 14px;
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary);
  outline: none; transition: border-color 0.15s;
}
.profile-field__input:focus { border-color: var(--accent); }
.profile-field__save-btn {
  padding: 8px 18px; font-size: 13px; font-weight: 700;
  background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--radius-md); cursor: pointer;
  white-space: nowrap; transition: opacity 0.15s;
}
.profile-field__save-btn:hover:not(:disabled) { opacity: 0.85; }
.profile-field__save-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Credits grid ── */
.profile-credits-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;
}
@media (max-width: 600px) {
  .profile-credits-grid { grid-template-columns: 1fr; }
}
.profile-credits-card {
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.profile-credits-card--highlight {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-glow);
}
.profile-credits-card__label { font-size: 11px; color: var(--text-muted); margin: 0; }
.profile-credits-card__value {
  font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; line-height: 1.2;
}
.profile-credits-card__hint { font-size: 11px; color: var(--text-muted); margin: 0; }
.profile-credits-card__upgrade {
  font-size: 12px; font-weight: 700; color: var(--accent); text-decoration: none; margin-top: 4px;
}
.profile-credits-card__upgrade:hover { text-decoration: underline; }
.profile-credits-note {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 12px; color: var(--text-muted); line-height: 1.6;
  padding: 10px 12px; background: var(--accent-subtle);
  border-radius: var(--radius-md);
}
.profile-credits-note svg { flex-shrink: 0; margin-top: 1px; }
.profile-pricing-link {
  font-size: 13px; font-weight: 600; color: var(--accent); text-decoration: none;
}
.profile-pricing-link:hover { text-decoration: underline; }

/* ── Data ── */
.profile-data-link {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 600; color: var(--text-primary); text-decoration: none;
  padding: 10px 16px; border: 1px solid var(--border);
  border-radius: var(--radius-md); transition: border-color 0.15s, background 0.12s;
}
.profile-data-link:hover { border-color: var(--accent); background: var(--accent-subtle); }
`
