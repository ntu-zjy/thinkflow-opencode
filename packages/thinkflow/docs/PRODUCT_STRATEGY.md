# 产品战略：思流国内版 × ThinkNote 海外版

> 记录时间：2026-05-16

---

## 一、总体分流决策

**结论：两个独立产品，两个独立仓库，不共享业务代码。**

### 为什么不共用同一个仓库

现有思流架构是"工作流画布 + OpenCode sidecar"，海外版 ThinkNote 的核心是"持久记忆 + 对话流 + 文档编辑器"，两者几乎没有可复用的业务逻辑。强行 monorepo 只会让两边都难受。

真正可以复用的只有：
- OpenCode 作为 AI 后端（直接引用）
- Auth/支付通用逻辑（但海外要换 Stripe，国内用 ZPAY）
- 对 Agent 工作流的认知（非代码）

---

## 二、思流（国内版）

### 定位

国内内容创作工作流工具。面向知乎作者、公众号博主、小红书创作者等中文内容生产者。

### 部署目标：腾讯云轻量服务器

**服务器配置（推荐）**
- 规格：2C4G，上海区（ICP 备案要求服务器在国内）
- 系统：Ubuntu 22.04
- 开放端口：80、443、22

**当前部署架构（Docker Compose）**

```
nginx (80/443)
  ├── /api/thinkflow/ → thinkflow-server (3456)  # Auth/支付/记忆库
  ├── /api/openrouter/ → 待替换为国内模型代理
  └── /                → 前端静态文件 (React SPA)

opencode-service (4096)   # AI 推理引擎
postgres (5432)           # 用户/订阅/支付数据
```

### ICP 备案流程

> ⚠️ 备案周期约 20-30 个工作日，越早提交越好。

**所需材料**
- 域名（.cn 或 .com 均可，备案绑定的是服务器 IP）
- 法人/个人身份证
- 手机号验证（网站负责人）
- 备案期间服务器不可公开访问

**流程**
1. 腾讯云控制台 → 备案 → 填写主体信息（个人备案更简单）
2. 上传身份证照片、配合人脸识别
3. 工信部初审（5-10 个工作日）
4. 管局审核（10-20 个工作日）
5. 备案号下发后，在页面 footer 添加 `京ICP备XXXXXXXX号` 链接

### 国内模型切换

**当前问题：** 代码写死了 `providerID = "openrouter"`，国内访问 OpenRouter 不稳定且需要翻墙。

**替换方案（优先级排序）**

| 模型 | Provider | 优势 | 适用场景 |
|------|----------|------|---------|
| DeepSeek-V3 | deepseek | 成本极低（约$0.27/M tokens），中文能力强 | 文本生成主力 |
| 通义千问 Max | 阿里云百炼 | 国内稳定，中文理解优秀 | 备选文本 |
| Kimi K2 | Moonshot AI | 长上下文（128K） | 长文档处理 |
| 豆包 Pro-32K | 字节跳动 | 创意写作表现好 | 内容创作 |

**需要修改的文件**

| 文件 | 改动 |
|------|------|
| `app/src/services/opencodeClient.ts` | `sendPrompt` 中 `providerID` 改为动态读取（非硬编码 `openrouter`） |
| `app/src/store/canvasStore.ts` | 默认 model 从 `anthropic/claude-sonnet-4.6` 换为 `deepseek/deepseek-chat` |
| `app/nginx.conf` | `/api/openrouter/` 代理改为 DeepSeek/通义 API 地址 |
| `docker-compose.yml` | 新增 `docker-compose.cn.yml` 覆盖国内版环境变量 |

### 推进顺序

```
Step 1  立即提交 ICP 备案（流程最长）
Step 2  购买腾讯云轻量服务器 + 绑定域名
Step 3  代码加 VITE_REGION=cn|global 环境变量，分离模型列表
Step 4  接入 DeepSeek API，测试 opencode 服务对接
Step 5  docker-compose.cn.yml 完成，国内版部署上线
Step 6  备案号到位后 footer 添加备案信息，正式公开
```

---

## 三、ThinkNote（海外版）

### 定位

**Agent Native 灵感笔记**。对标 Notion/Obsidian/Roam Research，但产品形态更激进：

> 笔记本身就是一个持续运行的 Agent。对话即记录，让每一个灵感都不流失。

**和 Notion AI 的本质区别：**
- Notion：笔记本 + AI（AI 需要唤醒，是工具）
- ThinkNote：笔记本身就是智能体（Agent 持续维护内容，是形态）

