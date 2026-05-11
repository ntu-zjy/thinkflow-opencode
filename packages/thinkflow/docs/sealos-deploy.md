# Sealos 部署指南

两个独立 App：**thinkflow-opencode**（后端）和 **thinkflow-frontend**（前端）。

---

## 前置步骤：配置 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions 中添加：

| Secret 名称 | 值 |
|---|---|
| `DOCKERHUB_USERNAME` | 你的 Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token（在 hub.docker.com → Account Settings → Security 生成） |
| `VITE_OPENCODE_SERVER_URL` | 先填占位符 `https://placeholder`，等 opencode App 部署后更新为真实地址 |

推送代码到 `feat/sealos-deploy-auth` 分支后，GitHub Actions 会自动构建并推送两个镜像到 Docker Hub：
- `你的用户名/thinkflow-opencode:latest`
- `你的用户名/thinkflow-frontend:latest`

---

## App 1：thinkflow-opencode（后端）

在 Sealos 应用管理中创建新 App：

| 字段 | 值 |
|---|---|
| **Name** | `thinkflow-opencode` |
| **Image** | `你的DockerHub用户名/thinkflow-opencode:latest`（选 Private 或 Public） |
| **CPU** | 0.5 Core |
| **Memory** | 512 MB |
| **Container Port** | `4096` |
| **Enable Internet Access** | ✅ 开启 |

**环境变量**（Advanced Configuration → Environment Variables）：

| Key | Value |
|---|---|
| `PORT` | `4096` |
| `OPENROUTER_API_KEY` | `sk-or-v1-你的key` |

部署后，Sealos 会分配一个域名，格式类似：
```
https://thinkflow-opencode.cloud.sealos.run
```

记录这个地址，下一步用。

---

## 更新 GitHub Secret：VITE_OPENCODE_SERVER_URL

将上一步得到的 opencode 域名填入：

```
VITE_OPENCODE_SERVER_URL = https://thinkflow-opencode.cloud.sealos.run
```

然后重新触发一次 GitHub Actions（在 Actions 页面点 "Re-run jobs"），重新构建前端镜像（此时 OpenCode 地址已打包进去）。

---

## App 2：thinkflow-frontend（前端）

| 字段 | 值 |
|---|---|
| **Name** | `thinkflow-frontend` |
| **Image** | `你的DockerHub用户名/thinkflow-frontend:latest` |
| **CPU** | 0.2 Core |
| **Memory** | 256 MB |
| **Container Port** | `80` |
| **Enable Internet Access** | ✅ 开启 |

**环境变量**：

| Key | Value |
|---|---|
| `OPENROUTER_API_KEY` | `sk-or-v1-你的key` |
| `FRONTEND_URL` | `https://thinkflow-frontend.cloud.sealos.run`（填 Sealos 分配给前端的域名） |

---

## 验证

1. 访问前端域名，页面正常加载
2. 打开 Landing 页，点击「开始使用」进入 `/app`
3. 创建一个文本输入节点 + Agent 节点 + 知乎输出节点
4. 点运行，确认流式输出正常
5. 选小红书平台，运行图片生成，确认返回真实图片

---

## 更新部署

每次推代码到 `feat/sealos-deploy-auth` 或 `thinkflow-mvp1` 分支，GitHub Actions 自动重建镜像。

Sealos 不会自动拉取新镜像，需要手动在 App 详情页点 **「重新部署」** 或开启 **Image Pull Policy: Always**。
