# ThinkFlow TODO

记录ToDo，包括已经完成的和未完成的，已完成的直接打勾。

优先级：🔴 阻塞 / 🟡 影响体验 / 🟢 锦上添花

---

## 已完成 ✅

- [x] InputNode / AgentNode / OutputNode 三类节点组件
- [x] canvasStore + memoryStore 状态管理（Zustand 5）
- [x] OpenCode HTTP+SSE 集成（createSession / sendPrompt / subscribeEvents）
- [x] Vite inline 插件自动启动 OpenCode 服务（port 4096）
- [x] 双主题（羊皮纸浅色 / 深夜工作室深色）纯 CSS 变量
- [x] 右键菜单添加节点，Toolbar 移除添加按钮
- [x] Logo 更新为 "ThinkFlow · 思流" 同行并排
- [x] 多输出节点扇形阶梯初始布局（知乎 / 公众号 / 日记三平台预设）
- [x] 多输出节点各自独立 AI 会话 + 平台专属指令
- [x] Vitest 测试套件 35 个用例全部通过
- [x] `OPENCODE_WORKDIR` 改为 vite define 动态注入，不再硬编码开发机路径
- [x] TypeScript 编译零错误（File.path、Canvas 右键事件、updateNodeData 类型均已修复）
- [x] 文件输入改为 FileReader 读取文本内容（显示文件名 + 字数）
- [x] 链接输入直接传 URL 给 OpenCode Agent，由 Agent 调用工具读取内容
- [x] 节点删除：三类节点 header 加 × 按钮（hover 显示，运行中 AgentNode 隐藏）
- [x] 输出卡片移除右上角 platform badge
- [x] 运行时相关连接线变为流动虚线动画，完成/失败后恢复静止
- [x] Abort 改为数组记录所有 sessionId，逐一终止
- [x] 多输出节点改为 Promise.all 并行调用，各自独立 SSE 订阅
- [x] 画布状态持久化（zustand persist，存 localStorage，跳过运行时状态）
- [x] 记忆类型输入节点已接入 memoryStore（entries 动态渲染）

---

## 待完成

### 🟡 影响体验

- [x] **添加常用的快捷键**
  ⌘Z/⌘⇧Z 撤销/重做，⌘A 全选，⌘↵ 运行选中 Agent，Space/H 归位（fitView）。

- [x] **支持生成图片格式**
  新增小红书平台，Mock 阶段返回 SVG 占位图 + 文案；SSE 层已接 `part.type === "file"` 处理真实图片；后续替换模型为 `openai/gpt-5.4-image-2`（OpenRouter）即可。

- [x] **输出节点的渲染优化**
  卡片作为预览（最大高度 200px），有内容时右上角显示放大按钮，点击弹出全屏 Modal；Modal 支持文本预览/原文切换、图片展示、复制/存为记忆/下载图片、ESC/点背景关闭。

- [x] **需要能够创建多个工作流**
  Toolbar 第二行标签页切换，支持新建、关闭、双击重命名，每个画布独立 nodes/edges/历史，localStorage 持久化。

- [x] **输入输出节点不再是从一个节点里面选类型的模式，而是改成多种输入输出卡片**
  右键菜单改为带子菜单的多级结构：输入节点展开5种类型（文本/链接/文件/记忆/信息流），输出节点展开4个平台（知乎/公众号/日记/小红书），点击直接创建预设好类型的节点。
- [x] **记忆的分类，有作品记忆，想法记忆以及账号人设记忆，还有关键信息记忆**
  记忆库侧边栏分类改为：账号人设 / 想法记忆 / 关键信息 / 作品记忆；已有旧数据在 onRehydrateStorage 中自动迁移。
- [x] **https://github.com/microsoft/markitdown.git 这是一个很好的仓库，非常适合作为画布中Agent的内嵌工具，你把这个库封装为可以被它调用的工具，这样的话，用户的多种输入都可以被转化为markdown**
  Vite 内嵌 `/api/convert-to-markdown` 端点，通过 `uvx markitdown -` 处理文件，前端上传后存 Markdown 文本。支持 PDF/Word/PPT/HTML/图片等格式；uvx 不可用时降级为 readAsText，节点显示「原始文本」徽章。

