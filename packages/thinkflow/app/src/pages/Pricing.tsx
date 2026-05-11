import { useState } from "react"
import { useAuthStore } from "../store/authStore"
import { payApi } from "../services/apiClient"

// ─── 积分消耗（与后端 CREDIT_COST 保持一致） ─────────────────────────────────
const CREDIT_COST = { text: 8, image: 18 }

// ─── 套餐配置 ──────────────────────────────────────────────────────────────────
const SUBSCRIPTION = {
  id: "subscriber_monthly",
  name: "订阅版",
  price: "¥39",
  period: "/ 月",
  highlight: true,
  features: [
    "文字内容无限生成（知乎/公众号/日记等）",
    "每月赠送 100 积分图片额度",
    "图文创作最多 6 张图 / 次",
    "云端画布保存（即将开放）",
  ],
  badge: "推荐",
}

const CREDIT_PACKS = [
  {
    id: "credits_100",
    credits: 100,
    price: 15,
    imageRuns: Math.floor(100 / CREDIT_COST.image),   // 5
    textRuns: Math.floor(100 / CREDIT_COST.text),      // 12
  },
  {
    id: "credits_300",
    credits: 300,
    price: 40,
    imageRuns: Math.floor(300 / CREDIT_COST.image),   // 16
    textRuns: Math.floor(300 / CREDIT_COST.text),      // 37
  },
  {
    id: "credits_1000",
    credits: 1000,
    price: 118,
    imageRuns: Math.floor(1000 / CREDIT_COST.image),  // 55
    textRuns: Math.floor(1000 / CREDIT_COST.text),     // 125
  },
]

