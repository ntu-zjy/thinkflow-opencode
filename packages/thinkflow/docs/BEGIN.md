# 产品定位
- 中文名:思流
- 英文名:ThinkFlow
- 形态:画布应用
- 后端技术栈: OpenCode 的 Agent 运行内核 + Plugin 系统
- 前端形态: 无限画布式可视化编辑器,节点即执行计划任务
- 一句话定位: 可记忆，适配多内容平台的Agent Native内容创作神器
- 核心理念：大模型要处理的事情无非是输入和输出, 我们要做的就是让输入和输出都清晰可见，可管理，可视化。
- 核心理念2: 架构易于扩展，易改装，接口清晰，拒绝过度工程化

# 用户
1. 个人自媒体运营者
2. 小型商户自媒体运营者
3. 账号矩阵需求运营者
4. 仅仅是有内容创作需求的用户
5. 广告营销/海报设计等用户

# 要解决的问题/痛点
1. 对于个人/小团队，运营矩阵账号费时费力
2. 市面上绝大多数内容创作产品上下文的复用困难，每次都要输入大量提示词
3. 接上一条，如果上下文不全，账号人设就容易出现不一致的情况

# 特性/概念
## 输入
输入不仅仅局限于文本，可以是很多种形式的输入。举几个例子（当然需要明确下来要实现的几个类型，标注好实现的优先级）：
1. 信息流：信息流通过 MCP 插件实现，用户可以选择预设的 MCP 工具（如 fetch、GitHub）获取实时数据。ThinkFlow 不自己实现爬虫，而是通过 OpenCode 的 MCP 体系扩展。MVP 里预设 GitHub 和 fetch 两个入口，其余由用户自行配置。注意：OpenCode 本身有能力直接读取本地文件，无需额外 MCP。
2. PDF: PDF这种类型的输入，模型无法直接读取，但是只要是把这种输入作为地址输入进来，Agent框架是可以有自己的方式去处理的。
3. 自媒体人设：人设是一种身份标识，可以是自媒体账号的截图，也可以是一段语言描述，也可以是账号的链接
4. 记忆库：一个结构化目录，用户可以指定读取某个特殊记忆，也可以让Agent自行搜索
## 想法
想法是 Agent 节点的一个属性（不是独立节点），在 Agent 节点上有一个输入框，用户可以写下当下的灵感或指令，作为本次运行的额外上下文传入。
## 输出
输出=（输入+想法）-> Agent
输出需要适配多个内容创作平台，用户可以预先配置内容创作平台的格式。
可以链接出来多个输出，可以设置重复运行次数。
输出类型包括：知乎、公众号、日记/小说/笔记（共 3 种平台格式）。
也可以输出记忆。
## 记忆
记忆是 ThinkFlow 的核心差异化能力，解决上下文复用难题。

### 记忆类型
- 账号人设记忆（写作风格、口头禅、价值观）
- 内容素材记忆（金句库、案例库、数据）
- 用户偏好记忆（常用平台、发布习惯）

### 记忆调用方式
- **显式调用**：用户在输入节点指定具体记忆
- **隐式调用**：开启记忆模式，Agent 根据输入内容自动检索相关记忆

### 记忆存储
记忆库使用本地 JSON 文件存储，与 OpenCode 的 session 数据分开管理。

## Agent+plugin
### 核心能力
- **基础 Agent**：基于 OpenCode 的 Agent 运行内核，统一使用 build 模式
- **OpenCode 集成方式**：ThinkFlow 将 OpenCode 作为独立后端进程调用，前端、前后端交互、桌面端均独立实现。ThinkFlow 通过 OpenCode HTTP API（默认 localhost:4096）与其通信。
- **Plugin 扩展**：ThinkFlow UI 提供常用插件列表，用户可一键安装（实际是写入 opencode.json 配置），支持管理已安装的 MCP 工具和 Plugin。MVP 里展示内置 Agent 列表，不暴露自定义 Plugin 开发能力。

### MCP 工具集成
信息流输入通过 MCP 插件实现，MVP 预设以下入口：
- `fetch`（网页抓取，官方 mcp-server-fetch）
- `GitHub`（mcp-server-github，热榜/Trending 等）
- OpenCode 本身可直接读取本地文件，不需要额外 MCP

## 画布
类似coze那种画布，但是现阶段现不做复杂画布，只做输入，Agent，想法，输出单节点
### 节点类型
1. **输入节点**
- 支持拖拽上传文件（实际输入是本地文件地址）
- 支持粘贴互联网链接
- 支持选择记忆库

2. **想法**
- 想法是 Agent 节点的属性，在 Agent 节点上有一个文本输入框，不是独立节点

3. **Agent 节点**
- 统一使用 build 模式 Agent
- 用指示灯和动态的箭头流动或者加载条，显示运行状态（待运行/运行中/完成/错误）
- 运行状态通过 OpenCode 的 SSE event.subscribe 或 WebSocket 实时获取（优先评估 SSE，次选 WebSocket）
- 点击可查看具体消息列表
- 多个输入节点都可以连接在Agent节点上
- Agent 节点可以连接到多个输出节点
- Agent 节点包含"想法"输入框（即本次运行的额外指令/灵感）

4. **输出节点**
- 选择目标平台格式（知乎 / 公众号 / 日记·小说·笔记）
- 预览渲染效果
- 设置输出地址

### 连线规则
- 输入 → Agent（必须）
- 想法：Agent 节点的属性，不参与连线
- Agent → 输出（必须，可多连）
- 输出 → 输入（不支持循环设置，另外开启一个画布）

### 画布操作
- 滚轮缩放
- 拖拽画布
- 框选多节点
- 右键菜单（复制/删除/运行至此）

# 适配生态
做成电脑桌面端软件，适配macos，windows, linux