- [x] **输出节点需要支持创作形式的配置，这个配置按钮可以配置输出的形式，是文本，还是图文，还是让Agent自主决定**
    新增 `ContentFormat` 类型（`text/image_text/auto`），OutputNode 在平台选择下方添加 1×3 创作形式按钮行；canvasStore 将平台指令生成改为 `getPlatformInstruction(platform, contentFormat)` 函数，图文两步法由 `contentFormat` 驱动（不再硬编码小红书）。

- [x] **记忆使用类似Notion笔记软件的形式来管理**
  MemoryPanel 重构为左栏（240px 分类列表，可折叠分组）+ 右栏（Notion 式大标题编辑器，500ms 自动保存）；移除卡片网格和弹窗。
- [x] **可以把输入节点也加入记忆，其实就是记忆类别里的灵感**
  InputNode header 右侧（删除按钮左边）加书签图标，有内容时出现；点击存入"灵感"分类，1.5s 勾选动效。

- [x] **Agent可以设定schedule模式，也就是定时任务模式**
  AgentNode 内新增「定时运行」开关，可选 1h/6h/12h/24h 周期；开启后 header 显示「⏰ 下次 HH:MM」标签，`setInterval` 自动触发 runWorkflow（运行中自动跳过）；关闭时 clearInterval。
- [x] **Agent可以设定为多智能体模式，用于账号矩阵的运营**
  AgentNode 内新增「矩阵模式」开关，可设克隆数量（2~6）；开启后运行按钮变「矩阵运行」；自动读取记忆库「人设」分类前 N 条，串行执行每个人设的完整工作流，日志记录每个 slot 的人设名称与进度。
- [x] **矩阵运行这里，我用dry-run模式运行，并没有根据不同人设生成不同的内容，你需要保证无论是dry-run模式还是真实情况，运行矩阵模式，都要根据不同的人设产生多个不同的内容**
  dry-run 矩阵模式现在也会串行按各 slot 人设执行：`runMockWorkflow` 增加 `persona` 参数，mock 内容尾部附加"以 xxx 人设创作"差异标记；canvasStore dry-run 分支判断矩阵模式后逐 slot 传入人设文本串行执行。

- [x] **输出节点的内容，需要更便捷的被用户拿去使用，比如能直接下载压缩包，并且每次创作，会把创作的内容默认保存到记忆的作品里面，用户也可以从记忆里下载压缩包**
  每次运行完成后自动将内容存入「作品」记忆（含平台标签和人设标识）；OutputNode 操作区新增"下载"按钮（文本下载 .txt，图文下载 ZIP）；矩阵模式新增"下载全部人设（ZIP）"；OutputModal 新增"下载"按钮；MemoryPanel 顶部新增"下载作品（ZIP）"按钮可批量打包全部作品分类条目。

- [x] **对于不同的类型输入进行细致测试，看看是否真的能将不同类型的输入有效的加入上下文，你需要做一个小型benchmark（包含多个场景，多种输入）来配合playwright实机测试，做这个benchmark的时候最好能放到一个文件夹里面，配套README说明，我可以重复利用Agent来自动跑测试**
  `e2e/benchmark/` 目录：`context-injection.spec.ts`（7 场景，注入 localStorage 直接运行，dry-run 模式无需 OpenCode）；`input-types.spec.ts`（UI 交互测试）；`fixtures/sample.txt|md`；`README.md` 说明运行方式和提示词格式。

- [x] **做一下新手教程，方便用户使用**
  首次打开自动弹出 Spotlight 步骤引导（5 步，高亮目标区域 + 说明卡片）；跳过/完成后存 `thinkflow-tour-done` 不再重复弹出；Toolbar「?」按钮可随时重启教程。

- [x] **内测版上线网页版和桌面版**
  桌面版：opencode-cli sidecar 打包进 Tauri，本地构建 `ThinkFlow_0.1.0_aarch64.dmg`（38MB）；`desktop/src/main.tsx` boot 函数加入轮询重试（最多 30s）；修复 `frontendDist` 路径。网页版：Vercel API Routes（`api/openrouter/`、`api/siliconflow/`）代理注入 API Key；`vercel.json` SPA 路由重写；GitHub Actions `thinkflow-release.yml` 自动化测试 + Vercel 部署 + macOS dmg 构建。
  **上线前需配置 GitHub Secrets**：`VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`、`OPENROUTER_API_KEY`

