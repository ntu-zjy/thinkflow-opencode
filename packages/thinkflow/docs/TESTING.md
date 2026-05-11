# ThinkFlow 测试账号使用手册

## 超级测试账号

用于本地和 Sealos 环境的端到端调试，拥有订阅版权限和充足积分。

| 项目 | 值 |
|------|------|
| 邮箱 | `super@thinkflow.dev` |
| 密码 | `thinkflow2026` |
| plan | `subscriber`（订阅版） |
| 永久积分 | 999 积分（可重置） |
| 每日积分 | 30 积分/天（自动叠加） |

---

## 创建 / 重置账号

后端启动后调用一次，账号不存在则创建，已存在则重置积分：

```bash
curl -X POST http://localhost:3456/auth/create-super \
  -H "Content-Type: application/json"
```

返回示例：

```json
{
  "token": "eyJ...",
  "user": {
    "email": "super@thinkflow.dev",
    "plan": "subscriber",
    "credits": 1029
  },
  "credentials": {
    "email": "super@thinkflow.dev",
    "password": "thinkflow2026"
  }
}
```

> 每次调用都会把永久积分重置回 999，方便反复测试。

---

## 本地调试完整流程

```bash
# 1. 启动数据库（首次需要 Docker）
cd packages/thinkflow
docker compose up -d

# 2. 启动后端（端口 3456）
cd packages/thinkflow/server
bun dev

# 3. 创建超级账号
curl -X POST http://localhost:3456/auth/create-super \
  -H "Content-Type: application/json"

# 4. 启动前端（端口 1421，自动代理后端）
cd packages/thinkflow/app
bun dev
```

然后访问 `http://localhost:1421/login`，用上面的邮箱和密码登录。

---

## 积分消耗速查

| 操作 | 消耗积分 |
|------|------|
| 文字生成（知乎 / 公众号 / 日记等）| 8 积分 / 次 |
| 图文生成（小红书，最多 6 张图）| 18 积分 / 次 |
| 矩阵模式 | × 人设数倍 |
| 内测每日赠送 | 30 积分（当天清零）|

---

## 安全说明

- `POST /auth/create-super` 接口在生产环境默认**禁用**
- 如需在 Sealos 上临时开启，设置环境变量 `ALLOW_SUPER_ACCOUNT=1`，用完后**立即移除**
- 该账号密码明文写在文档里，**不要用于任何真实用户数据的环境**
