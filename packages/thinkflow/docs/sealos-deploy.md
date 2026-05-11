# Sealos 部署指南

ThinkFlow 云端部署采用两个独立 App：**thinkflow-opencode**（OpenCode 后端服务）和 **thinkflow-frontend**（React 前端 + Nginx）。

当前部署地址：
- 前端：https://bawzdlyeewhf.cloud.sealos.io
- OpenCode 服务：https://eqctmtdymqbx.cloud.sealos.io

---

## 架构说明

```
用户浏览器
    ↓ HTTPS
thinkflow-frontend（Sealos，Nginx，port 80）
    ├── 静态文件服务（React SPA）
    └── /api/openrouter/* → proxy_pass → openrouter.ai（注入 API Key）
    ↓ VITE_OPENCODE_SERVER_URL（构建时打包）
thinkflow-opencode（Sealos，Bun，port 4096）
    └── OpenCode HTTP + SSE 服务
    ↓ 调用
OpenRouter API（新加坡直连，无需代理）
```

**关键点**：`VITE_OPENCODE_SERVER_URL` 是构建时打包进前端 JS 的，不是运行时环境变量。因此每次修改 OpenCode 地址后必须重新构建前端镜像。

---

## 一、GitHub Actions 自动构建

### 1.1 配置 GitHub Secrets

在仓库 → Settings → Secrets and variables → Actions 中添加以下 3 个 Secret：

| Secret 名称 | 说明 |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名（如 `jingyuanzzz`） |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token（hub.docker.com → Account Settings → Security → New Access Token，权限选 Read/Write） |
| `VITE_OPENCODE_SERVER_URL` | OpenCode 服务的公网地址（第一次先填占位符 `https://placeholder`） |

> ⚠️ **坑：GitHub Actions 免费额度**
> Private 仓库每月只有 2000 分钟免费额度，用完后 Actions 直接拒绝运行（报 "spending limit" 错误）。
> **解决方案**：将仓库改为 Public（Settings → General → Danger Zone → Change visibility），Public 仓库 Actions 完全免费。

### 1.2 触发构建

推送代码到 `feat/sealos-deploy-auth` 或 `thinkflow-mvp1` 分支会自动触发，也可以在 Actions 页面手动点 **Run workflow**。

> ⚠️ **坑：空提交不触发 CI**
> `git commit --allow-empty` 的空提交因为没有修改任何 `paths` 过滤范围内的文件，不会触发 workflow。
> **解决方案**：去 Actions 页面手动点 Run workflow 手动触发。

构建完成后会推送两个镜像到 Docker Hub：
- `jingyuanzzz/thinkflow-opencode:latest`
- `jingyuanzzz/thinkflow-frontend:latest`

---

## 二、部署 App 1：thinkflow-opencode

### 2.1 在 Sealos 新建 App

| 字段 | 值 |
|---|---|
| **Name** | `thinkflow-opencode` |
| **Image** | 选 **private** |
| **Image Name** | `jingyuanzzz/thinkflow-opencode:latest` |
| **Username** | `jingyuanzzz` |
| **Password** | Docker Hub Access Token（同上） |
| **CPU** | 0.5 Core |
| **Memory** | 512 MB |
| **Container Port** | `4096` |
| **Enable Internet Access** | ✅ 开启 |

> ⚠️ **坑：镜像认证**
> 即使镜像是 Public，Sealos 的 private 模式填 Access Token 更安全，可防止外部随意拉取镜像。
> Docker Hub 的 Password 字段必须填 **Access Token**，不能填账号密码（会认证失败）。

### 2.2 环境变量（Advanced Configuration）

| Key | Value |
|---|---|
| `PORT` | `4096` |
| `OPENROUTER_API_KEY` | `sk-or-v1-你的key` |

entrypoint 脚本（`docker-entrypoint.sh`）会在容器启动时自动将 `OPENROUTER_API_KEY` 写入 `~/.local/share/opencode/auth.json`，OpenCode 服务读取后即可调用 OpenRouter。

### 2.3 记录分配的公网地址

