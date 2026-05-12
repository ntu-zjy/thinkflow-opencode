import { useState, useEffect } from "react"
import { useAuthStore } from "../store/authStore"
import { useCanvasStore } from "../store/canvasStore"
import { canvasApi } from "../services/apiClient"
import type { CanvasMeta } from "../services/apiClient"

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\//g, ".")
}

export function Dashboard() {
  const { user, token } = useAuthStore()
  const syncCanvasesFromServer = useCanvasStore((s) => s.syncCanvasesFromServer)
  const [list, setList] = useState<CanvasMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { window.location.replace("/login"); return }
    canvasApi.list()
      .then((data) => setList(data))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }, [token])

  const handleOpen = (id: string) => {
    // 同步到 canvasStore 后跳转
    syncCanvasesFromServer().then(() => {
      window.location.href = "/app"
    })
    // 同时把目标 serverId 存到 sessionStorage，App 初始化后激活
    sessionStorage.setItem("thinkflow-open-canvas-serverId", id)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("确认删除该画布？此操作不可恢复。")) return
    setDeletingId(id)
    await canvasApi.remove(id).catch(() => {})
    setList((prev) => prev.filter((c) => c.id !== id))
    setDeletingId(null)
  }

  return (
    <div className="dash-page">
      <nav className="dash-nav">
        <a href="/" className="dash-nav__logo">ThinkFlow<span> · 思流</span></a>
        <div className="dash-nav__actions">
          {user && <span className="dash-nav__email">{user.email}</span>}
          <a href="/app" className="dash-nav__btn">进入工作台 →</a>
        </div>
      </nav>

      <div className="dash-content">
        <div className="dash-header">
          <h1 className="dash-title">我的画布</h1>
          <p className="dash-subtitle">你的所有工作流画布都保存在这里</p>
        </div>

        {loading ? (
          <div className="dash-loading">
            <div className="dash-loading__spin" />
            <span>加载中...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="dash-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p>还没有画布</p>
            <a href="/app" className="dash-empty__cta">开始创作 →</a>
          </div>
        ) : (
          <div className="dash-grid">
            {list.map((c) => (
              <div key={c.id} className="dash-card" onClick={() => handleOpen(c.id)}>
                <div className="dash-card__preview">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                </div>
                <div className="dash-card__body">
                  <p className="dash-card__title">{c.title}</p>
                  <p className="dash-card__date">更新于 {formatDate(c.updated_at)}</p>
                </div>
                <button
                  className="dash-card__delete"
                  onClick={(e) => handleDelete(c.id, e)}
                  disabled={deletingId === c.id}
                  title="删除画布"
                >
                  {deletingId === c.id ? (
                    <div className="dash-loading__spin" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
.dash-page {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
}

/* ── Nav ── */
.dash-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 48px; height: 60px;
  border-bottom: 1px solid var(--border);
}
.dash-nav__logo {
  font-size: 15px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--text-primary); text-decoration: none;
}
.dash-nav__logo span { font-weight: 400; color: var(--text-muted); }
.dash-nav__actions { display: flex; align-items: center; gap: 16px; }
.dash-nav__email { font-size: 12px; color: var(--text-muted); }
.dash-nav__btn {
  font-size: 13px; font-weight: 600; color: var(--accent); text-decoration: none;
  padding: 6px 14px; border: 1px solid var(--accent);
  border-radius: var(--radius-md); transition: background 0.12s, color 0.12s;
}
.dash-nav__btn:hover { background: var(--accent); color: var(--accent-text); }

/* ── Content ── */
.dash-content {
  max-width: 960px; margin: 0 auto; padding: 48px 24px;
}
.dash-header { margin-bottom: 32px; }
.dash-title {
  font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 8px;
}
.dash-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }

/* ── Loading ── */
.dash-loading {
  display: flex; align-items: center; gap: 10px;
  color: var(--text-muted); font-size: 13px; padding: 60px 0;
}
.dash-loading__spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: dash-spin 0.7s linear infinite;
}
@keyframes dash-spin { to { transform: rotate(360deg); } }

/* ── Empty ── */
.dash-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 80px 0; color: var(--text-muted);
}
.dash-empty p { font-size: 14px; margin: 0; }
.dash-empty__cta {
  font-size: 13px; font-weight: 700; color: var(--accent); text-decoration: none;
}
.dash-empty__cta:hover { text-decoration: underline; }

/* ── Grid ── */
.dash-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

/* ── Card ── */
.dash-card {
  background: var(--bg-node);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden; cursor: pointer; position: relative;
  transition: border-color 0.15s, box-shadow 0.15s;
  display: flex; flex-direction: column;
}
.dash-card:hover {
  border-color: var(--accent); box-shadow: 0 4px 16px var(--accent-glow);
}
.dash-card__preview {
  height: 100px;
  background: var(--bg-canvas);
  display: flex; align-items: center; justify-content: center;
}
.dash-card__body {
  padding: 14px 16px 16px;
}
.dash-card__title {
  font-size: 14px; font-weight: 600; margin: 0 0 6px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dash-card__date { font-size: 11px; color: var(--text-muted); margin: 0; }
.dash-card__delete {
  position: absolute; top: 8px; right: 8px;
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: 6px; width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0; transition: opacity 0.12s, color 0.12s;
  color: var(--text-muted);
}
.dash-card:hover .dash-card__delete { opacity: 1; }
.dash-card__delete:hover { color: var(--status-error); border-color: var(--status-error); }
.dash-card__delete:disabled { opacity: 0.5; cursor: not-allowed; }
`
