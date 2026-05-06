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
2. PDF / 文档：PDF、Word、PPT、HTML、图片等格式通过 [microsoft/markitdown](https://github.com/microsoft/markitdown) 在本地自动转换为 Markdown，Agent 直接收到可读文本。转换由 Vite 内嵌的 `/api/convert-to-markdown` 端点完成（调用 `uvx --from "markitdown[all]" markitdown <file>`），用户需安装 `uv`（`curl -LsSf https://astral.sh/uv/install.sh | sh`）；不安装则降级为纯文本读取。
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

### 记忆分类（当前实现）
- **人设**：账号身份定义（写作风格、口头禅、价值观）
- **灵感**：想法片段、金句、创作素材
- **素材**：参考资料、链接摘录、关键信息
- **作品**：历次生成的内容输出
- **其他**：不属于以上分类的杂项记忆
- **自定义分类**：用户可在记忆面板自行新增分类（可重命名；非默认分类可删除）

### 记忆界面（当前实现：Notion 风格两栏）
- 记忆库作为与画布同级的全屏面板，从左侧边栏的"记忆"按钮切换进入
- **左栏（240px）**：分类树 + 条目列表
  - 分类行固定显示条目数和 `+`（新建条目）；重命名/删除按钮 hover 显示
  - 分类支持新增、重命名（inline input）、删除（非默认分类）
  - 条目 hover 右侧出现 × 删除按钮
  - 底部「＋ 新建分类」按钮
  - 搜索框（无旁边 + 按钮，新建入口统一到分类行）
- **右栏**：TipTap 富文本编辑器（见下方"记忆编辑器"章节）

### 记忆编辑器（TipTap 富文本）
- **固定 Toolbar**：H1/H2/H3、粗体/斜体/删除线/高亮/内联代码、无序列表/有序列表/引用/代码块、表格/分割线
- **Bubble Menu**：选中文字时浮出，快速格式化（B/I/S/高亮/代码/H1/H2/引用）
- **Slash Menu**：在行内输入 `/` 触发命令列表（标题/列表/引用/代码块/表格/分割线），选择后自动删除 `/`
- **表格**：插入 3×3 表格，进入表格后顶部出现操作栏（插入行列、删除行列/整表）
- **内容存储**：HTML 格式（TipTap 导出），传给 AI 时自动 `stripHtml()` 转为纯文本
- **样式**：全部使用 CSS 变量，深色/浅色主题自动适配

### 记忆调用方式
- **显式调用**：用户在输入节点指定具体记忆（InputNode "记忆" Tab，value 存纯文本）
- **矩阵模式**：AgentNode 矩阵 slot 绑定记忆条目，传给 AI 前 `stripHtml()` 剥离标签

### 记忆存储
记忆库使用 localStorage 持久化（Zustand persist），`MemoryEntry.content` 存储 TipTap HTML 字符串。

## Agent
### 核心能力
- **基础 Agent**：基于 OpenCode 的 Agent 运行内核，统一使用 build 模式
- **OpenCode 集成方式**：ThinkFlow 将 OpenCode 作为独立后端进程调用，通过 HTTP API（默认 localhost:4096）通信

### 定时任务（当前实现）
- AgentNode 内新增"定时运行"开关 + 时间选择器（每天固定 HH:MM 执行）
- 实现方式：分钟轮询，对齐到下一整分钟；`lastRunDateRef` 防同天重复；`_scheduleTimers` 管理 interval

### 矩阵模式（当前实现）
- AgentNode 内新增"矩阵模式"开关 + slot 列表（2~6 个）
- 每个 slot 独立绑定人设：选择记忆分类 → 选条目，或"自定义"直接填文本
- 运行时串行执行各 slot（避免并发覆盖输出节点）
- 日志格式：`[矩阵 i/n] 开始（人设: xxx）` / `[矩阵 i/n] 完成`
- **dry-run 矩阵模式**：`runMockWorkflow` 增加 `persona` 参数，每个 slot 生成带人设标识的差异内容，不再所有 slot 输出相同内容
- **矩阵结果多人设查看**：每个输出节点保存所有 slot 的结果（`matrixResults`），运行完成后通过紧凑下拉选择器（含 ‹/› 箭头 + 计数）切换查看各人设的输出，支持十几个乃至更多人设

### MCP 工具集成
信息流输入通过 MCP 插件实现，MVP 预设：
- `fetch`（网页抓取）
- `GitHub`（mcp-server-github）

## 画布
类似coze那种画布，但是现阶段不做复杂画布，只做输入、Agent、想法、输出单节点

### 多画布
- 左侧边栏支持多个画布（工作流），可新建/切换/关闭/双击重命名
- 每个画布独立 nodes/edges/历史记录，localStorage 持久化
- **切换画布时不中止后台进程**：`switchWorkflow` 不调用 `abortWorkflow`；`runWorkflow` 在启动时捕获 `runWorkflowId`，所有 SSE 回调通过工作流感知的 `updateWorkflowNodeData` 写入 `workflows[runWorkflowId].nodes`（后台工作流）和 `nodes`（当前活跃时），切回该画布时可看到完整结果

### 节点类型
1. **输入节点**（右键菜单直接添加，节点内切换类型）
- 文本输入：直接输入文字
- 链接输入：粘贴 URL，Agent 自动读取内容
- 文件输入：拖拽/点击上传，通过 markitdown 自动转换为 Markdown（支持 PDF、Word、PPT、HTML、图片等格式）；markitdown 不可用时降级为纯文本读取；节点显示「已转为 MD」或「原始文本」徽章
- 记忆输入：从记忆库选择条目（`value` 存 `stripHtml(entry.content)` 的纯文本）
- 信息流输入：通过 MCP 工具（fetch / GitHub）获取实时数据

2. **想法**
- 想法是 Agent 节点的属性，在 Agent 节点上有一个文本输入框，不是独立节点

3. **Agent 节点**
- 统一使用 build 模式 Agent
- 用指示灯和动态连接线动画，显示运行状态（待运行/运行中/完成/错误）
- 运行状态通过 OpenCode SSE 实时获取
- 多个输入节点都可以连接在 Agent 节点上
- Agent 节点可以连接到多个输出节点（并行执行）
- Agent 节点包含"想法"输入框（即本次运行的额外指令/灵感）
- **定时任务**：每天固定时间自动执行
- **矩阵模式**：多 slot 绑定不同人设，串行执行

4. **输出节点**（右键菜单直接添加，节点内选平台和创作形式）
- 支持 5 个平台：知乎 / 公众号 / 日记·笔记 / 小红书 / **视频**
- 支持 3 种创作形式（独立于平台）：**纯文本** / **图文**（强制触发图片生成）/ **自主**（Agent 自行决定）
- 图文生成：Agent 输出 `[IMG_PROMPT:...]` 标记，前端解析后调用图片生成模型
- **视频生成**：Agent 在 `video-nextjs/` 目录自由写 Remotion React 组件代码 → edge-tts 生成配音 → CLI 渲染竖版 1080×1920 MP4，OutputNode 自动检测产出文件并内嵌 `<video>` 播放器
- 卡片预览（最大高度 200px），点放大按钮弹出全屏详情（带背景虚化）
- 一键复制 + 存为记忆 + 下载图片
- **矩阵结果查看**：矩阵运行完成后，节点顶部出现人设选择器（下拉 + ‹/› 箭头 + n/total 计数），切换即可查看任意人设的输出；复制/存为记忆操作均针对当前选中人设

### 连线规则
- 输入 → Agent（必须）
- 想法：Agent 节点的属性，不参与连线
- Agent → 输出（必须，可多连）
- 输出 → 输入（不支持循环，另外开启一个画布）

### 画布操作
- 滚轮缩放
- 拖拽画布
- 框选多节点
- 右键菜单（复制/删除/运行至此）
- 快捷键：⌘Z 撤销 / ⌘⇧Z 重做 / ⌘A 全选 / ⌘Enter 运行 / Space 归位

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

## 部署架构（已上线）

### 网页版（Vercel + Railway）

```
用户浏览器
  ↓  HTTPS
Vercel（静态前端 + /api/openrouter 代理 API Key）
  ↓  HTTPS
Railway（OpenCode serve，Docker 容器，--cors '*'）
  ↓
OpenRouter → AI 模型（Kimi K2.6 等）
```

- **Vercel 网址**：`https://thinkflow-opencode-app.vercel.app`
- **Railway 服务**：`https://thinkflow-opencode-production.up.railway.app`
- **生产分支**：`thinkflow-mvp1`
- **Vercel 环境变量**：`VITE_OPENCODE_SERVER_URL`（指向 Railway URL）、`OPENROUTER_API_KEY`
- **Railway 环境变量**：`OPENROUTER_API_KEY`
- **Dockerfile**：`packages/thinkflow/Dockerfile.opencode`（Railway Settings → Build → Dockerfile Path）

### 桌面版（Tauri + Sidecar）

- sidecar 二进制放在 `packages/thinkflow/desktop/src-tauri/sidecars/`
- 已构建：`ThinkFlow_0.1.0_aarch64.dmg`（macOS ARM，约 44MB）
- 用户安装后直接运行，无需安装 OpenCode
- **发布流程**：使用 `bun tauri build --no-bundle` 编译 `.app`，再用 `hdiutil create` 手动打包 DMG（绕开 `bundle_dmg.sh` 残留文件导致的失败），最后通过 `gh release create` 上传到 GitHub Releases；完整步骤见 `docs/RELEASE.md`
- **DMG 安装提示**：若 macOS 提示"已损坏，无法打开"，运行 `xattr -cr /Applications/ThinkFlow.app` 清除隔离属性

---

# 具体实现技术栈
## 桌面端
- **框架**：Tauri (Rust + WebView)
- **前端**：React + TypeScript + Zustand (状态管理)
- **画布引擎**：@xyflow/react v12
- **图标**：Chakra UI v3（仅此一个，不同时使用 Ant Design）
- **节点Node**：节点组件直接基于 @xyflow/react 的原生能力，不再额外套壳
- **节点宽度声明**：每个节点对象必须在 `style.width` 中声明与 CSS `minWidth` 一致的宽度（input: 280, agent: 300, output: 320），否则 `fitView` 无法正确感知节点真实尺寸，导致节点超出视口
- **富文本编辑器**：TipTap v3（@tiptap/react + starter-kit + extension-table + extension-bubble-menu 等），用于记忆笔记区，支持 Toolbar / Bubble Menu / Slash Menu（输入 `/` 触发）/ 表格
- **视频渲染子项目**：`packages/thinkflow/video-nextjs/`，Remotion 4.0.456 子项目，**由 OpenCode Agent 直接在此目录写 React 代码并用 CLI 渲染**，不通过程序化 API

## 视频生成（Agent + Remotion CLI + edge-tts）

### 架构
ThinkFlow 视频生成采用"Agent 写代码 + CLI 渲染"模式：
- **OpenCode Agent** 读取 Remotion skill（`~/.config/opencode/skills/remotion/`），直接修改 `video-nextjs/src/remotion/VideoComposition.tsx` 和 `Root.tsx`，然后执行 `npx remotion render` 渲染
- **edge-tts**：Agent 调用生成中文 TTS mp3（`pip install edge-tts`），放入 `video-nextjs/public/`
- **ffprobe**：Agent 用于读取音频时长，计算每个分镜的 durationInFrames（随 `brew install ffmpeg` 安装）
- **chrome-headless-shell**：Remotion CLI 自带浏览器缓存机制，`npx remotion browser ensure` 下载约 193MB 的 `chrome-headless-shell` 到 `node_modules/.remotion/`，渲染时自动使用，**无需用户安装 Chrome**；仅在缓存不存在且无网络时才需 `--browser-executable` 指向系统 Chrome 作为备选

### Remotion Skill 安装（必须）
```bash
# 安装后 OpenCode Agent 自动读取，获得 Remotion 最佳实践知识
git clone --depth 1 https://github.com/remotion-dev/skills.git /tmp/remotion-skills
cp -r /tmp/remotion-skills/skills/remotion ~/.config/opencode/skills/
```

### 视频生成交互流程
1. 用户选择视频平台，运行 Agent
2. Agent 写 Remotion 代码、调 edge-tts 生成配音、执行 CLI 渲染
3. 渲染产出 `video-nextjs/out/video.mp4`
4. OutputNode 自动检测（`HEAD /api/video-serve`），文件存在则直接显示 `<video>` 播放器

### 必知约束
1. **`Sequence` 内帧计数自动归零**：`<Sequence from={N}>` 内 `useCurrentFrame()` 从 0 开始，**绝对不能再减偏移量**，否则 localFrame 为负数，所有动画全程 clamp 到初始值（画面空白）
2. **音频文件必须在 `public/`**：`staticFile()` 只能访问 `publicDir` 下文件，TTS mp3 须放到 `video-nextjs/public/`
3. **浏览器无需手动安装**：Remotion CLI 优先使用缓存在 `node_modules/.remotion/chrome-headless-shell/` 的无头浏览器（通过 `npx remotion browser ensure` 下载，约 193MB）。Agent Prompt 设计为先检测缓存是否存在，有则直接 `npx remotion render`；缓存缺失才运行 `npx remotion browser ensure` 下载；下载失败时才通过 `--browser-executable` 回退到系统 Chrome。macOS 系统 Chrome 路径：`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
4. **Vite 配置文件禁用 `require()`**：`vite.config.ts` 是 ESM，必须用顶层 `import { createConnection } from "net"` 而不是 `require("net")`
5. **`configureServer` vs `buildStart`**：Vite 插件的 `buildStart` 只在 `vite build` 时触发，dev server 启动时须用 `configureServer` 钩子
6. **OutputNode 无 `status` 字段**：无法从 Agent 运行状态直接感知视频完成，用 `useEffect` 监听 `videoScript` 解析成功后自动 `HEAD /api/video-serve` 检测文件

## 后端
- **Agent 内核**：OpenCode（作为独立后端进程运行，ThinkFlow 通过 HTTP API 调用，默认 localhost:4096）
- **Plugin 系统**：OpenCode Plugin SDK（通过 opencode.json 配置管理，ThinkFlow UI 提供插件列表管理界面）
- **数据库**：本地 JSON 文件（记忆库）；账户/支付等后端服务预留接口但 MVP 不实现
- **文件存储**：本地文件系统 + 可选云存储

## AI 能力
- **默认模型**：MoonshotAI Kimi K2.6，model ID: `moonshotai/kimi-k2.6`，通过 OpenRouter 接入
- **图像理解**：kimi-k2 支持多模态
- **生图模型（优先级链）**：
  1. `openai/gpt-5.4-image-2`（via OpenRouter，需 VPN，画质最佳）
  2. `bytedance-seed/seedream-4.5`（via OpenRouter，字节跳动，**国内可直连**，当前默认生效）
  3. SVG 占位图（以上全部失败时的最终降级）
- **图片生成调用方式**：OpenRouter 走 `/v1/chat/completions`，图片返回在 `choices[0].message.images[0].image_url.url`（base64）
- **注意**：硅基流动已移除（内测阶段放弃），不再作为兜底选项

## 构建与发布
- **CI/CD**：GitHub Actions（`.github/workflows/thinkflow-release.yml`，触发 branch `thinkflow-mvp1`）
- **代码签名**：Apple Developer / Windows EV
- **更新机制**：Tauri Updater
- **网页版部署**：Vercel 自动监听 `thinkflow-mvp1` 分支，push 后自动构建
- **Railway 部署**：GitHub 触发自动重建 Docker 镜像（约 5–10 分钟）

## 可借鉴
借鉴Opencode的思路，实现一个通用的app, 之后网页端和桌面端都复用app的代码就好

# 用户交互流程细化
备注：精准到用户每次点击的反馈
## 首次使用流程
1. 下载安装 → 打开应用 → 欢迎页展示产品理念
2. **新手引导教程**（Spotlight 步骤引导，8步）：
   - 首次打开自动弹出（`thinkflow-tour-done` 标记控制），可随时跳过
   - 步骤依次高亮：输入节点 → Agent 节点 → 输出节点 → 运行 → 定时任务 → 矩阵模式 → 记忆库 → 完成
   - Toolbar「?」按钮可随时重启教程
3. 引导创建第一个「人设记忆」（可选跳过）
4. 进入画布 → 自动展示示例工作流

## 日常创作流程
1. **新建画布**：点击 "+" → 空白画布/从模板选择
2. **添加输入**：拖拽文件/粘贴链接/选择记忆
3. **配置 Agent**：点击 Agent 节点（统一 build 模式），填写"想法"输入框
4. **运行**：点击节点「▶ 运行」或全局「运行全部」
5. **查看输出**：点击输出节点预览 → 复制/导出
6. **保存记忆**：一键将本次输出存为记忆

## 记忆管理流程
1. 点击左侧边栏「记忆」按钮进入全屏记忆面板（Notion 风格两栏布局）
2. 左栏：分类树展开/折叠，点击分类行 `+` 新建该分类下的条目；底部「＋ 新建分类」可添加自定义分类
3. 点击条目进入右栏编辑区（TipTap 富文本编辑器）
4. 编辑器支持：输入 `/` 调出命令菜单 / 选中文字调出 Bubble Menu / 固定 Toolbar 点击格式化 / 插入表格
5. 内容自动保存（500ms debounce）
6. 导入：支持 JSON 批量导入；导出：备份到本地 JSON
7. 点击左侧边栏任意画布条目可切回画布

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
- 基础画布：输入 → Agent → 输出 单节点，多个输入和多个输出（并行执行）
- 多画布支持：创建/切换/关闭/重命名工作流，localStorage 持久化
- 5 种输入类型：文本、文件（markitdown 自动转 Markdown，支持 PDF/Word/PPT/HTML/图片）、URL、记忆、信息流（MCP）
- 5 种输出平台：知乎、公众号、日记/笔记、小红书（含图文生成）、**视频**（Agent 写 Remotion 代码自由发挥 → edge-tts TTS 配音 → CLI 渲染 1080×1920 竖版 MP4，OutputNode 内嵌 `<video>` 播放器）
- 3 种创作形式：纯文本 / 图文 / 自主
- 记忆库：全屏 Notion 风格两栏面板，5 类默认分类 + 用户自定义分类，TipTap 富文本编辑（Toolbar / Bubble Menu / Slash Menu / 表格）
- 定时任务：AgentNode 每天固定时间自动执行
- 矩阵模式：AgentNode 多 slot 绑定不同人设，串行执行
- 矩阵结果多人设查看：输出节点顶部人设选择器（下拉 + ‹/› 箭头 + n/total 计数）
- 撤销/重做、全选、快捷键运行、fitView 归位
- 本地桌面版运行
- MCP 插件列表 UI（预设 GitHub、fetch 快捷入口）
- dry-run 模式（模拟运行，不调用模型，用于调试工作流）
- **输出内容一键下载**：OutputNode / OutputModal 下载按钮（文本 .txt，图文 ZIP）；矩阵模式「下载全部人设（ZIP）」；MemoryPanel「下载作品（ZIP）」批量导出
- **运行后自动存档**：每次 Agent 运行完成后，输出内容自动写入记忆库「作品」分类（含平台标签和人设标识）
- **新手引导教程**：首次使用自动弹出 8 步 Spotlight 引导，Toolbar「?」可随时重启
- **E2E Benchmark 测试**：`e2e/benchmark/` 目录，7 场景 dry-run 验证 5 种输入类型全链路通畅
- **E2E Vercel 冒烟测试**：`e2e/vercel-smoke.spec.ts`，9 场景验证网页版核心功能（页面加载、右键菜单、主题切换、记忆面板、工作流执行）
- **网页版上线**：Vercel（静态前端）+ Railway（OpenCode 云服务），支持真实 AI 调用
- **桌面版打包**：Tauri + sidecar，用户无需安装 OpenCode，直接安装 .dmg 即可使用

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
8. 需要考虑到，用户是没有任何编程基础的小白。所以桌面版最终交付给用户的时候，用户应该是直接安装就可以，而不需要再自行安装Opencode等环境。安装包是一个完全打包好的环境。