export function Pricing() {
  const { user } = useAuthStore()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [payType, setPayType] = useState<"wxpay" | "alipay">("wxpay")

  const handlePay = async (planId: string) => {
    if (!user) { window.location.href = "/register"; return }
    setLoadingId(planId)
    const result = await payApi.create(planId, payType).catch((e: Error) => {
      alert(e.message)
      return null
    })
    setLoadingId(null)
    if (result?.payUrl) window.open(result.payUrl, "_blank")
  }

  const isSubscriber = (user?.plan as string) === "subscriber"

  return (
    <div className="pricing-page">

      {/* ── 顶部导航 ── */}
      <nav className="pricing-nav">
        <a href="/" className="pricing-nav__logo">
          ThinkFlow<span> · 思流</span>
        </a>
        {user ? (
          <a href="/app" className="pricing-nav__back">← 返回应用</a>
        ) : (
          <a href="/login" className="pricing-nav__back">登录</a>
        )}
      </nav>

      {/* ── 标题区 ── */}
      <div className="pricing-header">
        <h1 className="pricing-title">选择你的方案</h1>
        <p className="pricing-subtitle">
          内测期间每日赠送 <strong>30 积分</strong>，当天清零 · 订阅版每月无限文字 + 赠 100 积分
        </p>

        {/* 支付方式切换 */}
        <div className="pricing-paytype">
          <button
            className={`pricing-paytype__btn${payType === "wxpay" ? " active" : ""}`}
            onClick={() => setPayType("wxpay")}
          >
            微信支付
          </button>
          <button
            className={`pricing-paytype__btn${payType === "alipay" ? " active" : ""}`}
            onClick={() => setPayType("alipay")}
          >
            支付宝
          </button>
        </div>
      </div>

      {/* ── 积分说明卡片 ── */}
      <div className="pricing-credits-info">
        <div className="pricing-credits-info__col">
          <span className="pricing-credits-info__icon">✏️</span>
          <div>
            <p className="pricing-credits-info__label">文字内容（知乎/公众号/日记等）</p>
            <p className="pricing-credits-info__cost"><strong>{CREDIT_COST.text} 积分</strong> / 次</p>
          </div>
        </div>
        <div className="pricing-credits-info__divider" />
        <div className="pricing-credits-info__col">
          <span className="pricing-credits-info__icon">🖼️</span>
          <div>
            <p className="pricing-credits-info__label">图文内容（小红书，最多 6 张图）</p>
            <p className="pricing-credits-info__cost"><strong>{CREDIT_COST.image} 积分</strong> / 次</p>
          </div>
        </div>
      </div>

      {/* ── 订阅套餐 ── */}
      <section className="pricing-section">
        <h2 className="pricing-section__title">订阅套餐</h2>
        <div className="pricing-sub-card">
          <div className="pricing-sub-card__badge">{SUBSCRIPTION.badge}</div>
          <div className="pricing-sub-card__left">
            <p className="pricing-sub-card__name">{SUBSCRIPTION.name}</p>
            <p className="pricing-sub-card__price">
              {SUBSCRIPTION.price}
              <span className="pricing-sub-card__period">{SUBSCRIPTION.period}</span>
            </p>
            <ul className="pricing-sub-card__features">
              {SUBSCRIPTION.features.map((f) => (
                <li key={f} className="pricing-sub-card__feature">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="pricing-sub-card__right">
            <button
              className="pricing-sub-card__cta"
              disabled={isSubscriber || loadingId === SUBSCRIPTION.id}
              onClick={() => handlePay(SUBSCRIPTION.id)}
            >
              {isSubscriber ? "当前套餐" : loadingId === SUBSCRIPTION.id ? "跳转中..." : "立即订阅"}
            </button>
            {!isSubscriber && (
              <p className="pricing-sub-card__hint">按月订阅，随时可取消</p>
            )}
          </div>
        </div>
      </section>

      {/* ── 积分包 ── */}
      <section className="pricing-section">
        <h2 className="pricing-section__title">积分充值包</h2>
        <p className="pricing-section__desc">
          积分永久有效，用于图文内容创作（小红书等）。文字内容订阅版无限使用，无需积分。
        </p>
        <div className="pricing-packs-grid">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className="pricing-pack">
              <div className="pricing-pack__credits">
                <span className="pricing-pack__num">{pack.credits}</span>
                <span className="pricing-pack__unit">积分</span>
              </div>

              <div className="pricing-pack__equiv">
                <div className="pricing-pack__equiv-row">
                  <span className="pricing-pack__equiv-icon">🖼️</span>
                  <span>可创作 <strong>{pack.imageRuns} 篇</strong>小红书图文</span>
                </div>
                <div className="pricing-pack__equiv-row">
                  <span className="pricing-pack__equiv-icon">✏️</span>
                  <span>或 <strong>{pack.textRuns} 篇</strong>文字内容</span>
                </div>
              </div>

              <div className="pricing-pack__bottom">
                <p className="pricing-pack__price">¥{pack.price}</p>
                <p className="pricing-pack__unit-price">
                  约 ¥{(pack.price / pack.imageRuns).toFixed(1)} / 篇小红书
                </p>
                <button
                  className="pricing-pack__cta"
                  disabled={!user || loadingId === pack.id}
                  onClick={() => handlePay(pack.id)}
                >
                  {!user ? "登录后购买" : loadingId === pack.id ? "跳转中..." : "立即购买"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 免费版说明 ── */}
      <section className="pricing-free-tip">
        <p>
          <strong>免费版</strong>：每日赠送 30 积分，当天清零。等价于每天创作
          <strong> 1 篇小红书图文 + 1 篇文字</strong>，或 <strong>3 篇纯文字内容</strong>。
        </p>
        {!user && (
          <a href="/register" className="pricing-free-tip__cta">免费注册体验 →</a>
        )}
      </section>

      <p className="pricing-footer">支付后积分即时到账 · 问题请联系 hi@thinkflow.app</p>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
.pricing-page {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  padding-bottom: 60px;
}

/* ── Nav ── */
.pricing-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  height: 60px;
  border-bottom: 1px solid var(--border);
}
.pricing-nav__logo {
  font-size: 15px; font-weight: 800; letter-spacing: -0.02em;
  color: var(--text-primary); text-decoration: none;
}
.pricing-nav__logo span { font-weight: 400; color: var(--text-muted); }
.pricing-nav__back {
  font-size: 13px; color: var(--text-muted); text-decoration: none;
  transition: color 0.15s;
}
.pricing-nav__back:hover { color: var(--text-primary); }

/* ── Header ── */
.pricing-header {
  text-align: center;
  padding: 48px 24px 32px;
}
.pricing-title {
  font-size: 30px; font-weight: 800; letter-spacing: -0.5px;
  margin: 0 0 10px;
}
.pricing-subtitle {
  font-size: 14px; color: var(--text-muted); margin: 0 0 24px; line-height: 1.6;
}
.pricing-paytype {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.pricing-paytype__btn {
  padding: 7px 20px; font-size: 13px; font-weight: 600;
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  transition: background 0.12s, color 0.12s;
}
.pricing-paytype__btn.active { background: var(--accent); color: var(--accent-text); }

/* ── 积分说明 ── */
.pricing-credits-info {
  display: flex;
  align-items: center;
  max-width: 680px;
  margin: 0 auto 40px;
  padding: 16px 28px;
  background: var(--bg-node);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  gap: 0;
}
.pricing-credits-info__col {
  display: flex; align-items: center; gap: 14px; flex: 1;
}
.pricing-credits-info__icon { font-size: 22px; flex-shrink: 0; }
.pricing-credits-info__label {
  font-size: 12px; color: var(--text-muted); margin: 0 0 4px;
}
.pricing-credits-info__cost {
  font-size: 15px; color: var(--text-primary); margin: 0;
}
.pricing-credits-info__divider {
  width: 1px; height: 40px; background: var(--border); margin: 0 28px;
}

/* ── Section ── */
.pricing-section {
  max-width: 860px; margin: 0 auto 48px; padding: 0 24px;
}
.pricing-section__title {
  font-size: 13px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--text-muted); margin: 0 0 16px;
}
.pricing-section__desc {
  font-size: 13px; color: var(--text-muted); margin: -8px 0 20px; line-height: 1.6;
}

/* ── 订阅卡片 ── */
.pricing-sub-card {
  display: flex; align-items: center; gap: 32px;
  padding: 28px 32px;
  background: var(--bg-node);
  border: 1.5px solid var(--accent);
  border-radius: var(--radius-xl);
  box-shadow: 0 0 0 1px var(--accent-glow), 0 4px 24px var(--accent-glow);
  position: relative;
}
.pricing-sub-card__badge {
  position: absolute; top: -11px; left: 28px;
  background: var(--accent); color: var(--accent-text);
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  padding: 3px 12px; border-radius: 20px;
}
.pricing-sub-card__left { flex: 1; }
.pricing-sub-card__name {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--text-muted); margin: 0 0 8px;
}
.pricing-sub-card__price {
  font-size: 40px; font-weight: 900; letter-spacing: -1px;
  color: var(--text-primary); margin: 0 0 16px; line-height: 1;
}
.pricing-sub-card__period {
  font-size: 14px; font-weight: 400; color: var(--text-muted);
}
.pricing-sub-card__features {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.pricing-sub-card__feature {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
}
.pricing-sub-card__feature svg {
  flex-shrink: 0; margin-top: 1px; color: var(--status-done);
}
.pricing-sub-card__right {
  display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0;
}
.pricing-sub-card__cta {
  padding: 12px 32px;
  background: var(--accent); color: var(--accent-text);
  border: none; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 700; cursor: pointer; white-space: nowrap;
  transition: opacity 0.15s, transform 0.1s;
}
.pricing-sub-card__cta:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.pricing-sub-card__cta:disabled { opacity: 0.45; cursor: not-allowed; }
.pricing-sub-card__hint {
  font-size: 11px; color: var(--text-muted); margin: 0; text-align: center;
}
@media (max-width: 640px) {
  .pricing-sub-card { flex-direction: column; align-items: flex-start; }
  .pricing-sub-card__right { width: 100%; }
  .pricing-sub-card__cta { width: 100%; }
}

/* ── 积分包网格 ── */
.pricing-packs-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
@media (max-width: 640px) {
  .pricing-packs-grid { grid-template-columns: 1fr; }
}
.pricing-pack {
  background: var(--bg-node);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 24px 20px;
  display: flex; flex-direction: column; gap: 16px;
}
.pricing-pack__credits {
  display: flex; align-items: baseline; gap: 4px;
}
.pricing-pack__num {
  font-size: 36px; font-weight: 900; letter-spacing: -1px; color: var(--text-primary);
}
.pricing-pack__unit {
  font-size: 13px; color: var(--text-muted); font-weight: 600;
}
.pricing-pack__equiv {
  display: flex; flex-direction: column; gap: 6px; flex: 1;
}
.pricing-pack__equiv-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--text-secondary); line-height: 1.5;
}
.pricing-pack__equiv-icon { font-size: 15px; flex-shrink: 0; }
.pricing-pack__bottom {
  display: flex; flex-direction: column; gap: 4px;
  padding-top: 12px; border-top: 1px solid var(--border);
}
.pricing-pack__price {
  font-size: 24px; font-weight: 800; letter-spacing: -0.5px;
  color: var(--text-primary); margin: 0;
}
.pricing-pack__unit-price {
  font-size: 11px; color: var(--text-muted); margin: 0 0 8px;
}
.pricing-pack__cta {
  width: 100%; padding: 10px;
  background: transparent; border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px; font-weight: 700; color: var(--text-primary);
  cursor: pointer; transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.pricing-pack__cta:hover:not(:disabled) {
  background: var(--accent); color: var(--accent-text); border-color: var(--accent);
}
.pricing-pack__cta:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── 免费版说明 ── */
.pricing-free-tip {
  max-width: 860px; margin: 0 auto 12px; padding: 20px 28px;
  background: var(--accent-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  font-size: 13px; color: var(--text-secondary); line-height: 1.7;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
  margin-left: 24px; margin-right: 24px;
  max-width: calc(860px);
}
@media (max-width: 860px) {
  .pricing-free-tip { margin: 0 24px 12px; flex-direction: column; align-items: flex-start; }
}
.pricing-free-tip p { margin: 0; }
.pricing-free-tip__cta {
  font-size: 13px; font-weight: 700; color: var(--accent);
  text-decoration: none; white-space: nowrap;
}
.pricing-free-tip__cta:hover { text-decoration: underline; }

/* ── Footer ── */
.pricing-footer {
  text-align: center; font-size: 12px; color: var(--text-muted);
  padding: 16px 24px 0;
}
`