# 特性
## 对于用户
1. 认知负担低，上手成本非常低
2. 个性化，越用越合适
3. 方便，支持图像，PDF，音频，文本，网页链接等各种形式的输入
4. UI可视化意义明确，一看就知道是什么意思
## 对于开发者
1. Agent Native，开发者可以直接在这个库使用Claude code ，open code等框架进行开发
2. 目录易索引
## 用于融资/推广/宣传
设计一些机制，可以用于推广，比如邀请码分销裂变

# README
Readme支持中英双语。
用文件树说明产品设计结构。
快速熟悉，快速上手。

# UI/UX 风格设计
**禁止**使用表情包作为图标和组件，所有图标必须下载自互联网知名图标库（如Iconfinder、Flaticon、Ant design）
详细的风格设计原则必须参照DESIGN.md
产品的logo icon采用艺术字体设计，独特且具有美感，禁止AI味。

# 设计原则
<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:
 
Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
 
Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
 
Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
 
Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.
 
Avoid generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character
 
Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

# 具体实现技术栈
## 桌面端
- **框架**：Tauri (Rust + WebView)
- **前端**：React + TypeScript + Zustand (状态管理)
- **画布引擎**：@xyflow/react v12
- **UI 组件**：Chakra UI v3（仅此一个，不同时使用 Ant Design）

## 后端
- **Agent 内核**：OpenCode（作为独立后端进程运行，ThinkFlow 通过 HTTP API 调用，默认 localhost:4096）
- **Plugin 系统**：OpenCode Plugin SDK（通过 opencode.json 配置管理，ThinkFlow UI 提供插件列表管理界面）
- **数据库**：本地 JSON 文件（记忆库）；账户/支付等后端服务预留接口但 MVP 不实现
- **文件存储**：本地文件系统 + 可选云存储

## AI 能力
- **默认模型**：MoonshotAI Kimi K2.6，model ID: `moonshotai/kimi-k2.6`，通过 OpenRouter 接入（参考 https://openrouter.ai/moonshotai/kimi-k2.6 及 OpenRouter 官方文档）
- **图像理解**：kimi-k2 支持多模态
- **生图模型**: nano-banana-2, gpt-image-2

## 构建与发布
- **CI/CD**：GitHub Actions
- **代码签名**：Apple Developer / Windows EV
- **更新机制**：Tauri Updater

## 可借鉴
借鉴Opencode的思路，实现一个通用的app, 之后网页端和桌面端都复用app的代码就好

# 用户交互流程细化
备注：精准到用户每次点击的反馈
## 首次使用流程
1. 下载安装 → 打开应用 → 欢迎页展示产品理念
2. 引导创建第一个「人设记忆」（可选跳过）
3. 进入画布 → 自动展示示例工作流
4. 新手引导：高亮提示"点击这里添加输入"

## 日常创作流程
1. **新建画布**：点击 "+" → 空白画布/从模板选择
2. **添加输入**：拖拽文件/粘贴链接/选择记忆
3. **配置 Agent**：点击 Agent 节点（统一 build 模式），填写"想法"输入框
4. **运行**：点击节点「▶ 运行」或全局「运行全部」
5. **查看输出**：点击输出节点预览 → 复制/导出
6. **保存记忆**：一键将本次输出存为记忆

## 记忆管理流程
1. 侧边栏进入「记忆库」
2. 新建/编辑记忆分类
3. 导入：支持 markdown/json 批量导入
4. 导出：支持备份到本地文件

## 高级：模板发布流程
1. 工作流运行验证通过
2. 点击「发布为模板」
3. 填写模板信息（名称/描述/标签）
4. 生成分享链接/邀请码

# 支付方案
**MVP 不包含支付系统，推迟到下一阶段。**
预留接口：数据库/账户模块设计时预留 userId、quota、inviteCode 字段，方便后续快速接入。
后续方案：ZPAY 绑定支付宝；管理员可手动给特定用户增加用量。

# 注册方案
**MVP 不包含注册系统，推迟到下一阶段。**
预留接口：本地设置页面预留"账号"入口占位，方便后续快速接入。
后续方案：邮箱+密码+（邀请码）。

# 推广机制
邀请码分销模式（MVP 后实现）

# 竞品调研
自动进行竞品调研，每个竞品写一个md,写到一个文件夹里面

# 功能边界
## 包含在 MVP
- 基础画布：输入 → Agent → 输出 单节点，但是可以多个输入和多个输出
- 5 种输入类型：文本、文件(PDF/图片)、URL、记忆、信息流（MCP）
- 3 种输出平台类型：知乎、公众号、日记/小说/笔记
- 记忆库基础功能（本地 JSON 文件存储）
- 本地桌面版运行
- MCP 插件列表 UI（预设 GitHub、fetch 快捷入口）
- dry-run 模式（模拟运行，不调用模型，用于调试工作流）

## 不包含在 MVP（预留接口，后续快速接入）
- 邮箱注册 / 支付系统 / 邀请码系统 / 管理员超级号 / 内测码
- 复杂画布（循环、条件分支）
- 多人协作
- 云端同步
- 插件市场
- 语音输入

# 要求
1. **禁止**改动本文件，本文件仅允许人类修改.
2. 在使用依赖库之前，**必须**使用context7搜索相关文档。
3. 代码**必须**全部放置在packages下面的thinkflow下。
4. 在编写代码前，必须了解packages的内容，了解opencode这个架构的编写方式和背景信息。
5. 遇到报错问题，或者是用户的新需求，需要考虑从**全局系统**的层面来解决，而非在一个点上不停的打补丁，从而导致漏洞越来越多。
6. 在交付代码之前，**必须**跑通测试，没有测试问题了再交付。
7. 必须附带README，包含如何测试
