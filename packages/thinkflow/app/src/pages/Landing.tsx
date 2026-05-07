import { useEffect, useRef, useState } from "react"
import type React from "react"

// ── Scroll-triggered fade-in hook ────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("lp-visible")
          obs.disconnect()
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

// ── 标题逐行滑入 hook（每次进入视口都触发）──────────────────────────────────
function useRevealLines(threshold = 0.1) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("lp-title-visible")
        } else {
          el.classList.remove("lp-title-visible")
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

export function Landing() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("thinkflow-theme")
    return stored === "dark" ? "dark" : "light"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("thinkflow-theme", next)
  }

  const refPain = useFadeIn()
  const refBenefits = useFadeIn()
  const refUsecases = useFadeIn()
  const refCta = useFadeIn()

  // 各区域标题滑入
  const refPainTitle = useRevealLines()
  const refBenefitsTitle = useRevealLines()
  const refUsecasesTitle = useRevealLines()
  const refHeroTitle = useRevealLines(0.05)

  return (
    <div className="lp-root">
      {/* ── Navbar：只保留 Logo + 主题切换，不放 CTA 按钮 ─────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="lp-nav__name">ThinkFlow · 思流</span>
          <span className="lp-nav__tag">内测版</span>
        </div>
        <button className="lp-nav__theme" onClick={toggleTheme} title="切换主题" aria-label="切换主题">
          {theme === "light" ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          )}
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__inner lp-hero-enter">
          <h1 className="lp-hero__title lp-title-reveal" ref={refHeroTitle}>
            <span className="lp-title-line">让思维流动，</span>
            <span className="lp-title-line lp-hero__highlight">让创作发生</span>
          </h1>
          <p className="lp-hero__desc">
            把灵感、指令、素材连成一张工作流图——搭好一次，以后每次点击运行，AI 就替你把想法变成内容。
          </p>
          <div className="lp-hero__cta-group">
            <a href="/app" className="lp-btn lp-btn--hero">免费开始用</a>
            <a href="#how" className="lp-btn lp-btn--outline">看看怎么用 ↓</a>
          </div>
          <p className="lp-hero__microcopy">无需注册 · 数据只存你本地 · 永久免费</p>
        </div>

        {/* 产品画布预览 */}
        <div className="lp-hero__preview">
          <div className="lp-preview">
            {/* macOS 风格标题栏 */}
            <div className="lp-preview__titlebar">
              <span className="lp-preview__win-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-preview__win-dot" style={{ background: "#febc2e" }} />
              <span className="lp-preview__win-dot" style={{ background: "#28c840" }} />
              <span className="lp-preview__titlebar-label">工作流示例：内容矩阵运营</span>
            </div>
            <div className="lp-preview__canvas">
              {/* 多种输入节点 */}
              <div className="lp-preview__inputs">
                <div className="lp-pnode lp-pnode--input" style={{ borderColor: "rgba(59,130,246,0.5)" }}>
                  <div className="lp-pnode__header">
                    <span className="lp-pnode__dot" style={{ background: "#3b82f6" }} />
                    <span className="lp-pnode__type">📝 文本输入</span>
                  </div>
                  <div className="lp-pnode__body">今天分享一个早起习惯…</div>
                </div>
                <div className="lp-pnode lp-pnode--input" style={{ borderColor: "rgba(16,185,129,0.5)" }}>
                  <div className="lp-pnode__header">
                    <span className="lp-pnode__dot" style={{ background: "#10b981" }} />
                    <span className="lp-pnode__type">🔗 链接输入</span>
                  </div>
                  <div className="lp-pnode__body">https://example.com/…</div>
                </div>
                <div className="lp-pnode lp-pnode--input" style={{ borderColor: "rgba(139,92,246,0.5)" }}>
                  <div className="lp-pnode__header">
                    <span className="lp-pnode__dot" style={{ background: "#8b5cf6" }} />
                    <span className="lp-pnode__type">🧠 记忆</span>
                  </div>
                  <div className="lp-pnode__body">账号人设 · 写作风格</div>
                </div>
              </div>

              <div className="lp-preview__arrow lp-preview__arrow--v">
                <svg width="14" height="36" viewBox="0 0 14 36" fill="none"><path d="M7 0v30M1 24l6 7 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

              <div className="lp-pnode lp-pnode--agent">
                <div className="lp-pnode__header">
                  <span className="lp-pnode__dot" style={{ background: "var(--accent)" }} />
                  <span className="lp-pnode__type">AI Agent</span>
                  <span className="lp-pnode__status">运行中…</span>
                </div>
                <div className="lp-pnode__body">矩阵模式 · 3 个账号人设</div>
              </div>

              <div className="lp-preview__arrow lp-preview__arrow--v">
                <svg width="14" height="36" viewBox="0 0 14 36" fill="none"><path d="M7 0v30M1 24l6 7 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

              <div className="lp-preview__outputs">
                {[
                  { label: "公众号", color: "#07c160", fmt: "长文" },
                  { label: "小红书", color: "#f43f5e", fmt: "图文" },
                  { label: "知乎", color: "#0084ff", fmt: "长文" },
                  { label: "视频脚本", color: "#f59e0b", fmt: "视频" },
                ].map((o) => (
                  <div key={o.label} className="lp-pnode lp-pnode--output">
                    <span className="lp-pnode__dot" style={{ background: o.color }} />
                    <span className="lp-pnode__type">{o.label}</span>
                    <span className="lp-pnode__fmt">{o.fmt}</span>
                    <span className="lp-pnode__check">✓</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 痛点对比 ────────────────────────────────────────────────────────── */}
      <section className="lp-pain" id="how">
        <div className="lp-container" ref={refPain}>
          <div className="lp-section-eyebrow">听起来熟悉吗？</div>
          <h2 className="lp-section-title lp-title-reveal" ref={refPainTitle}>
            <span className="lp-title-line">用 AI 写内容，</span>
            <span className="lp-title-line">每次都要重头解释一遍</span>
          </h2>
          <div className="lp-pain__table">
            <div className="lp-pain__table-head">
              <div className="lp-pain__th lp-pain__th--scenario">场景</div>
              <div className="lp-pain__th lp-pain__th--before">普通 AI 对话</div>
              <div className="lp-pain__th lp-pain__th--after">用 ThinkFlow</div>
            </div>
            {[
              {
                scenario: "背景和风格",
                before: "每次开新对话都要重新解释",
                after: "存进记忆库，以后自动带上",
              },
              {
                scenario: "多平台出稿",
                before: "每个平台要单独开对话改写",
                after: "一次运行，各平台同时出稿",
              },
              {
                scenario: "定时生成",
                before: "AI 不会主动执行，靠你手动",
                after: "设好时间，天天自动跑",
              },
              {
                scenario: "多账号运营",
                before: "每个账号单独写，重复劳动",
                after: "矩阵模式，各账号各自风格",
              },
            ].map((row) => (
              <div key={row.scenario} className="lp-pain__table-row">
                <div className="lp-pain__td lp-pain__td--scenario">{row.scenario}</div>
                <div className="lp-pain__td lp-pain__td--before">
                  <span className="lp-pain__x">✗</span>{row.before}
                </div>
                <div className="lp-pain__td lp-pain__td--after">
                  <span className="lp-pain__check">✓</span>{row.after}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 核心收益 ─────────────────────────────────────────────────────────── */}
      <section className="lp-benefits" id="features">
        <div className="lp-container" ref={refBenefits}>
          <div className="lp-section-eyebrow">ThinkFlow 能做什么</div>
          <h2 className="lp-section-title lp-title-reveal" ref={refBenefitsTitle}>
            <span className="lp-title-line">不只是聊天，</span>
            <span className="lp-title-line">而是真正帮你干活</span>
          </h2>
          <div className="lp-benefits__grid">
            {BENEFITS.map((b) => (
              <div key={b.title} className="lp-benefit-card">
                <div className="lp-benefit-card__icon">{b.icon}</div>
                <div className="lp-benefit-card__title">{b.title}</div>
                <div className="lp-benefit-card__body">{b.body}</div>
                <div className="lp-benefit-card__hook">{b.hook}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 使用场景 ─────────────────────────────────────────────────────────── */}
      <section className="lp-usecases">
        <div className="lp-container" ref={refUsecases}>
          <div className="lp-section-eyebrow">谁在用 ThinkFlow</div>
          <h2 className="lp-section-title lp-title-reveal" ref={refUsecasesTitle}>
            <span className="lp-title-line">这些人已经在省时间了</span>
          </h2>
          <div className="lp-usecases__grid">
            {USECASES.map((u) => (
              <div key={u.role} className="lp-usecase">
                <div className="lp-usecase__icon">{u.icon}</div>
                <div className="lp-usecase__role">{u.role}</div>
                <div className="lp-usecase__desc">{u.desc}</div>
                <div className="lp-usecase__result">{u.result}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最终 CTA ─────────────────────────────────────────────────────────── */}
      <section className="lp-final-cta">
        <div className="lp-container lp-final-cta__inner" ref={refCta}>
          <h2 className="lp-final-cta__title">试一试，五分钟就够</h2>
          <p className="lp-final-cta__desc">
            不用安装，不用注册，打开浏览器就能用。
          </p>
          <a href="/app" className="lp-btn lp-btn--hero">搭我的第一个工作流 →</a>
          <p className="lp-final-cta__microcopy">永久免费 · 数据只存本地 · 随时导出</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer__main">
            <div className="lp-footer__brand">
              <span className="lp-footer__logo">ThinkFlow · 思流</span>
              <span className="lp-footer__tagline">AI 工作流创作平台 · 内测版 v0.1</span>
            </div>
            <div className="lp-footer__links">
              <a href="/app" className="lp-footer__link">进入应用</a>
              <button
                className="lp-footer__link"
                onClick={() => document.getElementById("lp-disclaimer")?.scrollIntoView({ behavior: "smooth" })}
              >
                免责声明
              </button>
            </div>
          </div>
          <div className="lp-footer__disclaimer" id="lp-disclaimer">
            <div className="lp-disclaimer-title">安全说明与免责声明</div>
            <div className="lp-disclaimer-grid">
              <p><strong>AI 内容：</strong>所有 AI 输出仅供参考，用户应自行审核准确性和合法性后再发布使用。</p>
              <p><strong>数据存储：</strong>工作流配置与记忆库数据均存储在您本地的浏览器中，不上传任何服务器。</p>
              <p><strong>API 密钥：</strong>AI 调用通过您本地配置的服务进行，ThinkFlow 团队不持有或存储您的密钥。</p>
              <p><strong>内容责任：</strong>用户对利用本工具生成和发布的内容承担全部责任。</p>
              <p><strong>法律合规：</strong>请确保使用本工具生成的内容符合所在地区的法律法规及平台服务条款。</p>
            </div>
          </div>
          <div className="lp-footer__bottom">
            <span>© 2026 ThinkFlow. 保留所有权利。</span>
            <span>本产品处于内测阶段，功能持续迭代中。</span>
          </div>
        </div>
      </footer>

      <style>{LANDING_STYLES}</style>
    </div>
  )
}

// ── SVG 图标 ──────────────────────────────────────────────────────────────────

function IconZap() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
}
function IconBookmark() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
}
function IconClock() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function IconGrid() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IconVideo() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
}
function IconTrendingUp() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
}
function IconPen() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
}
function IconUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
function IconRss() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
}

// ── 数据 ─────────────────────────────────────────────────────────────────────

const BENEFITS: { icon: React.ReactNode; title: string; body: string; hook: string }[] = [
  {
    icon: <IconZap />,
    title: "一次运行，多平台同时出稿",
    body: "不需要写完公众号再开新对话改小红书。连好节点，点运行，公众号、小红书、知乎各自拿到符合平台风格的版本。",
    hook: "一篇变三篇，省 2 小时",
  },
  {
    icon: <IconBookmark />,
    title: "你说过的话，AI 不会忘",
    body: "把写作风格、常用素材、账号定位存进记忆库，以后每次运行都会自动带上，不用每次都重新解释「我是做什么的」。",
    hook: "背景说一次，永久生效",
  },
  {
    icon: <IconClock />,
    title: "定个时间，不用你盯着",
    body: "接上 RSS 或信息源，设好定时，每天早上 9 点 AI 自动抓取内容、自动生成日报。你睡着，它在干活。",
    hook: "配置一次，天天自动跑",
  },
  {
    icon: <IconGrid />,
    title: "10 个账号，1 个人也能撑得住",
    body: "把每个账号的人设存进去，点「矩阵运行」，AI 给每个账号写出各自不同风格的内容，一次打包下载。",
    hook: "1 小时搞定 10 个账号",
  },
  {
    icon: <IconVideo />,
    title: "输入文稿，直接出带配音的视频",
    body: "不用学剪辑，不用录音。AI 帮你分镜、写旁白、配音，渲染成竖版 MP4，下载就能发。",
    hook: "文字直接变短视频",
  },
  {
    icon: <IconTrendingUp />,
    title: "用得越久，越顺手",
    body: "每次创作自动存入作品库，素材和偏好慢慢积累，AI 对你的了解越来越深，输出越来越稳。",
    hook: "越用越贴合你的风格",
  },
]

const USECASES: { icon: React.ReactNode; role: string; desc: string; result: string }[] = [
  {
    icon: <IconPen />,
    role: "内容创作者",
    desc: "每天扔一个话题或链接进去，公众号、小红书、知乎三个版本一起出，每个平台各有侧重",
    result: "每篇少花 2 小时",
  },
  {
    icon: <IconUsers />,
    role: "多账号运营者",
    desc: "矩阵模式批量生成多个账号各自风格的内容，一键打包下载，复制粘贴就能发",
    result: "1 个人撑 10 个账号",
  },
  {
    icon: <IconRss />,
    role: "信息整理控",
    desc: "接 RSS 或关键词订阅，设好时间，每天自动生成行业日报、读书笔记、每周总结",
    result: "不用手动整理，全自动跑",
  },
  {
    icon: <IconVideo />,
    role: "短视频创作者",
    desc: "把文稿扔进去，AI 帮你分镜、配音、渲染竖版 MP4，下载就能发，不用开剪辑软件",
    result: "文字直接出短视频",
  },
]

// ── 样式 ─────────────────────────────────────────────────────────────────────

const LANDING_STYLES = `
.lp-root {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-y: auto;
  overflow-x: hidden;
}

.lp-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* ── Navbar ── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(16px);
}
.lp-nav__logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
}
.lp-nav__tag {
  font-family: var(--font-code);
  font-size: 10px;
  padding: 2px 7px;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: 999px;
  border: 1px solid var(--border-accent);
}
.lp-nav__theme {
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 6px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  transition: border-color 0.15s, color 0.15s;
}
.lp-nav__theme:hover { border-color: var(--border-hover); color: var(--text-primary); }

/* ── Buttons ── */
.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
  border: 1px solid transparent;
  white-space: nowrap;
}
.lp-btn--hero {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  padding: 14px 32px;
  font-size: 15px;
  font-weight: 700;
  box-shadow: var(--btn-primary-shadow);
}
.lp-btn--hero:hover { opacity: 0.85; transform: translateY(-1px); }
.lp-btn--outline {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
  padding: 14px 24px;
  font-size: 14px;
}
.lp-btn--outline:hover { border-color: var(--border-hover); color: var(--text-primary); }

/* ── Section 共用 ── */
.lp-section-eyebrow {
  font-family: var(--font-code);
  font-size: 11px;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: var(--accent);
  text-align: center;
  margin-bottom: 12px;
}
.lp-section-title {
  font-family: var(--font-display);
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 800;
  letter-spacing: -0.8px;
  text-align: center;
  color: var(--text-primary);
  margin-bottom: 48px;
  /* 允许多行 span 正常显示 */
  line-height: 1.25;
}

/* ── Hero ── */
.lp-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 32px 64px;
  gap: 52px;
}
.lp-hero__inner {
  max-width: 680px;
  text-align: center;
}
.lp-hero__title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5.5vw, 58px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -2px;
  margin-bottom: 20px;
  color: var(--text-primary);
}
.lp-hero__highlight { color: var(--accent); }
.lp-hero__desc {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-secondary);
  max-width: 520px;
  margin: 0 auto 32px;
}
.lp-hero__cta-group {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.lp-hero__microcopy {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 0.2px;
}

/* ── 产品预览 ── */
.lp-hero__preview {
  width: 100%;
  max-width: 860px;
}
.lp-preview {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-panel);
}
.lp-preview__titlebar {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border);
}
/* 标题栏三圆点（macOS 风格）*/
.lp-preview__win-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lp-preview__titlebar-label {
  margin-left: 8px;
  font-family: var(--font-code);
  font-size: 11px;
  color: var(--text-muted);
}
.lp-preview__canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 32px;
  gap: 10px;
}
.lp-preview__inputs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}
.lp-preview__arrow--v {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lp-pnode {
  background: var(--bg-node);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  min-width: 140px;
  box-shadow: var(--shadow-node);
}
.lp-pnode--input { border-color: rgba(59,130,246,0.5); }
.lp-pnode--agent { border-color: var(--border-accent); }
.lp-pnode--output {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  min-width: 100px;
}
.lp-pnode__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.lp-pnode__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lp-pnode__type {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--font-display);
}
.lp-pnode__status {
  margin-left: auto;
  font-family: var(--font-code);
  font-size: 10px;
  color: var(--status-running);
  animation: lp-blink 1.2s infinite;
}
@keyframes lp-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.lp-pnode__body {
  font-size: 11.5px;
  color: var(--text-secondary);
  line-height: 1.5;
}
.lp-pnode__check {
  margin-left: auto;
  color: var(--status-done);
  font-size: 12px;
  font-weight: 700;
}
.lp-pnode__fmt {
  margin-left: auto;
  font-family: var(--font-code);
  font-size: 9px;
  color: var(--text-muted);
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
}
.lp-preview__arrow {
  color: var(--text-muted);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.lp-preview__outputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* ── 痛点对比 ── */
.lp-pain {
  padding: 80px 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
/* 对比表格 */
.lp-pain__table {
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.lp-pain__table-head {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  background: var(--bg-surface-2);
  border-bottom: 1px solid var(--border);
}
.lp-pain__th {
  padding: 13px 20px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}
.lp-pain__th--before {
  border-left: 1px solid var(--border);
  color: var(--text-muted);
}
.lp-pain__th--after {
  border-left: 1px solid var(--border);
  color: var(--accent);
}
.lp-pain__table-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr;
  border-top: 1px solid var(--border);
  transition: background 0.15s;
}
.lp-pain__table-row:first-of-type { border-top: none; }
.lp-pain__table-row:hover { background: var(--bg-surface-2); }
.lp-pain__td {
  padding: 16px 20px;
  font-size: 13.5px;
  line-height: 1.6;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.lp-pain__td--scenario {
  font-family: var(--font-display);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-secondary);
  align-items: center;
  background: var(--bg-base);
}
.lp-pain__td--before {
  border-left: 1px solid var(--border);
  color: var(--text-secondary);
}
.lp-pain__td--after {
  border-left: 1px solid var(--border);
  color: var(--text-primary);
  font-weight: 500;
}
.lp-pain__x {
  font-size: 11px;
  font-weight: 700;
  color: var(--status-error);
  flex-shrink: 0;
  margin-top: 3px;
  opacity: 0.7;
  line-height: 1;
}
.lp-pain__check {
  font-size: 11px;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 3px;
  line-height: 1;
}
@media (max-width: 680px) {
  .lp-pain__table-head,
  .lp-pain__table-row {
    grid-template-columns: 1fr;
  }
  .lp-pain__th--before,
  .lp-pain__th--after,
  .lp-pain__td--before,
  .lp-pain__td--after {
    border-left: none;
    border-top: 1px solid var(--border);
  }
  .lp-pain__td--scenario { display: none; }
  .lp-pain__th--scenario { display: none; }
}

/* ── 收益卡片 ── */
.lp-benefits {
  padding: 80px 0;
}
.lp-benefits__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}
.lp-benefit-card {
  padding: 28px 24px;
  background: var(--bg-surface);
}
.lp-benefit-card__icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 16px;
}
.lp-benefit-card__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.lp-benefit-card__body {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.lp-benefit-card__hook {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  opacity: 0.8;
}

/* ── 使用场景 ── */
.lp-usecases {
  padding: 80px 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.lp-usecases__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.lp-usecase {
  padding: 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-node);
}
.lp-usecase__icon {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: 12px;
}
.lp-usecase__role {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.lp-usecase__desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: 14px;
}
.lp-usecase__result {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

/* ── 最终 CTA ── */
.lp-final-cta {
  padding: 100px 0;
}
.lp-final-cta__inner {
  text-align: center;
}
.lp-final-cta__title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 16px;
  color: var(--text-primary);
  line-height: 1.15;
}
.lp-final-cta__desc {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 32px;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}
.lp-final-cta__microcopy {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 14px;
}

/* ── Footer ── */
.lp-footer {
  padding: 48px 0 32px;
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
}
.lp-footer__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.lp-footer__brand { display: flex; flex-direction: column; gap: 4px; }
.lp-footer__logo {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
}
.lp-footer__tagline { font-size: 12px; color: var(--text-muted); }
.lp-footer__links { display: flex; gap: 20px; }
.lp-footer__link {
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-body);
  transition: color 0.15s;
}
.lp-footer__link:hover { color: var(--text-primary); }
.lp-footer__disclaimer {
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  margin-bottom: 24px;
}
.lp-disclaimer-title {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.lp-disclaimer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}
.lp-disclaimer-grid p { font-size: 11.5px; line-height: 1.7; color: var(--text-secondary); }
.lp-disclaimer-grid strong { color: var(--text-primary); font-weight: 600; }
.lp-footer__bottom {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--text-muted);
}

/* ── Hero 入场动效 ── */
@keyframes lp-hero-in {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lp-hero-enter {
  animation: lp-hero-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* ── 标题逐行滑入（clip reveal 效果）── */
.lp-title-reveal {
  /* 初始状态：每行都隐藏 */
}
.lp-title-line {
  display: block;
  overflow: hidden;
  /* 给一点竖向空间防止遮裁文字 */
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}
.lp-title-line::after {
  /* 用 ::after 实现 reveal 遮罩的替代方案：直接 transform 行本身 */
  content: none;
}
/* 初始状态：下移且透明 */
.lp-title-reveal .lp-title-line {
  transform: translateY(60px);
  opacity: 0;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
/* 触发后：滑入 */
.lp-title-reveal.lp-title-visible .lp-title-line {
  transform: translateY(0);
  opacity: 1;
}
/* 第二行延迟 */
.lp-title-reveal.lp-title-visible .lp-title-line:nth-child(2) {
  transition-delay: 0.12s;
}
/* Hero 标题：直接可见，用 lp-hero-enter 控制 */
.lp-hero__title.lp-title-reveal .lp-title-line {
  transform: translateY(0);
  opacity: 1;
}
/* Hero 入场后再触发标题效果 */
.lp-hero-enter .lp-hero__title.lp-title-reveal .lp-title-line {
  transform: translateY(40px);
  opacity: 0;
  transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1),
              opacity 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}
.lp-hero-enter .lp-hero__title.lp-title-reveal.lp-title-visible .lp-title-line {
  transform: translateY(0);
  opacity: 1;
}
.lp-hero-enter .lp-hero__title.lp-title-visible .lp-title-line:nth-child(2) {
  transition-delay: 0.18s;
}

/* ── Scroll-triggered fade-in ── */
@keyframes lp-fade-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 初始隐藏状态 */
.lp-pain .lp-container,
.lp-benefits .lp-container,
.lp-usecases .lp-container,
.lp-final-cta .lp-container {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}

/* 触发 visible 后显示 */
.lp-pain .lp-container.lp-visible,
.lp-benefits .lp-container.lp-visible,
.lp-usecases .lp-container.lp-visible,
.lp-final-cta .lp-container.lp-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Benefits 卡片 hover 上浮 ── */
.lp-benefit-card {
  transition: background 0.18s, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s;
}
.lp-benefit-card:hover {
  background: var(--bg-surface-2);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  z-index: 1;
  position: relative;
}

/* ── UseCase 卡片 hover ── */
.lp-usecase {
  transition: border-color 0.15s, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s;
}
.lp-usecase:hover {
  border-color: var(--accent);
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.07);
}

/* ── Hero 预览卡片轻微浮动 ── */
@keyframes lp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.lp-hero__preview {
  animation: lp-float 4s ease-in-out infinite;
  animation-delay: 1s;
}

/* ── CTA 按钮呼吸脉冲 ── */
@keyframes lp-pulse {
  0%, 100% { box-shadow: var(--btn-primary-shadow), 0 0 0 0px rgba(0,0,0,0.12); }
  50% { box-shadow: var(--btn-primary-shadow), 0 0 0 6px rgba(0,0,0,0.06); }
}
.lp-final-cta .lp-btn--hero {
  animation: lp-pulse 2.5s ease-in-out infinite;
  animation-delay: 0.5s;
}
`