### 核心体验

**三种记忆维护模式（都有）**
1. **实时**：用户说一句话，Agent 立即整理进对应笔记
2. **后台定期**：每天凌晨 Agent 自动整理当日对话，归纳成笔记
3. **主动触发**：用户说"整理一下"，Agent 按需归纳

**笔记形态**
- 默认视图：对话流（聊天界面，Agent 和用户的来回构成内容本体）
- 切换视图：Markdown 编辑器（兼容标准 Markdown，可导出）
- 未来扩展：知识图谱视图、卡片流视图

### 技术架构

**新建独立仓库：`thinknote`**

```
用户对话界面 (React)
    ↓
对话路由层
    ├── 实时整理 → agentmemory observe API
    ├── 定期归纳 → cron job → agentmemory consolidate
    └── 主动整理 → agentmemory smart-search + 归纳
    ↓
agentmemory 持久记忆引擎（MIT 开源，rohitg00/agentmemory）
    ↓
OpenCode HTTP Server（AI 推理）
    ↓ 国际版模型：Claude Sonnet / GPT-4o（via OpenRouter）
```

### 持久记忆层：agentmemory

**为什么选 agentmemory（https://github.com/rohitg00/agentmemory）**
- MIT 协议，可商用
- 零外部数据库依赖（SQLite + iii-engine，自带向量检索）
- 4 层记忆架构（原始观测 → 压缩观测 → 记忆 → 会话摘要）
- BM25 + 向量 + 知识图谱三路融合检索（R@5 = 95.2%）
- 记忆自动衰减（Ebbinghaus 遗忘曲线）+ 矛盾检测
- REST API 在 `:3111`，OpenCode 已原生支持作为 MCP server 接入

**核心 API（ThinkNote 需要用到的）**

```typescript
// 对话时实时捕获观测
POST /agentmemory/observe
{ sessionId, content, type: "conversation" }

// 混合检索（找相关记忆）
POST /agentmemory/smart-search
{ query: "用户的灵感关键词" }

// 生成上下文注入（给 Agent 的前缀）
POST /agentmemory/context
{ sessionId }

// 触发4层归纳整合
POST /agentmemory/session/end
{ sessionId }
```

**记忆分层（4 层）**

| 层级 | 内容 | 生命周期 |
|------|------|---------|
| RawObservation | 原始对话/操作记录 | 短期，用于压缩 |
| CompressedObservation | 提炼的事实 + 叙事 | 中期 |
| Memory | 跨会话的模式/偏好/知识 | 长期，有衰减曲线 |
| SessionSummary | 每次会话的摘要 | 永久归档 |

记忆类型（`Memory.type`）与 ThinkNote 的对应关系：
- `pattern` → 用户的写作习惯、思维模式
- `preference` → 偏好的表达风格、话题倾向
- `fact` → 具体灵感、知识点
- `workflow` → 用户常用的整理方式

### 部署目标

- 海外云（Sealos 国际区 / Fly.io / Railway）
- 模型：Claude Sonnet 4.6 / GPT-4o（via OpenRouter）
- 支付：Stripe
- 域名：thinknote.ai（待注册）
- 无需 ICP 备案

### 新仓库初始技术栈

```
前端：React + Vite + TailwindCSS
编辑器：TipTap（支持 Markdown + 富文本 + 自定义扩展）
状态：Zustand
后端：Bun + Hono（轻量 HTTP）
记忆引擎：agentmemory（self-hosted Docker）
AI 推理：OpenCode HTTP Server
数据库：PostgreSQL（用户/订阅）
```

---

## 四、两产品对比总览

| 维度 | 思流（国内版） | ThinkNote（海外版） |
|------|--------------|-------------------|
| 定位 | 内容创作工作流 | Agent Native 灵感笔记 |
| 核心交互 | 画布 + 节点 | 对话 + 文档 |
| AI 模型 | DeepSeek / 通义 / Kimi | Claude / GPT-4o |
| 持久记忆 | memoryStore（localStorage） | agentmemory（服务端向量DB） |
| 支付 | 支付宝（ZPAY） | Stripe |
| 部署 | 腾讯云轻量 + ICP 备案 | 海外云，无需备案 |
| 仓库 | thinkflow-opencode（现有） | thinknote（新建） |
| 品牌 | 思流 ThinkFlow | ThinkNote |
| 目标用户 | 中文内容创作者 | 英语用户，知识工作者 |
