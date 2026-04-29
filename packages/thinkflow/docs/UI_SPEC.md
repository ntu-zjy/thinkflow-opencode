# ThinkFlow UI 设计规范

> 本文件记录 ThinkFlow 画布应用的视觉与交互规范，由开发过程中迭代形成。
> 产品需求见 BEGIN.md，视觉设计系统见 DESIGN.md。

---

## 1. 设计原则

- **羊皮纸浅色 / 深夜工作室深色** 双主题，通过 `data-theme` attribute 切换，持久化到 `localStorage("thinkflow-theme")`，默认浅色
- **无 Tailwind**，纯 CSS 变量
- 字体三档：`Syne`（标题/Logo）、`Outfit`（正文 UI）、`DM Mono`（代码/日志）

---

## 2. 颜色系统

### 浅色主题（Lovable 羊皮纸）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-canvas` | `#f7f4ed` | 画布底色 |
| `--bg-node` | `#ffffff` | 节点背景 |
| `--bg-toolbar` | `rgba(255,255,255,0.95)` | 顶栏毛玻璃 |
| `--border` | `#d4d0c8` | 节点边框 1.5px |
| `--accent` | `#1c1c1c` | 主操作色 |
| `--text-primary` | `#1c1c1c` | 主文字 |
| `--text-muted` | `#8a8a87` | 辅助文字 |

### 深色主题（深夜工作室）

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg-canvas` | `#0b0f1a` | 画布底色 |
| `--bg-node` | `#111827` | 节点背景 |
| `--bg-toolbar` | `rgba(11,15,26,0.92)` | 顶栏毛玻璃 |
| `--border` | `#1e293b` | 节点边框 |
| `--accent` | `#f59e0b` | 琥珀强调色 |
| `--text-primary` | `#f1f5f9` | 主文字 |
| `--text-muted` | `#4b5563` | 辅助文字 |

### 状态色（两主题共用）

| 状态 | 颜色 | 动效 |
|------|------|------|
| idle | `#9ca3af` 灰 | 无 |
| running | `#f59e0b` 琥珀 | 1.2s 脉冲发光循环 |
| done | `#10b981` 绿 | 无 |
| error | `#ef4444` 红 | 无 |

---

## 3. Toolbar

### Logo 排版
- 文字：`ThinkFlow · 思流`，同行并排
- `ThinkFlow` 使用 Syne 800，18px，`letter-spacing: -0.03em`
- ` · 思流` 同字号，字重 400，颜色稍浅：
  - 浅色主题：`#b47828`（暖棕）
  - 深色主题：`rgba(245,158,11,0.6)`（半透明琥珀）

### 按钮区（从左到右）
1. Logo 区（ThinkFlow · 思流）
2. 分割线（1px `--border`）
3. Spacer（flex: 1）
4. 运行全部 / 停止全部
5. 记忆库（ghost，激活时变 primary）
6. 主题切换（icon-only，ghost）

**已移除**：原有 `+ 输入 / + Agent / + 输出` 三个添加节点按钮，改为仅右键菜单。

### 主题切换
- 浅色模式显示月亮图标，点击切换深色
- 深色模式显示太阳图标，点击切换浅色
- 悬停时图标旋转 20° + 放大 1.15x

---

## 4. 添加节点

**仅通过右键菜单**：在画布空白处右键，弹出：
1. 添加输入节点
2. 添加 Agent 节点
3. 添加输出节点

---

## 5. 节点规格

### 通用

| 属性 | 值 |
|------|-----|
| 最小宽度 | 280px |
| 最大宽度 | 360px |
| 圆角 | `--radius-lg: 12px` |
| 边框 | 1.5px solid `--border` |
| 位置 | `position: relative`（Handle 定位依赖） |

### InputNode
- 标签栏 5 项：文本 / 链接 / 文件 / 记忆 / 信息流
- Handle source 右侧（`Position.Right`）

### AgentNode
- 想法 Textarea + 模型选择下拉
- 状态指示灯（左侧圆点）
- 运行 / 停止按钮（全宽）
- Dry-run 复选框
- 日志折叠（max-height 160px，DM Mono 11px）
- Handle target 左 + source 右

### OutputNode
- 平台切换按钮组（知乎 / 公众号 / 日记/笔记）
  - **选中态统一用 `tf-btn-primary`**，不因内容是否为空产生差异
- 内容区 max-height 200px，react-markdown 渲染
- 预览 / 原文切换
- 复制 + 存为记忆
- Handle target 左侧（`Position.Left`）

---

## 6. 初始布局与多节点排布

### 初始示例节点位置（扇形）

| 节点 | x | y |
|------|---|---|
| InputNode | 80 | 200 |
| AgentNode | 420 | 200 |
| OutputNode（知乎） | 760 | 80 |
| OutputNode（公众号） | 760 | 280 |
| OutputNode（日记/笔记） | 760 | 480 |

三个输出节点连接同一 AgentNode，呈阶梯/扇形排布。

---

## 7. 多输出节点分发策略

每个连接到同一 AgentNode 的 OutputNode **分别发起独立的 AI 会话**，根据平台生成专属内容：

- **知乎**：`请生成适合知乎平台的长文章，有标题、引言和正文结构。`
- **公众号**：`请生成适合微信公众号的图文推送，标题吸引人，排版适合移动端阅读。`
- **日记/笔记**：`请以个人口吻生成日记或笔记风格的内容，流水记录，自然真实。`

实现：`runWorkflow` 对每个 outputNode 串行调用独立的 `createSession` + `sendPrompt`，prompt 末尾追加平台专属指令。

---

## 8. 画布交互

### 节点容器
- 根元素 `tf-node` 必须 `position: relative`（Handle 定位依赖）
- `.react-flow__node` 设置 `background: transparent` 清除白框

### 快捷键提示气泡
- 位置：`Panel position="bottom-right"`（避开左下角 Controls）
- 平时显示 22px 圆形 `?` 图标
- 悬停展开：`右键添加节点 · Del 删除 · Shift 多选 · 滚轮缩放`

### 边
- 颜色：`--border-hover`，stroke-width 2
- 运行中（animated）：`--accent` + dasharray 动画

---

## 9. 平台徽章颜色

| 平台 | 浅色主色 | 深色主色 |
|------|---------|---------|
| 知乎 | `#0070d2` | `#60a5fa` |
| 公众号 | `#07c160` | `#34d399` |
| 日记/笔记 | `#b47828` | `#f59e0b` |
