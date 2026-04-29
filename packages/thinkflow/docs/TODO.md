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

---

## 待完成

### 🔴 必须修复

- [ ] **`OPENCODE_WORKDIR` 硬编码绝对路径**
  `app/src/services/opencodeClient.ts:17` 当前写死为开发机路径，换机器即失效。
  应通过 `vite.config.ts` 计算路径后注入 `import.meta.env.VITE_OPENCODE_WORKDIR`。

- [ ] **三处 TypeScript 编译错误**
  - `InputNode.tsx:36` — `File.path` 不存在，改用 `file.name`
  - `Canvas.tsx:63` — 右键事件回调参数类型不兼容
  - `canvasStore.ts:153` — `updateNodeData` set() 返回值类型推断错误

- [ ] **输入类型为文件时，其实输入的是文件地址**

- [ ] **输入的是链接的时候，无法获取链接信息，需要查一下问题在哪里并修复**

### 🟡 影响体验

- [ ] **多输出节点改为并行调用**
  当前三个输出节点串行，约 3× 单次耗时。改为 `Promise.all` 并行，各自独立 SSE 订阅。

- [ ] **Abort 仅终止最后一个 session**
  `abortWorkflow` 只记录了最后一次 sessionId。多 session 时需用数组逐一 abort。

- [ ] **画布状态持久化**
  刷新后节点重置为初始示例。用 `zustand/middleware persist` 存 localStorage，
  或提供"导出 / 导入画布 JSON"功能。

- [ ] **记忆类型输入节点接入 memoryStore**
  InputNode 记忆标签的下拉选项目前是静态 mock，应读取 `memoryStore.entries` 动态渲染。

- [ ] **不同输出结构的提示词优化，目前我随便输入1111就有专门的内容，这是不合理的**

### 🟢 锦上添花

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