- [x] 日记和笔记分成两个类型，日记是口语化的，笔记是更正式一些的记录，内容要更全面
  日记（口语流水账）和笔记（正式结构化）拆分为独立平台；各自有独立的 AI 提示词；InputNode 平台选择器改为 3+2 布局。
- [x] 记忆的内容并没按照markdown格式渲染好
  新增 `markdownToHtml` 工具函数；存入「作品」记忆时自动将 AI 输出的 markdown 转换为 TipTap 可渲染的 HTML；12 个单元测试覆盖全语法。
- [x] Agent的时间没有更新，今年是2026年，但是没有指明时间的时候，输出还会说2024年的事情
  构建 baseParts 时自动注入当前日期（如"2026年5月4日 星期一"），作为上下文第一条传给 Agent。

- [x] 增加简易的视频生成格式，实现思路如下：
  用户输入一段文稿后，系统先把文稿交给大模型做结构化拆解，生成一个稳定的中间 JSON。这个 JSON 是视频结构的核心。接着后端逐页处理 `slides`：每页拿 `voiceover` 调 TTS，生成 mp3；再读取 mp3 时长；页面视频时长设置为”音频时长 + 0.3 秒”。最后用 Remotion 把每页渲染成竖版 1080x1920 视频画面底部展示字幕，也就是 `voiceover`的语音字母。每一页配上对应 mp3，按顺序拼接，导出一个 MP4。
  Remotion 4.0.456 渲染竖版 1080×1920 React 组件（渐变背景+淡入字幕动效）；edge-tts 生成中文 TTS 音频；ffprobe 读取时长；Vite 内嵌 `/api/generate-video` SSE 端点（进度推送）+ `/api/video-file/:id` 下载端点；OutputNode 新增”视频”平台、分镜卡片预览、进度条和下载 MP4 按钮。`packages/thinkflow/video-renderer/` 为独立 Remotion 子项目。

- [x] 可以在新手教程那里，加一个让用户跳转到示例的选项。示例这里，可以放一些提前跑出来的，保存好的场景使用示例，来更直观的告诉用户产品怎么用。
  TourGuide 最后一步新增「查看示例」按钮，点击弹出全屏弹窗展示 4 个典型使用场景卡片（公众号运营/矩阵运营/定时日报/视频生成），含图标、说明文字和工作流流程标注。
- [x] 输出卡片需要从UI上能够区分平台和内容格式，目前这两部分的内容是都在一个卡片上面。
  OutputNode header 右侧新增平台 badge（知乎/公众号/日记/笔记/小红书/视频，各有独立颜色）+ 内容格式小标签（纯文本/图文/自主），一眼看清当前配置。
- [x] 目前的生成视频的模板过于简单，导致生成的视频都是一个简单的背景+标题+字幕这样两行字体，应该给予Agent更多的自由度，渲染出来更加复杂的视频。
  视频渲染服务迁移至 `packages/thinkflow/video-nextjs/`（Remotion 子项目）；Agent 可自由设计任意视觉风格（多布局、渐变背景、霓虹效果等）；Remotion Skill 提供最佳实践知识；Agent 完成渲染后 OutputNode 自动检测并展示 `<video>` 播放器；视频含 edge-tts 中文配音。

- [x] 视频生成架构重构：从预设模板 → Agent 自由写代码+CLI 渲染
  OpenCode Agent 直接修改 `video-nextjs/src/remotion/VideoComposition.tsx`，调用 `npx remotion render` CLI 渲染；Vite 改为 `videoServePlugin` 只做静态文件服务；OutputNode 通过 `useEffect` 自动检测 `/api/video-serve` 文件，Agent 完成后无需手动点击即可播放视频；视频 Prompt 新增 edge-tts TTS 配音步骤（`zh-CN-XiaoxiaoNeural`）+ ffprobe 时长计算。
- [x] 安装 Remotion Agent Skill，让 Agent 能用最佳实践写 Remotion 代码
  安装命令：`git clone --depth 1 https://github.com/remotion-dev/skills.git /tmp/remotion-skills && cp -r /tmp/remotion-skills/skills/remotion ~/.config/opencode/skills/`；Skill 为 Agent 提供 Remotion 最佳实践（包括 `<Sequence>` 局部帧归零、`staticFile()` 约束等），绕过了 Chromium 下载问题。
