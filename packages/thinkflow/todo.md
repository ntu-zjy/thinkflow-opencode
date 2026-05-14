# ThinkFlow 部署与商业化 Todo

---

## 第一步：全量迁移到 Sealos 新加坡

### 目标
将现有 Railway（OpenCode 服务）+ Vercel（前端 + API Routes）全部迁移到 Sealos 新加坡节点，消除模型访问限制、函数超时限制，降低跨区延迟。

### 子任务

- [ ] **1.1 部署 OpenCode 服务到 Sealos**
  - 使用现有 `Dockerfile.opencode` 在 Sealos 创建 App
  - 配置环境变量（PORT、OPENROUTER_API_KEY 等）
  - 绑定自定义域名（如 `api.thinkflow.app`），开启 HTTPS
  - 验证 `/health` 端点可访问，SSE 长连接不中断

- [ ] **1.2 前端静态资源部署到 Sealos**
  - 编写前端 Dockerfile（`bun build` 产物 + Nginx 静态服务）
  - 在 Sealos 创建前端 App，绑定主域名（如 `thinkflow.app`）
  - 更新 `VITE_OPENCODE_SERVER_URL` 指向 Sealos 上的 OpenCode 地址
  - 配置 Nginx CORS / 反向代理（如需合并域名）

- [ ] **1.3 废弃旧部署**
  - 确认 Sealos 服务稳定后，停止 Railway 上的 OpenCode 实例
  - 停止 Vercel 上的前端部署（或保留作为备用 CDN）
  - 更新 DNS 记录指向 Sealos

- [ ] **1.4 端到端冒烟测试**
  - 文本生成（知乎 / 公众号 / 日记）流式输出正常
  - 小红书图片生成（`openai/gpt-5.4-image-2`）可返回真实图片
  - Modal 弹窗、快捷键、Abort 功能正常
  - 从国内网络访问，延迟和可用性可接受

---

## 第二步：用户注册、支付与服务端数据存储

### 目标
接入邮箱注册 + ZPAY 支付（微信 / 支付宝，面向国内个人用户），同时将画布数据和生成图片从 localStorage 迁移到服务端，解决图片过多导致的崩溃问题。

### 子任务

#### 2.1 后端服务（新增）
- [ ] 在 Sealos 创建一个独立后端服务（建议 Hono + Bun，与现有技术栈统一）
- [ ] 在 Sealos 开通 PostgreSQL 实例，设计数据库 schema：
  - `users`（id, email, password_hash, created_at, plan, credits）
  - `canvases`（id, user_id, title, nodes_json, edges_json, updated_at）
  - `assets`（id, user_id, canvas_id, url, type, created_at）
- [ ] 在 Sealos 开通对象存储（S3 兼容），用于存储生成的图片

#### 2.2 邮箱注册与登录
- [ ] 实现注册接口（POST `/auth/register`）：邮箱 + 密码，bcrypt 哈希
- [ ] 实现登录接口（POST `/auth/login`）：返回 JWT
- [ ] 实现邮箱验证码发送（接入 Resend 或阿里云邮件推送）
- [ ] 前端新增注册 / 登录页面（路由 `/login`、`/register`）
- [ ] JWT 存 localStorage，请求头携带 `Authorization: Bearer <token>`

#### 2.3 ZPAY 支付接入
- [ ] 在 7-pay.cn 注册账号，获取商户 ID 和密钥
- [ ] 实现创建订单接口（POST `/pay/create`）：调用 ZPAY 统一下单
- [ ] 实现支付回调接口（POST `/pay/notify`）：验签、更新用户 credits / plan
- [ ] 前端新增定价页面（`/pricing`），展示套餐，点击跳转 ZPAY 收银台
- [ ] 支付成功后刷新用户状态，解锁对应功能

#### 2.4 服务端数据存储（替换 localStorage）
- [ ] `canvasStore`：改为调用后端 API 保存 / 加载画布（登录后全量同步，无本地降级）
- [ ] 图片资产：生成后上传到 Sealos 对象存储，`OutputNodeData.images` 存 URL 而非 base64
- [ ] 历史画布列表页（`/dashboard`）：展示用户所有画布，支持新建 / 删除

#### 2.5 权限控制
- [ ] **未登录用户**：强制跳转登录页，不可使用任何功能
- [ ] **免费用户**（注册后默认）：限制每日生成次数（如 5 次 / 天）
- [ ] **付费用户**：按 credits 扣费或解锁无限次数套餐
- [ ] 路由守卫：所有页面（`/`、`/dashboard` 等）未登录一律重定向到 `/login`

#### 2.6 测试与上线
- [ ] 完整走通注册 → 登录 → 生成内容 → 保存画布 → 支付升级 流程
- [ ] 测试图片上传到对象存储、URL 持久化可访问
- [ ] 压测并发生成场景，确认服务端存储无瓶颈
