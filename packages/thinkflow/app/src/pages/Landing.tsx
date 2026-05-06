import { useEffect, useState } from "react"

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

  return (
    <div className="lp-root">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-nav__logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <span className="lp-nav__name">ThinkFlow · 思流</span>
          <span className="lp-nav__tag">内测版</span>
        </div>
        <div className="lp-nav__actions">
          <button className="lp-nav__theme" onClick={toggleTheme} title="切换主题">
            {theme === "light" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            )}
          </button>
          <a href="/app" className="lp-btn lp-btn--primary">进入应用 →</a>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__badge">AI 工作流创作平台</div>
        <h1 className="lp-hero__title">
          不止聊天，<br />
          <span className="lp-hero__highlight">让 AI 跑完整个创作流程</span>
        </h1>
        <p className="lp-hero__desc">
          传统 AI 聊天需要你每次重新说明背景。ThinkFlow 让你把内容、指令、输出目标
          用节点连成工作流——配置一次，之后每次运行 AI 都精准执行。
        </p>
        <div className="lp-hero__cta">
          <a href="/app" className="lp-btn lp-btn--hero">免费开始使用</a>
          <a href="#features" className="lp-btn lp-btn--ghost">了解功能 ↓</a>
        </div>
        <div className="lp-hero__canvas-preview">
          <div className="lp-preview-node lp-preview-node--input">
            <div className="lp-preview-node__dot lp-preview-node__dot--input" />
            <span className="lp-preview-node__label">📝 文本输入</span>
            <div className="lp-preview-node__handle" />
          </div>
          <div className="lp-preview-arrow">→</div>
          <div className="lp-preview-node lp-preview-node--agent">
            <div className="lp-preview-node__dot lp-preview-node__dot--agent" />
            <span className="lp-preview-node__label">🤖 AI Agent</span>
            <div className="lp-preview-node__handle" />
          </div>
          <div className="lp-preview-arrow">→</div>
          <div className="lp-preview-outputs">
            <div className="lp-preview-node lp-preview-node--output">
              <span className="lp-preview-node__label">📰 公众号</span>
            </div>
            <div className="lp-preview-node lp-preview-node--output lp-preview-node--output-2">
              <span className="lp-preview-node__label">📕 小红书</span>
            </div>
            <div className="lp-preview-node lp-preview-node--output lp-preview-node--output-3">
              <span className="lp-preview-node__label">📖 知乎</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 和传统 AI 的区别 ────────────────────────────────────────────────── */}
      <section className="lp-compare" id="features">
        <div className="lp-section-label">核心差异</div>
        <h2 className="lp-section-title">为什么不直接用 ChatGPT？</h2>
        <div className="lp-compare__grid">
          <div className="lp-compare__card lp-compare__card--old">
            <div className="lp-compare__card-header">
              <span className="lp-compare__badge lp-compare__badge--old">传统 AI 聊天</span>
            </div>
            <ul className="lp-compare__list">
              <li>❌ 每次对话需要重新说明背景</li>
              <li>❌ 只能单次输出，无法并行多平台</li>
              <li>❌ 没有自动化，必须手动触发</li>
              <li>❌ 风格不稳定，靠不断调整提示词</li>
              <li>❌ 无法管理账号人设和风格积累</li>
            </ul>
          </div>
          <div className="lp-compare__card lp-compare__card--new">
            <div className="lp-compare__card-header">
              <span className="lp-compare__badge lp-compare__badge--new">ThinkFlow 工作流</span>
            </div>
            <ul className="lp-compare__list">
              <li>✅ 工作流配置一次，永久复用</li>
              <li>✅ 并行输出多平台，一次运行全覆盖</li>
              <li>✅ 定时自动运行，无需人工干预</li>
              <li>✅ 节点绑定指令，每次输出风格稳定</li>
              <li>✅ 记忆库管理人设、素材、作品</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 功能特性 ────────────────────────────────────────────────────────── */}
      <section className="lp-features">
        <div className="lp-section-label">功能亮点</div>
        <h2 className="lp-section-title">专为内容创作者设计</h2>
        <div className="lp-features__grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card">
              <div className="lp-feature-card__icon">{f.icon}</div>
              <div className="lp-feature-card__title">{f.title}</div>
              <div className="lp-feature-card__desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 使用场景 ────────────────────────────────────────────────────────── */}
      <section className="lp-scenarios">
        <div className="lp-section-label">使用场景</div>
        <h2 className="lp-section-title">你能用它做什么</h2>
        <div className="lp-scenarios__grid">
          {SCENARIOS.map((s) => (
            <div key={s.title} className="lp-scenario-card">
              <div className="lp-scenario-card__icon">{s.icon}</div>
              <div className="lp-scenario-card__title">{s.title}</div>
              <div className="lp-scenario-card__desc">{s.desc}</div>
              <div className="lp-scenario-card__flow">{s.flow}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────────── */}
      <section className="lp-cta">
        <h2 className="lp-cta__title">开始你的第一个工作流</h2>
        <p className="lp-cta__desc">无需注册，直接在浏览器中运行。数据本地存储，安全私密。</p>
        <a href="/app" className="lp-btn lp-btn--hero">立即免费使用 →</a>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer__main">
          <div className="lp-footer__brand">
            <span className="lp-footer__logo">ThinkFlow · 思流</span>
            <span className="lp-footer__tagline">AI 工作流创作平台 · 内测版 v0.1</span>
          </div>
          <div className="lp-footer__links">
            <a href="/app" className="lp-footer__link">进入应用</a>
            <a href="#" className="lp-footer__link" onClick={(e) => { e.preventDefault(); document.getElementById("lp-disclaimer")?.scrollIntoView({ behavior: "smooth" }) }}>免责声明</a>
          </div>
        </div>
        <div className="lp-footer__disclaimer" id="lp-disclaimer">
          <div className="lp-disclaimer-title">安全说明与免责声明</div>
          <div className="lp-disclaimer-content">
            <p><strong>AI 内容说明：</strong>ThinkFlow 通过大语言模型生成内容，所有 AI 输出仅供参考，不构成专业建议。用户在发布或使用 AI 生成内容前，应自行审核其准确性、合法性和适当性。</p>
            <p><strong>数据存储：</strong>所有工作流配置、记忆库数据均存储在您设备的本地浏览器中（localStorage），不上传至任何服务器。我们无法访问您的数据。</p>
            <p><strong>API 密钥：</strong>AI 模型调用通过您本地配置的 OpenCode 服务进行，或由您提供的 API 密钥完成，Anthropic / ThinkFlow 团队不持有或存储您的密钥。</p>
            <p><strong>内容责任：</strong>用户对利用本工具生成和发布的所有内容承担全部责任。ThinkFlow 不对因使用 AI 生成内容而产生的任何直接或间接损失负责。</p>
            <p><strong>适用法律：</strong>请确保您使用本工具生成的内容符合所在地区的法律法规，包括但不限于版权法、隐私法及平台服务条款。</p>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© 2026 ThinkFlow. 保留所有权利。</span>
          <span>本产品处于内测阶段，功能持续迭代中。</span>
        </div>
      </footer>

      <style>{LANDING_STYLES}</style>
    </div>
  )
}