- [x] 切换画布后，正在跑的画布的进程就停止了
  `switchWorkflow` 移除了 `abortWorkflow` 调用；`runWorkflow` 在启动时捕获 `runWorkflowId`，新增工作流感知的 `updateWorkflowNodeData`（同时更新 `workflows[runWorkflowId].nodes` 和当前活跃 `nodes`），切换画布后后台 session 继续运行并写入对应工作流的节点，切回时即可看到完整结果。
- [x] 我没有chromium，不想依赖这个组件
  Remotion 自带 `chrome-headless-shell`（约 193MB，缓存在 `video-nextjs/node_modules/.remotion/`），不需要用户安装 Chrome。Agent 视频提示词已更新为智能浏览器检测逻辑：优先用已缓存的 `chrome-headless-shell`（`npx remotion render` 自动使用），其次运行 `npx remotion browser ensure` 自动下载，最后才回退到系统 Chrome。
- [x] 卡片上的滑动条拖动非常不方便，太小了点不到，而且也没有办法和macos的快捷键联动
  滚动条宽度从 4px 加宽至 8px，`min-height: 40px` 确保拇指可点击；新增画布键盘平移：↑↓←→ 移动 60px，Shift+方向键 200px，PageUp/Down 300px。
- [x] 输入卡片上面的收藏按钮改成”加入灵感”
  InputNode 收藏按钮 title 属性改为”加入灵感”，保存目标不变（”灵感”分类）。
- [x] 模型这里默认使用 Claude Sonnet 4.6，不再让用户能够选模型，也不让用户看到用的啥模型
  AgentNode 移除模型选择下拉框；`canvasStore` 默认模型为 `anthropic/claude-sonnet-4.6`，用户不可见也不可更改。
- [x] **输出卡片的重构，不再是在一个输出卡片上选类型，而是本身就有多种卡片，用户可以选择，并且定制自己场景下的卡片样式。**
  注册式架构：`src/cards/` 目录下每个平台一个文件，统一注册到 `CARD_REGISTRY`；右键菜单"输出节点"→子菜单直接选平台；OutputNode 平台化 header（图标+名称+平台主色边框/背景）；小红书卡片预览红白配色+提取#标签；知乎衬线字体；折叠式"提示词设置"区域，用户可修改提示词并一键恢复默认。

- [x] **输入卡片的重构，不再是在一个输出卡片上选类型，而是本身就有多种卡片，让用户可以选择。（部分借鉴上一个Todo）**
  logo采用输入类型的大众常识logo。
  - 创建 `src/input-cards/` 注册式架构
  - 5种输入类型：文本(蓝色)/链接(绿色)/文件(紫色)/记忆(琥珀色)/信息流(粉色)
  - 每种类型有独立的颜色、Logo和平台化样式
  - 右键菜单输入节点改为带子菜单的多级结构
- [x] **”信息流”这个输入节点的重构，信息流不是一个静态的网址，也不是静态的某个文件或文字，而是一个能够将信息从特定信息源头提取出来的特定流程。**
  写的比较抽象，偏向效果层面，你需要用最优方式实现该效果。
  - 创建 `src/services/feedService.ts` 信息流服务
  - 支持3种源类型：RSS / GitHub / API
  - 配置化界面：URL、关键词过滤、刷新频率(5分钟-1天)
  - 自动刷新机制：根据配置定时拉取新内容
  - 内容聚合预览：格式化展示多条信息条目
  - 手动获取按钮 + 加载状态显示

- [x] 新手教程里的示例，目前的不是很直观，最好是能直接做出来具体的画布。用户可以复制查看每个案例的对应画布。
  TourGuide 示例弹窗每个场景卡片新增「创建此画布」按钮，点击后调用 `loadExampleWorkflow` 创建预填充 nodes/edges 的新画布并自动切换。
- [x] 新手教程里面的第一步，应该先用直接明了的语言，告诉用户这个产品和传统的聊天AI软件的不同之处，适配什么场景
  TOUR_STEPS[0] 改为「ThinkFlow 是什么？」，直接对比传统 AI 聊天 vs 工作流画布的区别，并列举适合场景。
- [x] 制作landing页，让产品看起来正规并且非常好用，具有很好的宣传效果
  新增 `src/pages/Landing.tsx`；App.tsx 路由判断：`/` 显示 Landing，`/app` 进入主应用；Landing 包含 Navbar、Hero（带画布预览）、核心差异对比、功能特性、使用场景、CTA、Footer（含免责声明）。
