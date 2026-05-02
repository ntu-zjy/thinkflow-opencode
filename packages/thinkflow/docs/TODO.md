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

### 🟢 锦上添花


- [ ] **参考之前写好的thinkflow插件，进行精心调整**
- [ ] **输出节点的内容，需要更便捷的被用户拿去使用，最好是能直接变成可以下载的压缩包**


- [ ] **记忆需要更便捷的添加，能够用Agent的方式，和用户沟通去完善记忆**
  画布的Agent节点可以添加一个配置按钮，叫做“自动记忆”。开启后，Agent会自动连接一个记忆输出节点。Agent能够自动整理用户本次运行产生的记忆，显示在记忆节点里面，用户可以自主选择是否将这些记忆添加到记忆中。同时也支持用户直接创建记忆节点，或者是单独将输出的作品也添加到记忆中。

- [ ] **增加输出节点的批量输出模式，也就是一个节点可以重复输出多次**
- [ ] **不同输出结构的提示词优化，目前我随便输入1111就有专门的内容，这是不合理的**


- [ ] **节点标题可编辑**
  InputNode / OutputNode 的 `label` 已在数据层定义但不可编辑。
  双击标题进入编辑态，blur 时提交。

- [ ] **Desktop（Tauri）验证**
  `packages/thinkflow/desktop` 结构已搭好，尚未实际构建测试。
  需放置 opencode-cli sidecar 二进制并验证 `tauri dev` 流程。