const FEATURES = [
  {
    icon: "🔗",
    title: "可视化工作流",
    desc: "用节点和连线搭建创作流程，无需编程。输入节点→Agent→输出节点，拖拽连接即可。",
  },
  {
    icon: "⚡",
    title: "多平台并行输出",
    desc: "一次运行，同时生成知乎长文、公众号图文、小红书笔记、日记、视频脚本，省去重复改写。",
  },
  {
    icon: "⏰",
    title: "定时自动执行",
    desc: "开启定时模式，Agent 自动在设定时间运行。接入信息流，每天自动生成日报、周报。",
  },
  {
    icon: "🧬",
    title: "矩阵运营模式",
    desc: "在记忆库保存多个账号人设，矩阵运行时 AI 针对每个人设生成差异化内容，批量运营。",
  },
  {
    icon: "🧠",
    title: "记忆库管理",
    desc: "统一管理账号人设、创作素材、参考资料、历史作品。每次运行自动保存输出内容。",
  },
  {
    icon: "🎬",
    title: "视频内容生成",
    desc: "输入文案，Agent 自动拆解分镜、配置旁白，调用 TTS 配音，渲染竖版 MP4 视频。",
  },
]

const SCENARIOS = [
  {
    icon: "📰",
    title: "内容创作者",
    desc: "每天粘贴一篇参考文章，AI 自动改写成公众号/小红书/知乎三份不同风格的稿件。",
    flow: "链接 → Agent → 公众号 + 小红书 + 知乎",
  },
  {
    icon: "🧬",
    title: "多账号运营者",
    desc: "保存多个账号人设，矩阵运行一次产出所有账号的内容，一键打包下载 ZIP。",
    flow: "素材 → Agent（矩阵）→ 各账号输出 × N",
  },
  {
    icon: "📅",
    title: "信息整理达人",
    desc: "接入 RSS 订阅源，设定每天早 9 点自动运行，生成精简的日报/周报笔记。",
    flow: "信息流（定时）→ Agent → 日记/笔记",
  },
  {
    icon: "🎬",
    title: "短视频创作者",
    desc: "输入话题，AI 生成分镜脚本，自动配音，渲染带字幕的竖版视频，直接发布。",
    flow: "文本 → Agent → 视频 → MP4",
  },
]