- [x] 安全和免责声明
  Landing 页 Footer 底部独立「安全说明与免责声明」区块，涵盖 AI 内容说明、数据本地存储、API 密钥安全、内容责任、适用法律五条。
- [x] 我觉得目前的每个创作平台的提示词还是有挺大的问题，就是都太简化了。举例来说，小红书图文这个场景，我之前写过一个open code的插件，在/Users/zhangjingyuan/Downloads/thinkflow/thinkflow-plugin，你可以参考这个的提示词，不是说一定要多个agent，只是你需要把每个场景的提示词都细化到这个程度。所有的场景都需要细化。
  参考 thinkflow-plugin/subagents/writer.md 标准，重写所有平台提示词：小红书（标题三方案+口语化正文规范+标签配比+多图格式）、公众号（结构化文章+排版规范+图文封面格式）、知乎（论点驱动+辩证结构+洞察力规范）、日记（第一人称口语+情绪细节+碎片化）、笔记（摘要+分节+关键结论结构）。
- [x] 目前图文模式只支持单图，图文模式一般是3-5张图甚至更多。
  canvasStore 图文两步法扩展为多图串行生成：匹配 [IMG_PROMPT_COVER:] + [IMG_PROMPT_1:] 到 [IMG_PROMPT_5:] 全部标记，逐张调用 generateImage 并即时更新节点；XhsPreview 多图改为 3 列网格（封面标签）；OutputNode 下载逻辑改为多图 ZIP（text + 每张图单独文件）。
- [x] 生图模型替换为openai/gpt-5.4-image-2（对应链接为https://openrouter.ai/openai/gpt-5.4-image-2），Agent模型替换为claude sonnet 4.6 medium推理强度模型为anthropic/claude-sonnet-4.6（对应链接https://openrouter.ai/anthropic/claude-sonnet-4.6）
- [x] **将当前的部署全部切换sealos**（分支：`feat/sealos-deploy-auth`，详见 `docs/sealos-deploy.md`）
  - [x] 前端 Dockerfile（bun build + Nginx，含 OpenRouter proxy）：`packages/thinkflow/app/Dockerfile`
  - [x] OpenCode Dockerfile 更新（补 video stub，加 entrypoint 写 auth.json）：`Dockerfile.opencode`
  - [x] GitHub Actions 自动构建推送 Docker Hub：`.github/workflows/thinkflow-release.yml`
  - [x] 配置 GitHub Secrets（DOCKERHUB_USERNAME / DOCKERHUB_TOKEN / VITE_OPENCODE_SERVER_URL）
  - [x] Sealos 新加坡节点部署两个 App：thinkflow-opencode（4096）+ thinkflow-frontend（80）
  - [x] 端到端验证通过，OpenCode 健康检查 `{"healthy":true}`，前端 HTTP 200
  - OpenCode 公网地址：`https://eqctmtdymqbx.cloud.sealos.io`
  - 前端公网地址：`https://bawzdlyeewhf.cloud.sealos.io`
- [ ] 接入用户注册，支付，加上服务器数据缓存机制。
- [ ] 画图问题

### 🟢 锦上添花
- [ ] **Desktop（Tauri）验证**（已在本地验证 arm64，CI 构建待跑）
  本地已成功构建 ThinkFlow.app + dmg；CI 构建需在 GitHub Actions 上运行一次验证。

- [ ] 中国用户无法访问vercel部署的链接，可按照解决方案解决


- [ ] **参考之前写好的thinkflow插件，对不同的输出卡片的提示词进行精心调整，目前每个内容平台对应的提示词还是过于简单了**

- [ ] 支持文件夹输入，网页端不支持输入文件夹，桌面端输入文件夹，代表着一个文件夹的地址，输入给Agent
- [ ] **让记忆机制和画布能够更加无缝的衔接，记忆需要更便捷的被用户添加，能够用Agent的方式，和用户沟通去完善记忆**
  画布的Agent节点可以添加一个配置按钮，叫做“自动记忆”。开启后，Agent会自动连接一个记忆输出节点。Agent能够自动整理用户本次运行产生的记忆，显示在记忆节点里面，用户可以自主选择是否将这些记忆添加到记忆中。同时也支持用户直接创建记忆节点，或者是单独将输出的作品也添加到记忆中。

- [ ] **增加输出节点的批量输出模式，也就是一个节点可以重复输出多次（抽卡）**

