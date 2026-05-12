import { useState, useEffect, useCallback } from "react"
import { useAuthStore } from "../store/authStore"
import { adminApi } from "../services/apiClient"
import type { AdminStats, AdminUser, AdminTransaction, AdminRevenueDay } from "../services/apiClient"

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`adm-stat-card${accent ? " adm-stat-card--accent" : ""}`}>
      <p className="adm-stat-card__label">{label}</p>
      <p className="adm-stat-card__value">{value}</p>
      {sub && <p className="adm-stat-card__sub">{sub}</p>}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(/\//g, "-")
}

function yuan(n: number): string { return `¥${n.toFixed(2)}` }
function creditsToYuan(credits: number): string { return `¥${(credits * 0.1).toFixed(0)}` }

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const bom = "﻿"
  const lines = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))]
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function Admin() {
  const { user, token, fetchMe } = useAuthStore()
  const [tab, setTab] = useState<"overview" | "users" | "credits" | "revenue">("overview")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [revenue, setRevenue] = useState<AdminRevenueDay[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [userSearch, setUserSearch] = useState("")
  const [txns, setTxns] = useState<AdminTransaction[]>([])
  const [txnReason, setTxnReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<{ id: string; email: string } | null>(null)
  const [adjustDelta, setAdjustDelta] = useState("")

  useEffect(() => {
    if (!token) { window.location.replace("/login"); return }
    if (!user) fetchMe()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // 权限检查：后端会返回 403，这里提前 redirect 避免白屏
  useEffect(() => {
    if (user && user.plan !== "subscriber") {
      adminApi.stats().catch(() => window.location.replace("/app"))
    }
  }, [user])

  const loadStats = useCallback(async () => {
    setLoading(true)
    const s = await adminApi.stats().catch(() => null)
    setLoading(false)
    if (s) setStats(s)
  }, [])

  const loadRevenue = useCallback(async () => {
    setLoading(true)
    const r = await adminApi.revenue().catch(() => null)
    setLoading(false)
    if (r) setRevenue(r.daily)
  }, [])

  const loadUsers = useCallback(async (page = 1, q = "") => {
    setLoading(true)
    const r = await adminApi.users(page, 20, q).catch(() => null)
    setLoading(false)
    if (!r) return
    setUsers(r.users)
    setUsersTotal(r.total)
    setUsersPage(page)
  }, [])

  const loadTxns = useCallback(async (reason = "") => {
    setLoading(true)
    const r = await adminApi.credits(100, reason || undefined).catch(() => null)
    setLoading(false)
    if (r) setTxns(r.transactions)
  }, [])

  useEffect(() => {
    if (!user) return
    if (tab === "overview") loadStats()
    if (tab === "revenue") loadRevenue()
    if (tab === "users") loadUsers(1, userSearch)
    if (tab === "credits") loadTxns(txnReason)
  }, [tab, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdjust = async () => {
    if (!adjustTarget) return
    const d = parseInt(adjustDelta)
    if (isNaN(d) || d === 0) return alert("请输入非零整数")
    await adminApi.adjustCredits(adjustTarget.id, d)
    setAdjustTarget(null)
    setAdjustDelta("")
    if (tab === "users") loadUsers(usersPage, userSearch)
  }

  if (!user) return null

  return (
    <div className="adm-page">
      <nav className="adm-nav">
        <a href="/" className="adm-nav__logo">ThinkFlow<span> · 管理后台</span></a>
        <a href="/app" className="adm-nav__back">← 返回工作台</a>
      </nav>

      <div className="adm-layout">
        {/* ── 侧边 Tab ── */}
        <aside className="adm-aside">
          {(["overview", "revenue", "users", "credits"] as const).map((t) => (
            <button
              key={t}
              className={`adm-aside__item${tab === t ? " active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "overview" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              )}
              {t === "revenue" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              )}
              {t === "users" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              )}
              {t === "credits" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              )}
              {{ overview: "总览", revenue: "收入", users: "用户", credits: "积分流水" }[t]}
            </button>
          ))}
        </aside>

        <main className="adm-main">
          {loading && <div className="adm-loading"><div className="adm-spin"/><span>加载中...</span></div>}

          {/* ── 总览 ── */}
          {tab === "overview" && stats && (
            <div>
              <h1 className="adm-heading" style={{ marginBottom: 24 }}>总览</h1>

              <h2 className="adm-subheading">用户</h2>
              <div className="adm-stats-grid">
                <StatCard label="注册用户总数" value={stats.users.total} sub={`近 7 天 +${stats.users.new_7d}`} />
                <StatCard label="近 30 天新增" value={stats.users.new_30d} />
                <StatCard label="订阅用户" value={stats.plans.subscriber ?? 0} sub={`免费 ${stats.plans.free ?? 0}`} />
                <StatCard label="画布总数" value={stats.canvases.total} />
              </div>

              <h2 className="adm-subheading">财务概览（累计）</h2>
              <div className="adm-stats-grid">
                <StatCard label="累计收入" value={yuan(stats.financials.revenue)} accent />
                <StatCard label="累计成本" value={yuan(stats.financials.cost_cny)} sub={`$${stats.financials.cost_usd.toFixed(4)} USD`} />
                <StatCard label="毛利润" value={yuan(stats.financials.profit)} accent={stats.financials.profit > 0} sub={`毛利率 ${stats.financials.margin}%`} />
                <StatCard label="售出积分" value={stats.credits.sold} sub={`= ${creditsToYuan(stats.credits.sold)}`} />
              </div>

              <h2 className="adm-subheading">真实用量（累计，来自 OpenRouter）</h2>
              <table className="adm-table" style={{ maxWidth: 720 }}>
                <thead><tr><th>类型</th><th>次数</th><th>输入 Tokens</th><th>输出 Tokens</th><th>缓存命中</th><th>成本 (USD)</th></tr></thead>
                <tbody>
                  {(["text","image","video"] as const).map((t) => (
                    <tr key={t}>
                      <td>{{ text: "文字", image: "图文", video: "视频" }[t]}</td>
                      <td>{stats.usage[t].runs}</td>
                      <td>{stats.usage[t].tokens_input.toLocaleString()}</td>
                      <td>{stats.usage[t].tokens_output.toLocaleString()}</td>
                      <td>{stats.usage[t].tokens_cache_read.toLocaleString()}</td>
                      <td className="adm-td-neg">${stats.usage[t].cost_usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h2 className="adm-subheading">套餐分布</h2>
              <table className="adm-table" style={{ maxWidth: 320 }}>
                <thead><tr><th>套餐</th><th>用户数</th></tr></thead>
                <tbody>
                  {Object.entries(stats.plans).map(([plan, count]) => (
                    <tr key={plan}><td>{plan}</td><td>{count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 收入 ── */}
          {tab === "revenue" && (
            <div>
              <div className="adm-heading-row">
                <h1 className="adm-heading">收入与成本（近 30 天）</h1>
                <button className="adm-btn" onClick={() => downloadCsv(
                  "thinkflow-revenue.csv",
                  ["日期", "订单数", "售出积分", "收入(¥)", "成本(USD)", "成本(¥)", "利润(¥)", "文字次", "文字入参tokens", "文字出参tokens", "图文次", "视频次"],
                  revenue.map((r) => [r.day, r.txn_count, r.credits_added, r.revenue, r.cost_usd, r.cost_cny, r.profit, r.text_runs, r.text_tokens_in, r.text_tokens_out, r.image_runs, r.video_runs])
                )}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  导出 CSV
                </button>
              </div>
              <p className="adm-count">成本来自 OpenRouter 真实用量（USD × 7 换算人民币）</p>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>日期</th><th>订单数</th><th>售出积分</th>
                    <th>收入</th><th>成本(USD)</th><th>成本(CNY)</th><th>利润</th>
                    <th>文字次</th><th>文字入参</th><th>文字出参</th><th>图文次</th><th>视频次</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.length === 0 && (
                    <tr><td colSpan={12} style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>暂无收入记录</td></tr>
                  )}
                  {revenue.map((r) => (
                    <tr key={r.day}>
                      <td>{r.day}</td>
                      <td>{r.txn_count}</td>
                      <td>{r.credits_added}</td>
                      <td className="adm-td-pos">{yuan(r.revenue)}</td>
                      <td className="adm-td-neg">${r.cost_usd.toFixed(4)}</td>
                      <td className="adm-td-neg">{yuan(r.cost_cny)}</td>
                      <td className={r.profit >= 0 ? "adm-td-pos" : "adm-td-neg"}>{yuan(r.profit)}</td>
                      <td className="adm-td-muted">{r.text_runs}</td>
                      <td className="adm-td-muted">{r.text_tokens_in.toLocaleString()}</td>
                      <td className="adm-td-muted">{r.text_tokens_out.toLocaleString()}</td>
                      <td className="adm-td-muted">{r.image_runs}</td>
                      <td className="adm-td-muted">{r.video_runs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {revenue.length > 0 && (() => {
                const totRev    = revenue.reduce((s, r) => s + r.revenue, 0)
                const totCost   = revenue.reduce((s, r) => s + r.cost_cny, 0)
                const totProfit = totRev - totCost
                return (
                  <div className="adm-revenue-total">
                    近 30 天合计：收入 <strong className="adm-td-pos">{yuan(totRev)}</strong>
                    &nbsp;·&nbsp;成本 <strong className="adm-td-neg">{yuan(totCost)}</strong>
                    &nbsp;·&nbsp;利润 <strong className={totProfit >= 0 ? "adm-td-pos" : "adm-td-neg"}>{yuan(totProfit)}</strong>
                    &nbsp;·&nbsp;毛利率 <strong>{totRev > 0 ? ((totProfit / totRev) * 100).toFixed(1) : 0}%</strong>
                  </div>
                )
              })()}
            </div>
          )}

          {/* ── 用户 ── */}
          {tab === "users" && (
            <div>
              <div className="adm-heading-row">
                <h1 className="adm-heading">用户列表</h1>
                <button className="adm-btn" onClick={() => downloadCsv(
                  "thinkflow-users.csv",
                  ["邮箱", "显示名", "套餐", "今日积分", "永久积分", "注册时间"],
                  users.map((u) => [u.email, u.display_name ?? "", u.plan, u.credits_daily, u.credits_permanent, u.created_at])
                )}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  导出 CSV
                </button>
              </div>
              <div className="adm-search-row">
                <input
                  className="adm-search"
                  placeholder="搜索邮箱..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") loadUsers(1, userSearch) }}
                />
                <button className="adm-btn" onClick={() => loadUsers(1, userSearch)}>搜索</button>
              </div>
              <p className="adm-count">共 {usersTotal} 位用户</p>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>邮箱</th>
                    <th>显示名</th>
                    <th>套餐</th>
                    <th>今日积分</th>
                    <th>永久积分</th>
                    <th>注册时间</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="adm-td-email">{u.email}</td>
                      <td>{u.display_name ?? "—"}</td>
                      <td><span className={`adm-badge adm-badge--${u.plan}`}>{u.plan}</span></td>
                      <td>{u.credits_daily}</td>
                      <td>{u.credits_permanent}</td>
                      <td className="adm-td-muted">{formatDate(u.created_at)}</td>
                      <td>
                        <button
                          className="adm-link-btn"
                          onClick={() => { setAdjustTarget({ id: u.id, email: u.email }); setAdjustDelta("") }}
                        >
                          调整积分
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="adm-pagination">
                <button className="adm-btn" disabled={usersPage <= 1} onClick={() => loadUsers(usersPage - 1, userSearch)}>上一页</button>
                <span className="adm-page-info">第 {usersPage} 页</span>
                <button className="adm-btn" disabled={usersPage * 20 >= usersTotal} onClick={() => loadUsers(usersPage + 1, userSearch)}>下一页</button>
              </div>
            </div>
          )}

          {/* ── 积分流水 ── */}
          {tab === "credits" && (
            <div>
              <div className="adm-heading-row">
                <h1 className="adm-heading">积分流水</h1>
                <button className="adm-btn" onClick={() => downloadCsv(
                  "thinkflow-credits.csv",
                  ["用户", "变动", "类型", "时间"],
                  txns.map((t) => [t.email, t.delta, t.reason, t.created_at])
                )}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 4 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  导出 CSV
                </button>
              </div>
              <div className="adm-search-row">
                <select
                  className="adm-select"
                  value={txnReason}
                  onChange={(e) => { setTxnReason(e.target.value); loadTxns(e.target.value) }}
                >
                  <option value="">全部类型</option>
                  <option value="run_text">文字消耗</option>
                  <option value="run_image">图文消耗</option>
                  <option value="run_video">视频消耗</option>
                  <option value="purchase">购买充值</option>
                  <option value="refund_text">退款（文字）</option>
                  <option value="refund_image">退款（图文）</option>
                  <option value="refund_video">退款（视频）</option>
                  <option value="admin_adjust">管理员调整</option>
                </select>
              </div>
              <table className="adm-table">
                <thead>
                  <tr><th>用户</th><th>变动</th><th>类型</th><th>时间</th></tr>
                </thead>
                <tbody>
                  {txns.map((t) => (
                    <tr key={t.id}>
                      <td className="adm-td-email">{t.email}</td>
                      <td className={t.delta > 0 ? "adm-td-pos" : "adm-td-neg"}>{t.delta > 0 ? `+${t.delta}` : t.delta}</td>
                      <td><span className="adm-reason">{t.reason}</span></td>
                      <td className="adm-td-muted">{formatDate(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* ── 调整积分弹窗 ── */}
      {adjustTarget && (
        <div className="adm-modal-overlay" onClick={() => setAdjustTarget(null)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="adm-modal__title">调整永久积分</h3>
            <p className="adm-modal__desc">{adjustTarget.email}</p>
            <input
              className="adm-modal__input"
              type="number"
              placeholder="输入数量（正数增加，负数减少）"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdjust() }}
              autoFocus
            />
            <div className="adm-modal__actions">
              <button className="adm-btn" onClick={() => setAdjustTarget(null)}>取消</button>
              <button className="adm-btn adm-btn--primary" onClick={handleAdjust}>确认</button>
            </div>
          </div>
        </div>
      )}

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
.adm-page {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
}
.adm-nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px; height: 56px;
  border-bottom: 1px solid var(--border);
}
.adm-nav__logo {
  font-size: 14px; font-weight: 800; color: var(--text-primary); text-decoration: none;
}
.adm-nav__logo span { font-weight: 400; color: var(--text-muted); }
.adm-nav__back { font-size: 12px; color: var(--text-muted); text-decoration: none; }
.adm-nav__back:hover { color: var(--text-primary); }

.adm-layout {
  display: flex; min-height: calc(100vh - 56px);
}
.adm-aside {
  width: 180px; flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 16px 8px;
  display: flex; flex-direction: column; gap: 2px;
}
.adm-aside__item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; font-size: 13px; font-weight: 500;
  color: var(--text-secondary); background: none; border: none;
  border-radius: var(--radius-md); cursor: pointer; text-align: left;
  transition: background 0.12s, color 0.12s;
}
.adm-aside__item:hover { background: var(--bg-surface); color: var(--text-primary); }
.adm-aside__item.active { background: var(--accent-subtle); color: var(--accent); font-weight: 700; }

.adm-main {
  flex: 1; padding: 32px 40px; overflow-y: auto; position: relative;
}
.adm-heading {
  font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.3px;
}
.adm-heading-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px;
}
.adm-subheading {
  font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-muted); margin: 28px 0 12px;
}

.adm-loading {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-muted); margin-bottom: 20px;
}
.adm-spin {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: adm-spin 0.7s linear infinite;
}
@keyframes adm-spin { to { transform: rotate(360deg); } }

.adm-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;
  margin-bottom: 8px;
}
.adm-stat-card {
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 16px;
}
.adm-stat-card--accent { border-color: var(--accent); background: var(--accent-subtle); }
.adm-stat-card__label { font-size: 11px; color: var(--text-muted); margin: 0 0 4px; }
.adm-stat-card__value { font-size: 28px; font-weight: 800; margin: 0; line-height: 1.1; }
.adm-stat-card__sub { font-size: 11px; color: var(--text-muted); margin: 4px 0 0; }

.adm-search-row {
  display: flex; gap: 8px; margin-bottom: 16px;
}
.adm-search, .adm-select {
  padding: 7px 12px; font-size: 13px;
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary); outline: none;
  transition: border-color 0.15s;
}
.adm-search { min-width: 260px; }
.adm-search:focus, .adm-select:focus { border-color: var(--accent); }
.adm-count { font-size: 12px; color: var(--text-muted); margin: 0 0 12px; }

.adm-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.adm-table th {
  text-align: left; padding: 8px 12px;
  font-size: 11px; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}
.adm-table td {
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  color: var(--text-secondary); line-height: 1.4;
}
.adm-table tr:hover td { background: var(--bg-surface); }
.adm-td-email { font-family: monospace; font-size: 12px; color: var(--text-primary); }
.adm-td-muted { color: var(--text-muted); font-size: 12px; }
.adm-td-pos { color: var(--status-done); font-weight: 700; }
.adm-td-neg { color: var(--status-error); font-weight: 700; }
.adm-reason { font-size: 11px; color: var(--text-muted); font-family: monospace; }

.adm-badge {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 700;
}
.adm-badge--free { background: var(--bg-surface); color: var(--text-muted); }
.adm-badge--subscriber { background: var(--accent-subtle); color: var(--accent); }
.adm-badge--pro { background: #fef3c7; color: #b45309; }

.adm-link-btn {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: var(--accent); padding: 0;
}
.adm-link-btn:hover { text-decoration: underline; }

.adm-pagination {
  display: flex; align-items: center; gap: 12px; margin-top: 20px;
}
.adm-page-info { font-size: 12px; color: var(--text-muted); }

.adm-btn {
  padding: 6px 14px; font-size: 13px; font-weight: 600;
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-md); cursor: pointer; color: var(--text-primary);
  transition: background 0.12s;
}
.adm-btn:hover:not(:disabled) { background: var(--bg-surface); }
.adm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.adm-btn--primary {
  background: var(--accent); color: var(--accent-text); border-color: var(--accent);
}
.adm-btn--primary:hover:not(:disabled) { opacity: 0.85; }

.adm-revenue-total {
  margin-top: 16px; font-size: 13px; color: var(--text-muted);
  padding: 12px 16px; background: var(--bg-node);
  border: 1px solid var(--border); border-radius: var(--radius-md);
}
.adm-revenue-total strong { color: var(--status-done); font-size: 16px; }

/* ── Modal ── */
.adm-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.adm-modal {
  background: var(--bg-node); border: 1px solid var(--border);
  border-radius: var(--radius-xl); padding: 28px; width: 360px;
  display: flex; flex-direction: column; gap: 14px;
}
.adm-modal__title { font-size: 16px; font-weight: 700; margin: 0; }
.adm-modal__desc { font-size: 13px; color: var(--text-muted); margin: 0; font-family: monospace; }
.adm-modal__input {
  padding: 9px 12px; font-size: 14px;
  background: var(--bg-base); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text-primary); outline: none;
  transition: border-color 0.15s;
}
.adm-modal__input:focus { border-color: var(--accent); }
.adm-modal__actions { display: flex; justify-content: flex-end; gap: 8px; }
`
