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

### 🟡 影响体验（已全部完成 ✅）




### 🟢 锦上添花

- [ ] **不同输出结构的提示词优化，目前我随便输入1111就有专门的内容，这是不合理的**

- [ ] **增加输出节点的批量输出模式，也就是一个节点可以重复输出多次**

- [ ] **输出节点的渲染还是不够好**

- [ ] **模型列表动态获取**
  AgentNode 模型下拉目前只有 `moonshotai/kimi-k2.6`。
  可调用 `GET /provider` 获取列表，或维护常用模型枚举。

- [ ] **节点标题可编辑**
  InputNode / OutputNode 的 `label` 已在数据层定义但不可编辑。
  双击标题进入编辑态，blur 时提交。

- [ ] **Ctrl+Z 撤销**
  目前仅支持 Delete 删除 / Shift 多选，缺少撤销历史栈。

- [ ] **Desktop（Tauri）验证**
  `packages/thinkflow/desktop` 结构已搭好，尚未实际构建测试。
  需放置 opencode-cli sidecar 二进制并验证 `tauri dev` 流程。
