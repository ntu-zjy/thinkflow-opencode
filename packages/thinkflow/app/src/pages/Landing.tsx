import { useEffect, useRef, useState } from "react"
import type React from "react"

// ── 每次进入视口都触发 ────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ── 只触发一次的 fade-in ──────────────────────────────────────────────────────
function useFadeIn(threshold = 0.1) {
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

export function Landing() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("thinkflow-theme")
    return stored === "dark" ? "dark" : "light"
  })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    localStorage.setItem("thinkflow-theme", next)
  }

  const heroTitle = useInView(0.05)
  const painTitle = useInView(0.1)
  const benefitsTitle = useInView(0.1)
  const usecasesTitle = useInView(0.1)

  const refComparison = useFadeIn()
  const refBenefits = useFadeIn()
  const refUsecases = useFadeIn()
  const refCta = useFadeIn()

  return (
    <div className="lp-root">
      {/* ══ Navbar ══════════════════════════════════════════════════════════════ */}
      <nav className="lp-nav">
        <div className="lp-nav__logo">
          ThinkFlow<span className="lp-nav__logo-cn"> · 思流</span>
        </div>

        <div className="lp-nav__center">
          <a href="#how" className="lp-nav__link">竞品对比</a>
          <a href="#features" className="lp-nav__link">核心功能</a>
          <a href="#usecases" className="lp-nav__link">使用场景</a>
        </div>

        <div className="lp-nav__right">
          <button className="lp-nav__theme" onClick={toggleTheme} aria-label="切换主题">
            {theme === "light" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            )}
          </button>
          <a href="/app" className="lp-nav__cta">进入应用</a>
        </div>

        {/* 移动端 */}
        <button className="lp-nav__hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="菜单">
          <span /><span /><span />
        </button>
        {menuOpen && (
          <div className="lp-nav__mobile">
            <a href="#how" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>工作流</a>
            <a href="#features" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>核心功能</a>
            <a href="#usecases" className="lp-nav__mobile-link" onClick={() => setMenuOpen(false)}>使用场景</a>
            <a href="/app" className="lp-nav__mobile-link lp-nav__mobile-cta">进入应用 →</a>
          </div>
        )}
      </nav>

      {/* ══ Hero ════════════════════════════════════════════════════════════════ */}
      <section className="lp-hero" ref={heroTitle.ref as React.RefObject<HTMLElement>}>
        <div className="lp-hero__left">
          <h1 className={`lp-hero__title${heroTitle.visible ? " lp-reveal-visible" : ""}`}>
            <span className="lp-reveal-line">让思维流动，</span>
            <span className="lp-reveal-line lp-hero__accent">
              让创作<span className="lp-hero__accent-bold">发生.</span>
            </span>
          </h1>
          <p className="lp-hero__desc">
            
          </p>
          <div className="lp-hero__stats">
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-num">5+ 种</span>
              <span className="lp-hero__stat-label">输入类型</span>
            </div>
            <div className="lp-hero__stat-divider" />
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-num">6+ 种</span>
              <span className="lp-hero__stat-label">输出格式</span>
            </div>
            <div className="lp-hero__stat-divider" />
            <div className="lp-hero__stat">
              <span className="lp-hero__stat-num">24/7</span>
              <span className="lp-hero__stat-label">定时任务</span>
            </div>
          </div>
          <div className="lp-hero__actions">
            <a href="/app" className="lp-btn-primary">试一试？</a>
            <a href="#how" className="lp-btn-ghost">看看怎么用 ↓</a>
          </div>
        </div>

        <div className="lp-hero__right">
          <div className="lp-canvas-preview">
            <div className="lp-canvas-preview__bar">
              <span className="lp-dot" style={{ background: "#ff5f57" }} />
              <span className="lp-dot" style={{ background: "#febc2e" }} />
              <span className="lp-dot" style={{ background: "#28c840" }} />
              <span className="lp-canvas-preview__label">ThinkFlow · 工作流</span>
            </div>
            {/* SVG 节点连线图 */}
            <svg className="lp-flow-svg" viewBox="0 0 480 248" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* 流动粒子：每条线独立 dashoffset 动画 */}
                {[
                  { id: "flow0", delay: "0s" },
                  { id: "flow1", delay: "0.4s" },
                  { id: "flow2", delay: "0.8s" },
                  { id: "flow3", delay: "1.2s" },
                  { id: "flow4", delay: "1.6s" },
                  { id: "flow-out0", delay: "0s" },
                  { id: "flow-out1", delay: "0.5s" },
                  { id: "flow-out2", delay: "1.0s" },
                  { id: "flow-out3", delay: "1.5s" },
                ].map(({ id, delay }) => (
                  <style key={id}>{`
                    .${id} { stroke-dasharray: 6 12; stroke-dashoffset: 0; animation: dash-flow 1.8s linear infinite; animation-delay: ${delay}; }
                  `}</style>
                ))}
                <style>{`
                  @keyframes dash-flow { to { stroke-dashoffset: -54; } }
                  .lp-agent-glow { animation: agent-pulse 2s ease-in-out infinite; }
                  @keyframes agent-pulse { 0%,100%{opacity:0.15} 50%{opacity:0.35} }
                `}</style>
              </defs>

              {/* ── 输入节点 (5个) h=28 ── */}
              {[
                { x: 4,   label: "📝 文本",  color: "#3b82f6" },
                { x: 100, label: "🔗 链接",  color: "#10b981" },
                { x: 196, label: "🧠 记忆",  color: "#8b5cf6" },
                { x: 292, label: "📁 文件",  color: "#ec4899" },
                { x: 388, label: "📡 信息流", color: "#f59e0b" },
              ].map(({ x, label, color }, i) => (
                <g key={label}>
                  <rect x={x} y={14} width={88} height={28} rx={5}
                    fill="rgba(255,255,255,0.06)" stroke={color + "66"} strokeWidth={1} />
                  <text x={x + 44} y={32} fontSize={10.5} fontWeight={600} fill="rgba(255,255,255,0.85)" textAnchor="middle">{label}</text>
                  <path
                    d={`M${x + 44},42 C${x + 44},78 240,88 240,104`}
                    fill="none" stroke={color + "55"} strokeWidth={1.2}
                  />
                  <path
                    className={`flow${i}`}
                    d={`M${x + 44},42 C${x + 44},78 240,88 240,104`}
                    fill="none" stroke={color} strokeWidth={1.5} opacity={0.7}
                  />
                </g>
              ))}

              {/* ── Agent 节点 h=34 ── */}
              <ellipse cx={240} cy={121} rx={110} ry={18} fill="rgba(245,158,11,0.08)" className="lp-agent-glow" />
              <rect x={100} y={104} width={280} height={34} rx={7}
                fill="rgba(255,255,255,0.07)" stroke="rgba(245,158,11,0.4)" strokeWidth={1} />
              <text x={120} y={125} fontSize={12} fontWeight={700} fill="rgba(255,255,255,0.9)">✦ 智能体</text>
              <text x={300} y={125} fontSize={10} fill="#34d399">
                运行中…
                <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
              </text>

              {/* ── Agent → 输出连线 (4个节点 w=90, x: 14,127,240,353 center+45) ── */}
              {[
                { ox: 14,  color: "#07c160" },
                { ox: 127, color: "#f43f5e" },
                { ox: 240, color: "#0084ff" },
                { ox: 353, color: "#f59e0b" },
              ].map(({ ox, color }, i) => (
                <g key={i}>
                  <path
                    d={`M240,138 C240,168 ${ox + 45},178 ${ox + 45},204`}
                    fill="none" stroke={color + "44"} strokeWidth={1.2}
                  />
                  <path
                    className={`flow-out${i}`}
                    d={`M240,138 C240,168 ${ox + 45},178 ${ox + 45},204`}
                    fill="none" stroke={color} strokeWidth={1.5} opacity={0.7}
                  />
                </g>
              ))}

              {/* ── 输出节点 (4个) w=90 h=28，间距13，两端留14 ── */}
              {[
                { x: 14,  label: "公众号",  color: "#07c160" },
                { x: 127, label: "小红书",  color: "#f43f5e" },
                { x: 240, label: "知乎",    color: "#0084ff" },
                { x: 353, label: "视频脚本", color: "#f59e0b" },
              ].map(({ x, label, color }) => (
                <g key={label}>
                  <rect x={x} y={204} width={90} height={28} rx={5}
                    fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
                  <text x={x + 45} y={222} fontSize={10.5} fontWeight={600} fill="rgba(255,255,255,0.85)" textAnchor="middle">{label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      {/* ══ 输入输出一览（ticker strip）════════════════════════════════════════ */}
      <div className="lp-strip">
        <div className="lp-strip__track">
          {[
            "文本输入", "网页链接输入", "文件输入", "记忆", "信息流",
            "公众号长文", "小红书图文", "知乎文章", "日记", "笔记", "视频",
            "文本输入", "网页链接输入", "文件输入", "记忆", "信息流",
            "公众号长文", "小红书图文", "知乎文章", "日记", "笔记", "视频",
          ].map((t, i) => (
            <span key={i} className={`lp-strip__item${t === "→" ? " lp-strip__arrow" : ""}`}>{t}</span>
          ))}
        </div>
      </div>

      {/* ══ 对比：传统 vs ThinkFlow ════════════════════════════════════════════ */}
      <section className="lp-comparison" id="how">
        <div className="lp-container" ref={refComparison}>
          <div className="lp-eyebrow lp-eyebrow--center">听起来熟悉吗？</div>
          <h2 className={`lp-section-title lp-reveal${painTitle.visible ? " lp-reveal-visible" : ""}`}
            ref={painTitle.ref as React.RefObject<HTMLHeadingElement>}>
            <span className="lp-reveal-line">用 AI 写内容，</span>
            <span className="lp-reveal-line">每次都要描述一遍背景</span>
          </h2>

          <div className="lp-comparison__grid">
            {/* 左列：旧方式 */}
            <div className="lp-comparison__col lp-comparison__col--before">
              <div className="lp-comparison__col-head">
                <span className="lp-eyebrow">市面上大多数AI创作软件</span>
              </div>
              {[
                { no: "01", title: "", desc: "每次开新对话，背景和风格都要从头解释，AI 没有记忆。" },
                { no: "02", title: "适配不同平台成本高", desc: "写完公众号，还要单独开一个对话，为小红书、知乎各自改写一遍。" },
                { no: "03", title: "", desc: "AI 不会主动执行任何事，全靠你手动触发，停更就断更。" },
                { no: "04", title: "多账号=重复劳动", desc: "每个账号都要单独操作，10 个账号就是 10 倍工时。" },
              ].map((r) => (
                <div className="lp-comparison__item" key={r.no}>
                  <span className="lp-comparison__no">{r.no}</span>
                  <div>
                    <p className="lp-comparison__item-title">{r.title}</p>
                    <p className="lp-comparison__item-desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 中间分割线 */}
            <div className="lp-comparison__divider">
              <div className="lp-comparison__divider-line" />
            </div>

            {/* 右列：ThinkFlow */}
            <div className="lp-comparison__col lp-comparison__col--after">
              <div className="lp-comparison__col-head">
                <span className="lp-eyebrow lp-eyebrow--accent">ThinkFlow 思流</span>
              </div>
              {[
                { no: "01", title: "让记忆作为输入的一部分", desc: "把创作风格、人设、素材存进记忆库，每次运行时作为输入，让智能体更清楚你的背景，创作更适合你的内容。" },
                { no: "02", title: "一键全平台出稿", desc: "节点连好后，点运行，公众号、小红书、知乎各自创作出符合平台调性的内容形式。" },
                { no: "03", title: "定时模式", desc: "接上信息源，设好时间，每天 AI 自动抓取热点内容、生成素材，让你不错过内容创作热点。" },
                { no: "04", title: "矩阵模式，助力多账号（矩阵）运营", desc: "一次配置多个人设，矩阵运行一键生成多个账号的内容矩阵。" },
              ].map((r) => (
                <div className="lp-comparison__item lp-comparison__item--after" key={r.no}>
                  <span className="lp-comparison__no lp-comparison__no--accent">{r.no}</span>
                  <div>
                    <p className="lp-comparison__item-title">{r.title}</p>
                    <p className="lp-comparison__item-desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 核心功能（6 宫格，hover 反色）══════════════════════════════════════ */}
      <section className="lp-features" id="features">
        <div className="lp-container-wide" ref={refBenefits}>
          <div className="lp-features__head">
            <div className="lp-eyebrow lp-eyebrow--center">ThinkFlow 能做什么</div>
            <h2 className={`lp-section-title lp-reveal${benefitsTitle.visible ? " lp-reveal-visible" : ""}`}
              ref={benefitsTitle.ref as React.RefObject<HTMLHeadingElement>}>
              <span className="lp-reveal-line">不只是聊天，</span>
              <span className="lp-reveal-line">而是真正帮你干活</span>
            </h2>
          </div>
          <div className="lp-features__grid">
            {FEATURES.map((f, i) => (
              <div className="lp-feature-card" key={f.title}>
                <div className="lp-feature-card__no">核心功能 / {String(i + 1).padStart(2, "0")}</div>
                <div className="lp-feature-card__icon">{f.icon}</div>
                <h3 className="lp-feature-card__title">{f.title}</h3>
                <p className="lp-feature-card__body">{f.body}</p>
                <div className="lp-feature-card__hook">→ {f.hook}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 使用场景（带 hover 滑入箭头）════════════════════════════════════════ */}
      <section className="lp-usecases" id="usecases">
        <div className="lp-container" ref={refUsecases}>
          <div className="lp-usecases__left">
            <div className="lp-eyebrow">案例研究 / 多元媒介运营</div>
            <h2 className={`lp-section-title lp-section-title--left lp-reveal${usecasesTitle.visible ? " lp-reveal-visible" : ""}`}
              ref={usecasesTitle.ref as React.RefObject<HTMLHeadingElement>}>
              <span className="lp-reveal-line">服务每一位</span>
              <span className="lp-reveal-line lp-uc-bold">内容创作者和运营工作者.</span>
            </h2>
            <p className="lp-usecases__intro">不同的创作者有不同的工作方式，ThinkFlow 的画布式设计让你按自己的创作习惯方便的搭建工作流，一次配置，反复使用。</p>
          </div>
          <div className="lp-usecases__right">
            {USECASES.map((u) => (
              <div className="lp-usecase" key={u.role}>
                <div className="lp-usecase__icon">{u.icon}</div>
                <div className="lp-usecase__content">
                  <p className="lp-usecase__role">{u.role}</p>
                  <p className="lp-usecase__desc">{u.desc}</p>
                  <p className="lp-usecase__result">{u.result}</p>
                </div>
                <div className="lp-usecase__arrow">→</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 最终 CTA ════════════════════════════════════════════════════════════ */}
      <section className="lp-cta">
        <div className="lp-cta__inner" ref={refCta}>
          <div className="lp-eyebrow lp-eyebrow--center lp-eyebrow--inv">立即体验</div>
          <h2 className="lp-cta__title">
            创造属于您的<br />
            <span className="lp-cta__title-bold">智能体 MCN 团队.</span>
          </h2>
          <a href="/app" className="lp-btn-primary lp-btn-primary--inv">搭建第一个工作流 →</a>
        </div>
      </section>

      {/* ══ Footer ══════════════════════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer__grid">
          <div className="lp-footer__col">
            <p className="lp-footer__logo">THINKFLOW.AI</p>
            <p className="lp-footer__tagline">AI 工作流创作平台 · 内测版 v0.1</p>
          </div>
          <div className="lp-footer__col">
            <a href="/app" className="lp-footer__link">进入应用</a>
          </div>
          <div className="lp-footer__col lp-footer__col--right">
            <span className="lp-footer__dot" />
            <span className="lp-footer__dot lp-footer__dot--dim" />
            <span className="lp-footer__dot lp-footer__dot--dim" />
          </div>
        </div>

        <div className="lp-footer__disclaimer" id="lp-disclaimer">
          <p className="lp-footer__disclaimer-title">安全说明与免责声明</p>
          <div className="lp-footer__disclaimer-grid">
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
      </footer>

      <style>{STYLES}</style>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IcoZap() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> }
function IcoBookmark() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> }
function IcoClock() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function IcoGrid() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function IcoVideo() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> }
function IcoTrend() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> }
function IcoPen() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function IcoUsers() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function IcoRss() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg> }

// ── 数据 ─────────────────────────────────────────────────────────────────────
const FEATURES: { icon: React.ReactNode; title: string; body: string; hook: string }[] = [
  { icon: <IcoZap />, title: "一个灵感，多平台创作", body: "不需要写完公众号再开新对话改小红书。连好节点，点运行，公众号、小红书、知乎各自拿到符合平台风格的版本。", hook: "一篇变三篇，省 2 小时" },
  { icon: <IcoBookmark />, title: "记忆，让你不用重复说过的话", body: "把写作风格、常用素材、账号定位存进记忆库，以后每次运行都会自动带上，不用每次都重新解释「我是做什么的」。", hook: "背景说一次，永久生效" },
  { icon: <IcoClock />, title: "定时任务，自动获取热点信息和素材", body: "接上 RSS 或信息源，设好定时，每天早上 9 点 AI 自动抓取内容、自动生成日报。你睡着，它在干活。", hook: "配置一次，天天自动跑" },
  { icon: <IcoGrid />, title: "矩阵模式，一个人轻松运营10+账号", body: "把每个账号的人设存进去，点「矩阵运行」，AI 给每个账号写出各自不同风格的内容，一次打包下载。", hook: "1 小时搞定 10 个账号" },
  { icon: <IcoVideo />, title: "输入灵感，AI直接制作带配音视频", body: "不用学剪辑，不用录音。AI 帮你分镜、写旁白、配音，渲染成竖版 MP4，下载就能发。", hook: "文字直接变短视频" },
  { icon: <IcoTrend />, title: "自动进化，用得越久，越顺手", body: "每次创作自动存入作品库，素材和偏好慢慢积累，AI 对你的了解越来越深，输出越来越稳。", hook: "越用越贴合你的风格" },
]

const USECASES: { icon: React.ReactNode; role: string; desc: string; result: string }[] = [
  { icon: <IcoPen />, role: "内容创作者", desc: "每天扔一个话题或链接进去，公众号、小红书、知乎三个版本一起出，每个平台各有侧重。", result: "每篇少花 2 小时" },
  { icon: <IcoUsers />, role: "多账号运营者", desc: "矩阵模式批量生成多个账号各自风格的内容，一键打包下载，复制粘贴就能发。", result: "1 个人撑 10 个账号" },
  { icon: <IcoRss />, role: "信息整理控", desc: "接 RSS 或关键词订阅，设好时间，每天自动生成行业日报、读书笔记、每周总结。", result: "不用手动整理，全自动跑" },
  { icon: <IcoVideo />, role: "短视频创作者", desc: "把文稿扔进去，AI 帮你分镜、配音、渲染竖版 MP4，下载就能发，不用开剪辑软件。", result: "文字直接出短视频" },
]

// ── 样式 ─────────────────────────────────────────────────────────────────────
const STYLES = `
/* ── 根变量 ── */
.lp-root {
  --lp-bone: #FAF8F5;
  --lp-ink: #171717;
  --lp-muted: rgba(23,23,23,0.45);
  --lp-hairline: rgba(23,23,23,0.1);
  --lp-accent: #171717;
  --lp-accent-light: rgba(23,23,23,0.06);
  --lp-bg: var(--lp-bone);
  --lp-text: var(--lp-ink);
  --lp-node-bg: #fff;
  --lp-strip-bg: var(--lp-ink);
  --lp-strip-text: var(--lp-bone);
}
[data-theme="dark"] .lp-root {
  --lp-bone: #FAF8F5;
  --lp-ink: #FAF8F5;
  --lp-muted: rgba(250,248,245,0.45);
  --lp-hairline: rgba(250,248,245,0.1);
  --lp-accent: #FAF8F5;
  --lp-accent-light: rgba(250,248,245,0.06);
  --lp-bg: #111;
  --lp-text: #FAF8F5;
  --lp-node-bg: #1c1c1c;
  --lp-strip-bg: #FAF8F5;
  --lp-strip-text: #171717;
}

.lp-root {
  min-height: 100vh;
  background: var(--lp-bg);
  color: var(--lp-text);
  font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
}
.lp-container { max-width: 1100px; margin: 0 auto; padding: 0 48px; }
.lp-container-wide { max-width: 1260px; margin: 0 auto; padding: 0 48px; }
@media (max-width: 768px) {
  .lp-container, .lp-container-wide { padding: 0 20px; }
}

/* ── Navbar ── */
.lp-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 200;
  height: 64px;
  display: flex; align-items: center;
  padding: 0 48px;
  background: color-mix(in srgb, var(--lp-bg) 85%, transparent);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--lp-hairline);
  gap: 40px;
}
.lp-nav__logo {
  display: flex; align-items: center;
  font-size: 17px; font-weight: 800; letter-spacing: -0.03em;
  color: var(--lp-text); text-decoration: none; flex-shrink: 0;
}
.lp-nav__logo-cn {
  font-weight: 400;
  color: #b47828;
}
[data-theme="dark"] .lp-nav__logo-cn {
  color: rgba(245, 158, 11, 0.6);
}
.lp-nav__center {
  display: flex; align-items: center; gap: 32px;
  flex: 1; justify-content: center;
}
.lp-nav__link {
  font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--lp-muted); text-decoration: none;
  transition: color 0.15s, opacity 0.15s;
}
.lp-nav__link:hover { color: var(--lp-text); }
.lp-nav__right { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.lp-nav__theme {
  background: none; border: 1px solid var(--lp-hairline);
  border-radius: 50%; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--lp-muted);
  transition: border-color 0.15s, color 0.15s;
}
.lp-nav__theme:hover { border-color: var(--lp-text); color: var(--lp-text); }
.lp-nav__cta {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 8px 20px;
  border: 1px solid var(--lp-ink);
  color: var(--lp-ink);
  background: transparent;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
[data-theme="dark"] .lp-nav__cta { border-color: var(--lp-bone); color: var(--lp-bone); }
.lp-nav__cta:hover {
  background: var(--lp-ink); color: var(--lp-bone);
}
[data-theme="dark"] .lp-nav__cta:hover { background: var(--lp-bone); color: var(--lp-ink); }

/* 移动端 hamburger */
.lp-nav__hamburger {
  display: none; flex-direction: column; gap: 5px;
  background: none; border: none; cursor: pointer; padding: 4px;
  margin-left: auto;
}
.lp-nav__hamburger span {
  display: block; width: 20px; height: 1.5px; background: var(--lp-text);
}
.lp-nav__mobile {
  position: fixed; top: 64px; left: 0; right: 0;
  background: var(--lp-bg);
  border-bottom: 1px solid var(--lp-hairline);
  display: flex; flex-direction: column;
  padding: 16px 20px;
}
.lp-nav__mobile-link {
  font-size: 13px; font-weight: 500; padding: 12px 0;
  border-bottom: 1px solid var(--lp-hairline);
  color: var(--lp-text); text-decoration: none;
}
.lp-nav__mobile-link:last-child { border-bottom: none; }
.lp-nav__mobile-cta { font-weight: 700; color: var(--lp-text); }
@media (max-width: 768px) {
  .lp-nav__center, .lp-nav__right { display: none; }
  .lp-nav__hamburger { display: flex; }
  .lp-nav { padding: 0 20px; gap: 0; }
}

/* ── 公共工具 ── */
.lp-eyebrow {
  font-size: 10px; font-weight: 700; letter-spacing: 0.3em; text-transform: uppercase;
  color: var(--lp-muted); margin-bottom: 12px;
}
.lp-eyebrow--center { text-align: center; }
.lp-eyebrow--accent { color: var(--lp-text); opacity: 1; }
.lp-eyebrow--inv { color: rgba(250,248,245,0.5); }

.lp-section-title {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800; letter-spacing: -1.5px; line-height: 1.1;
  text-align: center; margin-bottom: 56px;
}
.lp-section-title--left { text-align: left; margin-bottom: 24px; }

/* ── Reveal 动效 ── */
.lp-reveal .lp-reveal-line {
  display: block; overflow: hidden;
  padding-bottom: 0.1em; margin-bottom: -0.1em;
  transform: translateY(56px); opacity: 0;
  transition: transform 0.75s cubic-bezier(0.22,1,0.36,1), opacity 0.75s cubic-bezier(0.22,1,0.36,1);
}
.lp-reveal.lp-reveal-visible .lp-reveal-line { transform: translateY(0); opacity: 1; }
.lp-reveal.lp-reveal-visible .lp-reveal-line:nth-child(2) { transition-delay: 0.1s; }
.lp-reveal.lp-reveal-visible .lp-reveal-line:nth-child(3) { transition-delay: 0.2s; }

/* ── Section fade-in ── */
.lp-comparison .lp-container,
.lp-features .lp-container-wide,
.lp-usecases .lp-container,
.lp-cta .lp-cta__inner {
  opacity: 0; transform: translateY(20px);
  transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
}
.lp-comparison .lp-container.lp-visible,
.lp-features .lp-container-wide.lp-visible,
.lp-usecases .lp-container.lp-visible,
.lp-cta .lp-cta__inner.lp-visible { opacity: 1; transform: translateY(0); }

/* ── 按钮 ── */
.lp-btn-primary {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 14px 32px;
  background: var(--lp-ink); color: var(--lp-bone);
  border: 1px solid var(--lp-ink);
  text-decoration: none; cursor: pointer;
  transition: opacity 0.15s, transform 0.15s;
}
[data-theme="dark"] .lp-btn-primary { background: var(--lp-bone); color: var(--lp-ink); border-color: var(--lp-bone); }
.lp-btn-primary:hover { opacity: 0.8; transform: translateY(-1px); }
.lp-btn-primary--inv {
  background: var(--lp-bone); color: var(--lp-ink); border-color: var(--lp-bone);
}
[data-theme="dark"] .lp-btn-primary--inv { background: var(--lp-ink); color: var(--lp-bone); border-color: var(--lp-ink); }
.lp-btn-ghost {
  display: inline-flex; align-items: center;
  font-size: 12px; font-weight: 600; letter-spacing: 0.05em;
  padding: 14px 24px;
  border: 1px solid var(--lp-hairline);
  color: var(--lp-muted); text-decoration: none;
  transition: border-color 0.15s, color 0.15s;
}
.lp-btn-ghost:hover { border-color: var(--lp-text); color: var(--lp-text); }

/* ══ Hero ══ */
.lp-hero {
  display: grid; grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 64px);
  margin-top: 64px;
  border-bottom: 1px solid var(--lp-hairline);
}
.lp-hero__left {
  padding: 80px 64px 80px 48px;
  border-right: 1px solid var(--lp-hairline);
  display: flex; flex-direction: column; justify-content: center;
}
.lp-hero__eyebrow { margin-bottom: 28px; }
.lp-hero__title {
  font-size: clamp(48px, 7vw, 88px);
  font-weight: 900; letter-spacing: -3px; line-height: 0.92;
  margin-bottom: 28px;
}
.lp-hero__accent { display: block; }
.lp-hero__accent-bold {
  font-style: italic;
}
.lp-hero__desc {
  font-size: 16px; line-height: 1.8; color: var(--lp-muted);
  max-width: 440px; margin-bottom: 36px;
}
.lp-hero__stats {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 36px;
}
.lp-hero__stat { display: flex; flex-direction: column; padding-right: 28px; }
.lp-hero__stat-num {
  font-size: 28px; font-weight: 300; letter-spacing: -0.5px; line-height: 1;
}
.lp-hero__stat-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--lp-muted); margin-top: 4px;
}
.lp-hero__stat-divider {
  width: 1px; height: 36px; background: var(--lp-hairline); margin: 0 28px 0 0;
}
.lp-hero__actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.lp-hero__micro { font-size: 11px; color: var(--lp-muted); letter-spacing: 0.05em; }

.lp-hero__right {
  background: var(--lp-ink); display: flex; align-items: center; justify-content: center;
  padding: 48px 40px;
}
[data-theme="dark"] .lp-hero__right { background: #1a1a1a; }

/* ── 画布预览 ── */
.lp-canvas-preview {
  width: 100%; max-width: 460px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; overflow: hidden;
  animation: lp-float 5s ease-in-out infinite;
}
@keyframes lp-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
.lp-canvas-preview__bar {
  padding: 10px 14px;
  background: rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; gap: 6px;
}
.lp-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.lp-canvas-preview__label {
  margin-left: 8px; font-size: 11px; color: rgba(255,255,255,0.4);
  font-family: "JetBrains Mono", monospace;
}
.lp-canvas-preview__body {
  padding: 0;
  background: rgba(0,0,0,0.2);
}
.lp-flow-svg {
  width: 100%; display: block;
  background: rgba(0,0,0,0.15);
  font-family: -apple-system, "SF Pro Display", sans-serif;
}

@media (max-width: 900px) {
  .lp-hero { grid-template-columns: 1fr; }
  .lp-hero__left { border-right: none; border-bottom: 1px solid var(--lp-hairline); padding: 60px 20px; }
  .lp-hero__right { padding: 40px 20px; min-height: 400px; }
}

/* ══ Strip ══ */
.lp-strip {
  overflow: hidden; border-bottom: 1px solid var(--lp-hairline);
  background: var(--lp-strip-bg); color: var(--lp-strip-text);
  height: 40px; display: flex; align-items: center;
}
.lp-strip__track {
  display: flex; align-items: center; gap: 0; white-space: nowrap;
  animation: lp-scroll 28s linear infinite;
}
@keyframes lp-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
.lp-strip__item {
  font-size: 11px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase;
  padding: 0 24px; border-right: 1px solid rgba(255,255,255,0.12);
  opacity: 0.7;
}
[data-theme="dark"] .lp-strip__item { border-right-color: rgba(0,0,0,0.12); }
.lp-strip__arrow { font-size: 14px; letter-spacing: 0; opacity: 1; font-weight: 900; }

/* ══ 对比区 ══ */
.lp-comparison {
  padding: 100px 0;
  border-bottom: 1px solid var(--lp-hairline);
}
.lp-comparison__grid {
  display: grid; grid-template-columns: 1fr 1px 1fr; gap: 0;
  border: 1px solid var(--lp-hairline); border-radius: 4px; overflow: hidden;
}
.lp-comparison__divider { background: var(--lp-hairline); }
.lp-comparison__col { padding: 0; }
.lp-comparison__col-head {
  padding: 24px 36px 20px;
  border-bottom: 1px solid var(--lp-hairline);
  background: var(--lp-accent-light);
}
.lp-comparison__col--before .lp-comparison__col-head { background: transparent; }
.lp-comparison__item {
  display: flex; gap: 20px;
  padding: 28px 36px;
  border-bottom: 1px solid var(--lp-hairline);
}
.lp-comparison__item:last-child { border-bottom: none; }
.lp-comparison__no {
  font-size: 10px; font-weight: 800; letter-spacing: 0.15em;
  color: var(--lp-muted); flex-shrink: 0; padding-top: 2px;
}
.lp-comparison__no--accent { color: var(--lp-text); }
.lp-comparison__item-title {
  font-size: 14px; font-weight: 700; margin-bottom: 6px; letter-spacing: -0.2px;
}
.lp-comparison__col--before .lp-comparison__item-title { opacity: 0.4; }
.lp-comparison__item-desc { font-size: 13px; line-height: 1.7; color: var(--lp-muted); }
.lp-comparison__col--before .lp-comparison__item-desc { opacity: 0.6; }
@media (max-width: 700px) {
  .lp-comparison__grid { grid-template-columns: 1fr; }
  .lp-comparison__divider { display: none; }
  .lp-comparison__col--before { border-bottom: 1px solid var(--lp-hairline); }
  .lp-comparison__item { padding: 20px; }
  .lp-comparison__col-head { padding: 16px 20px; }
}

/* ══ Features 6宫格 ══ */
.lp-features {
  padding: 100px 0;
  border-bottom: 1px solid var(--lp-hairline);
}
.lp-features__head { margin-bottom: 56px; }
.lp-features__grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  border-left: 1px solid var(--lp-hairline);
  border-top: 1px solid var(--lp-hairline);
}
.lp-feature-card {
  padding: 36px 32px;
  border-right: 1px solid var(--lp-hairline);
  border-bottom: 1px solid var(--lp-hairline);
  background: var(--lp-bg);
  transition: background 0.2s, color 0.2s;
  cursor: default;
}
.lp-feature-card:hover {
  background: var(--lp-ink); color: var(--lp-bone);
}
[data-theme="dark"] .lp-feature-card:hover { background: var(--lp-bone); color: var(--lp-ink); }
.lp-feature-card__no {
  font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--lp-muted); margin-bottom: 20px;
  transition: color 0.2s;
}
.lp-feature-card:hover .lp-feature-card__no { color: inherit; opacity: 0.55; }
.lp-feature-card__icon {
  margin-bottom: 16px; opacity: 0.7;
  transition: opacity 0.2s;
}
.lp-feature-card:hover .lp-feature-card__icon { opacity: 1; }
.lp-feature-card__title {
  font-size: 15px; font-weight: 700; margin-bottom: 10px; letter-spacing: -0.3px;
  transition: color 0.2s;
}
.lp-feature-card__body {
  font-size: 13px; line-height: 1.75; color: var(--lp-muted); margin-bottom: 20px;
  transition: color 0.2s, opacity 0.2s;
}
.lp-feature-card:hover .lp-feature-card__body { color: inherit; opacity: 0.75; }
.lp-feature-card__hook {
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  transition: color 0.2s;
}
.lp-feature-card:hover .lp-feature-card__hook { color: inherit; }
@media (max-width: 900px) { .lp-features__grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .lp-features__grid { grid-template-columns: 1fr; } }

/* ══ 使用场景 ══ */
.lp-usecases { padding: 100px 0; border-bottom: 1px solid var(--lp-hairline); }
.lp-usecases .lp-container {
  display: grid; grid-template-columns: 1fr 1.4fr; gap: 80px; align-items: start;
}
.lp-usecases__intro {
  font-size: 14px; line-height: 1.8; color: var(--lp-muted); margin-bottom: 0;
}
.lp-uc-bold { font-weight: 900; font-size: clamp(32px, 5vw, 56px); letter-spacing: -2px; line-height: 1; display: block; }
.lp-usecase {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 24px 0; border-bottom: 1px solid var(--lp-hairline);
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.22,1,0.36,1);
}
.lp-usecase:first-child { border-top: 1px solid var(--lp-hairline); }
.lp-usecase:hover { transform: translateX(6px); }
.lp-usecase__icon { flex-shrink: 0; opacity: 0.5; padding-top: 2px; }
.lp-usecase__content { flex: 1; }
.lp-usecase__role { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--lp-muted); margin-bottom: 6px; }
.lp-usecase__desc { font-size: 14px; line-height: 1.7; margin-bottom: 8px; }
.lp-usecase__result { font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lp-text); opacity: 0.5; }
.lp-usecase__arrow { font-size: 16px; color: var(--lp-muted); opacity: 0; transition: opacity 0.15s; padding-top: 2px; flex-shrink: 0; }
.lp-usecase:hover .lp-usecase__arrow { opacity: 1; }
@media (max-width: 800px) {
  .lp-usecases .lp-container { grid-template-columns: 1fr; gap: 40px; }
}

/* ══ CTA ══ */
.lp-cta {
  background: var(--lp-ink);
  overflow: hidden; position: relative;
}
[data-theme="dark"] .lp-cta { background: #0a0a0a; border-top: 1px solid var(--lp-hairline); }
.lp-cta__inner {
  max-width: 900px; margin: 0 auto; padding: 120px 48px;
  text-align: center;
}
.lp-cta__title {
  font-size: clamp(48px, 9vw, 100px); font-weight: 900;
  line-height: 0.9; letter-spacing: -4px;
  color: var(--lp-bone); margin-bottom: 28px;
}
[data-theme="dark"] .lp-cta__title { color: #FAF8F5; }
.lp-cta__title-bold { font-style: italic; }
.lp-cta__desc {
  font-size: 16px; line-height: 1.8; color: rgba(250,248,245,0.55);
  max-width: 480px; margin: 0 auto 40px;
}
.lp-cta__micro { font-size: 11px; color: rgba(250,248,245,0.35); margin-top: 16px; letter-spacing: 0.08em; }
@media (max-width: 600px) { .lp-cta__inner { padding: 80px 20px; } }

/* ══ Footer ══ */
.lp-footer {
  padding: 0; background: var(--lp-bg);
  border-top: 1px solid var(--lp-hairline);
}
.lp-footer__grid {
  display: grid; grid-template-columns: 1fr auto auto;
  align-items: center; height: 72px;
  padding: 0 48px;
  border-bottom: 1px solid var(--lp-hairline);
  gap: 24px;
}
.lp-footer__col { display: flex; align-items: center; gap: 12px; }
.lp-footer__col--right { gap: 8px; }
.lp-footer__logo { font-size: 12px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; }
.lp-footer__tagline { font-size: 11px; color: var(--lp-muted); }
.lp-footer__link { font-size: 11px; color: var(--lp-muted); text-decoration: none; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.15s; }
.lp-footer__link:hover { color: var(--lp-text); }
.lp-footer__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--lp-text); }
.lp-footer__dot--dim { background: transparent; border: 1px solid var(--lp-muted); opacity: 0.4; }

.lp-footer__disclaimer {
  padding: 32px 48px;
  border-bottom: 1px solid var(--lp-hairline);
}
.lp-footer__disclaimer-title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--lp-muted); margin-bottom: 16px;
}
.lp-footer__disclaimer-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;
}
.lp-footer__disclaimer-grid p { font-size: 12px; line-height: 1.7; color: var(--lp-muted); }
.lp-footer__disclaimer-grid strong { color: var(--lp-text); font-weight: 600; }
.lp-footer__bottom {
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  padding: 20px 48px; font-size: 11px; color: var(--lp-muted);
}
@media (max-width: 600px) {
  .lp-footer__grid { grid-template-columns: 1fr; height: auto; padding: 20px; }
  .lp-footer__disclaimer, .lp-footer__bottom { padding: 20px; }
}
`