部署完成后，Sealos 会分配域名，格式类似：
```
https://eqctmtdymqbx.cloud.sealos.io
```

验证服务是否正常：
```bash
curl https://eqctmtdymqbx.cloud.sealos.io/global/health
# 返回：{"healthy":true,"version":"local"}
```

---

## 三、更新 VITE_OPENCODE_SERVER_URL 并重建前端

拿到 OpenCode 公网地址后：

1. 去 GitHub → Settings → Secrets → 编辑 `VITE_OPENCODE_SERVER_URL`，填入真实地址（如 `https://eqctmtdymqbx.cloud.sealos.io`）
2. 去 Actions → ThinkFlow Release → **Run workflow** 手动触发，重新构建前端镜像

> ⚠️ **坑：必须重新构建前端**
> `VITE_OPENCODE_SERVER_URL` 是 Vite 构建时通过 `import.meta.env` 打包进 JS bundle 的，不是 nginx 运行时读取的。
> 更新 Secret 后必须重新 build 镜像，否则前端仍然连接旧地址或 placeholder。

---

## 四、部署 App 2：thinkflow-frontend

### 4.1 在 Sealos 新建 App

| 字段 | 值 |
|---|---|
| **Name** | `thinkflow-frontend` |
| **Image** | 选 **private** |
| **Image Name** | `jingyuanzzz/thinkflow-frontend:latest` |
| **Username** | `jingyuanzzz` |
| **Password** | Docker Hub Access Token |
| **CPU** | 0.2 Core |
| **Memory** | 256 MB |
| **Container Port** | `80` |
| **Enable Internet Access** | ✅ 开启 |

### 4.2 环境变量

| Key | Value |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-v1-你的key` |
| `FRONTEND_URL` | Sealos 分配给前端的公网地址（如 `https://bawzdlyeewhf.cloud.sealos.io`） |

`FRONTEND_URL` 用于 nginx 配置中的 `HTTP-Referer` 头（OpenRouter 审计用），部署后在**变更**里填入真实域名。

---

## 五、验证

```bash
# 1. OpenCode 健康检查
curl https://eqctmtdymqbx.cloud.sealos.io/global/health

# 2. 前端可访问
curl -o /dev/null -w "%{http_code}" https://bawzdlyeewhf.cloud.sealos.io
# 期望返回 200
```

浏览器端验证：
1. 打开前端域名，Landing 页正常加载
2. 点「开始使用」进入 `/app`
3. 右键添加文本输入 + Agent + 知乎输出节点，点运行，确认流式输出正常
4. 选小红书平台，运行图片生成，确认返回真实图片（非 SVG 占位图）

---

## 六、更新部署流程

每次代码变更后：

1. 推送到 `feat/sealos-deploy-auth` 或 `thinkflow-mvp1` 分支（或手动 Run workflow）
2. 等 GitHub Actions 构建完成（约 3-5 分钟）
3. 去 Sealos 对应 App 页面点 **「重启」** 拉取最新镜像

> ⚠️ **坑：Sealos 不自动更新镜像**
> Sealos 默认 `imagePullPolicy: IfNotPresent`，重新部署不会自动拉取新的 `:latest` 镜像。
> 必须手动点「重启」或「变更」触发重新拉取。

---

## 踩坑汇总

| 问题 | 原因 | 解决方案 |
|---|---|---|
| GitHub Actions 报 "spending limit" 错误 | Private 仓库 Actions 2000 分钟免费额度用完 | 将仓库改为 Public |
| 空提交不触发 CI | workflow 配置了 `paths` 过滤，空提交无文件变更 | 手动 Run workflow |
| Sealos 拉镜像失败（ErrImagePull） | Docker Hub 镜像为 Private 但认证信息有误 | Password 填 Access Token 而非登录密码 |
| 前端仍连接旧 OpenCode 地址 | `VITE_OPENCODE_SERVER_URL` 是构建时变量，改 Secret 后需重建镜像 | 更新 Secret → 手动触发 CI → Sealos 重启前端 App |
| Sealos 重启后仍是旧版本 | 默认不重新拉取 `:latest` 镜像 | 手动点「重启」触发拉取 |
