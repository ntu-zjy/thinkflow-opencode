import { Component } from "react"
import type { ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// 顶层错误兜底。运行时崩溃（最常见：脏数据导致 .map 抛 TypeError）不再白屏，
// 提供「重置画布」按钮，一键清掉本地持久化数据后重载。
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  resetCanvas = () => {
    try {
      localStorage.removeItem("thinkflow-canvas-v2")
    } catch { /* ignore */ }
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    const sha = (import.meta.env.VITE_BUILD_SHA as string | undefined) ?? "dev"

    return (
      <div className="tf-error-boundary">
        <div className="tf-error-boundary__card">
          <h1 className="tf-error-boundary__title">画布出现异常</h1>
          <p className="tf-error-boundary__desc">
            遇到了一个无法自动恢复的错误。最常见的原因是本地缓存的画布数据格式异常，
            点击下方「重置画布」会清除本地缓存并重新加载（已登录用户的服务端画布不受影响）。
          </p>
          <pre className="tf-error-boundary__msg">{this.state.error.message}</pre>
          <div className="tf-error-boundary__actions">
            <button className="tf-error-boundary__btn tf-error-boundary__btn--primary" onClick={this.resetCanvas}>
              重置画布并重新加载
            </button>
            <button className="tf-error-boundary__btn" onClick={() => window.location.reload()}>
              仅重新加载
            </button>
            <button className="tf-error-boundary__btn" onClick={this.reset}>
              忽略并继续
            </button>
          </div>
          <p className="tf-error-boundary__meta">build {sha.slice(0, 7)}</p>
        </div>
        <style>{STYLES}</style>
      </div>
    )
  }
}

const STYLES = `
.tf-error-boundary {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-base, #fafaf7);
  padding: 24px;
  z-index: 9999;
}
.tf-error-boundary__card {
  max-width: 520px; width: 100%;
  background: var(--bg-node, #fff);
  border: 1px solid var(--border, #e5e5e0);
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
}
.tf-error-boundary__title {
  font-size: 20px; font-weight: 800; margin: 0 0 12px;
  color: var(--text-primary, #1a1a1a);
}
.tf-error-boundary__desc {
  font-size: 14px; line-height: 1.6; color: var(--text-secondary, #555);
  margin: 0 0 16px;
}
.tf-error-boundary__msg {
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  font-size: 12px; color: #b91c1c;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; padding: 10px 12px;
  white-space: pre-wrap; word-break: break-word;
  max-height: 180px; overflow: auto;
  margin: 0 0 20px;
}
.tf-error-boundary__actions {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.tf-error-boundary__btn {
  padding: 9px 16px; font-size: 13px; font-weight: 600;
  background: transparent;
  border: 1px solid var(--border, #d4d4d0);
  border-radius: 6px;
  color: var(--text-primary, #1a1a1a);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.tf-error-boundary__btn:hover {
  background: var(--bg-hover, #f5f5f0);
}
.tf-error-boundary__btn--primary {
  background: #b91c1c; color: #fff; border-color: #b91c1c;
}
.tf-error-boundary__btn--primary:hover {
  background: #991b1b; border-color: #991b1b;
}
.tf-error-boundary__meta {
  margin: 16px 0 0; font-size: 11px;
  font-family: ui-monospace, "SF Mono", Menlo, monospace;
  color: var(--text-muted, #888);
}
`