const LANDING_STYLES = `
.lp-root {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-body);
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Navbar ── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  height: 60px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(12px);
}
.lp-nav__logo {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  color: var(--text-primary);
}
.lp-nav__name { letter-spacing: -0.3px; }
.lp-nav__tag {
  font-family: var(--font-code);
  font-size: 10px;
  padding: 2px 7px;
  background: var(--accent-subtle);
  color: var(--accent);
  border-radius: 999px;
  border: 1px solid var(--border-accent);
}
.lp-nav__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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
  padding: 8px 18px;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
  border: 1px solid transparent;
}
.lp-btn--primary {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  box-shadow: var(--btn-primary-shadow);
}
.lp-btn--primary:hover { opacity: 0.88; }
.lp-btn--hero {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  padding: 12px 28px;
  font-size: 15px;
  box-shadow: var(--btn-primary-shadow);
}
.lp-btn--hero:hover { opacity: 0.88; }
.lp-btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
  padding: 12px 24px;
  font-size: 14px;
}
.lp-btn--ghost:hover {
  border-color: var(--border-hover);
  color: var(--text-primary);
}

/* ── Hero ── */
.lp-hero {
  max-width: 780px;
  margin: 0 auto;
  padding: 88px var(--space-6) 64px;
  text-align: center;
}
.lp-hero__badge {
  display: inline-block;
  font-family: var(--font-code);
  font-size: 11px;
  padding: 4px 12px;
  background: var(--accent-subtle);
  color: var(--accent);
  border: 1px solid var(--border-accent);
  border-radius: 999px;
  margin-bottom: var(--space-5);
  letter-spacing: 0.3px;
}
.lp-hero__title {
  font-family: var(--font-display);
  font-size: clamp(36px, 5vw, 56px);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1.5px;
  margin-bottom: var(--space-5);
  color: var(--text-primary);
}
.lp-hero__highlight { color: var(--accent); }
.lp-hero__desc {
  font-size: 16px;
  line-height: 1.75;
  color: var(--text-secondary);
  max-width: 560px;
  margin: 0 auto var(--space-6);
}
.lp-hero__cta {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

/* ── Canvas Preview ── */
.lp-hero__canvas-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 28px 32px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  flex-wrap: wrap;
  row-gap: 16px;
}
.lp-preview-node {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;
  border: 1.5px solid var(--border);
  background: var(--bg-node);
  position: relative;
  min-width: 120px;
}
.lp-preview-node--input { border-color: #3b82f6; }
.lp-preview-node--agent { border-color: var(--accent); }
.lp-preview-node--output { border-color: #10b981; min-width: 100px; }
.lp-preview-node--output-2 { border-color: #f43f5e; }
.lp-preview-node--output-3 { border-color: #6366f1; }
.lp-preview-node__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.lp-preview-node__dot--input { background: #3b82f6; }
.lp-preview-node__dot--agent { background: var(--accent); }
.lp-preview-arrow {
  color: var(--text-muted);
  font-size: 18px;
  font-weight: 300;
}
.lp-preview-outputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.lp-preview-node__label { color: var(--text-primary); white-space: nowrap; }

/* ── Section共用 ── */
.lp-section-label {
  font-family: var(--font-code);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: var(--space-3);
  text-align: center;
}
.lp-section-title {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 700;
  letter-spacing: -0.8px;
  text-align: center;
  margin-bottom: 40px;
  color: var(--text-primary);
}

/* ── Compare ── */
.lp-compare {
  max-width: 860px;
  margin: 0 auto;
  padding: 64px var(--space-6);
}
.lp-compare__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
@media (max-width: 640px) {
  .lp-compare__grid { grid-template-columns: 1fr; }
}
.lp-compare__card {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1.5px solid var(--border);
  background: var(--bg-surface);
}
.lp-compare__card--new {
  border-color: var(--accent);
  background: var(--accent-subtle);
}
.lp-compare__card-header { margin-bottom: var(--space-4); }
.lp-compare__badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 999px;
}
.lp-compare__badge--old {
  background: var(--bg-surface-2);
  color: var(--text-secondary);
}
.lp-compare__badge--new {
  background: var(--accent);
  color: var(--accent-text);
}
.lp-compare__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary);
}
.lp-compare__card--new .lp-compare__list { color: var(--text-primary); }

/* ── Features ── */
.lp-features {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px var(--space-6);
}
.lp-features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}
.lp-feature-card {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  transition: border-color 0.15s, transform 0.15s;
}
.lp-feature-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
}
.lp-feature-card__icon { font-size: 24px; margin-bottom: var(--space-3); }
.lp-feature-card__title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}
.lp-feature-card__desc {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-secondary);
}

/* ── Scenarios ── */
.lp-scenarios {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px var(--space-6);
}
.lp-scenarios__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-4);
}
.lp-scenario-card {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background: var(--bg-surface);
}
.lp-scenario-card__icon { font-size: 28px; margin-bottom: var(--space-3); }
.lp-scenario-card__title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}
.lp-scenario-card__desc {
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}
.lp-scenario-card__flow {
  font-family: var(--font-code);
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-subtle);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
}

/* ── CTA ── */
.lp-cta {
  text-align: center;
  padding: 80px var(--space-6);
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}
.lp-cta__title {
  font-family: var(--font-display);
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 700;
  letter-spacing: -0.8px;
  margin-bottom: var(--space-4);
  color: var(--text-primary);
}
.lp-cta__desc {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: var(--space-6);
  line-height: 1.6;
}

/* ── Footer ── */
.lp-footer {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px var(--space-6) 32px;
}
.lp-footer__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border);
  margin-bottom: var(--space-5);
  flex-wrap: wrap;
}
.lp-footer__brand {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.lp-footer__logo {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 15px;
  color: var(--text-primary);
}
.lp-footer__tagline {
  font-size: 12px;
  color: var(--text-muted);
}
.lp-footer__links {
  display: flex;
  gap: var(--space-4);
}
.lp-footer__link {
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}
.lp-footer__link:hover { color: var(--text-primary); }

.lp-footer__disclaimer {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}
.lp-disclaimer-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}
.lp-disclaimer-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.lp-disclaimer-content p {
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}
.lp-disclaimer-content strong {
  color: var(--text-primary);
  font-weight: 600;
}

.lp-footer__bottom {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--text-muted);
}
`
