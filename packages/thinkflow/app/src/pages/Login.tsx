import { useState, useEffect } from "react"
import { useAuthStore } from "../store/authStore"

export function Login() {
  const { login, loading, user, clearError } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [err, setErr] = useState("")

  useEffect(() => {
    if (user) window.location.href = "/app"
  }, [user])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    clearError()
    await login(email, password).catch((e: Error) => setErr(e.message))
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          ThinkFlow<span className="auth-logo__cn"> · 思流</span>
        </div>
        <h1 className="auth-title">欢迎回来</h1>
        <form onSubmit={submit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label">邮箱</label>
            <input
              className="auth-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="auth-field">
            <label className="auth-label">密码</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {err && <p className="auth-error">{err}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <p className="auth-switch">
          还没有账号？<a href="/register" className="auth-link">立即注册</a>
        </p>
      </div>
      <style>{AUTH_STYLES}</style>
    </div>
  )
}

const AUTH_STYLES = `
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-node);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 40px 36px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.08);
}
.auth-logo {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  margin-bottom: 28px;
}
.auth-logo__cn {
  font-weight: 400;
  color: var(--text-muted);
}
.auth-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px;
  letter-spacing: -0.3px;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.auth-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.auth-input {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
}
.auth-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
}
.auth-input::placeholder { color: var(--text-muted); }
.auth-error {
  font-size: 13px;
  color: var(--status-error);
  margin: 0;
  padding: 8px 12px;
  background: rgba(239,68,68,0.08);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(239,68,68,0.2);
}
.auth-submit {
  padding: 11px 24px;
  background: var(--accent);
  color: var(--accent-text);
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  margin-top: 4px;
}
.auth-submit:hover:not(:disabled) { opacity: 0.85; transform: translateY(-1px); }
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.auth-switch {
  margin: 20px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}
.auth-link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}
.auth-link:hover { text-decoration: underline; }
`
