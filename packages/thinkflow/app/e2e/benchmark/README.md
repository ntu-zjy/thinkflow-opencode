# ThinkFlow 输入类型 Benchmark

验证 ThinkFlow 5 种输入类型是否能将内容有效加入 AI 上下文，并在输出节点产生相关内容。

## 目录结构

```
e2e/benchmark/
├── README.md                  # 本文档
├── context-injection.spec.ts  # 核心验证（通过 localStorage 注入画布，适合 Agent 自动跑）
├── input-types.spec.ts        # 完整交互测试（通过 UI 操作添加节点）
└── fixtures/
    ├── sample.txt             # 文本文件测试样本
    └── sample.md              # Markdown 文件测试样本
```

## 测试覆盖的场景

| 场景 | 输入类型 | 验证要点 |
|------|---------|---------|
| 1 | 文本 | 纯文字内容加入上下文后 Agent 能生成相关输出 |
| 2 | 链接 | URL 以 `【参考链接】` 格式传入，Agent 应访问链接 |
| 3 | 文件 (TXT) | 文件读取后以 `【文件内容】` 格式注入提示词 |
| 4 | 文件 (MD) | Markdown 文件降级为原始文本，节点显示字数 |
| 5 | 记忆 | 从 memoryStore 读取条目，以 `【记忆内容】` 格式注入 |
| 6 | 信息流 (MCP) | Fetch/GitHub 工具选择后以 `【信息流】` 格式注入 |
| 7 | 多输入组合 | 文本 + 链接两个节点同时加入同一 Agent 的上下文 |

## 运行方式

### 前提条件

- 开发服务器运行中：`cd packages/thinkflow/app && bun dev`（http://localhost:1421）
- Playwright 已安装：`bunx playwright install chromium`

### 推荐：核心注入测试（无需 OpenCode，dry-run 模式）

```bash
cd packages/thinkflow/app

# 跑全部 benchmark
bunx playwright test e2e/benchmark/context-injection.spec.ts

# 跑单个场景
bunx playwright test e2e/benchmark/context-injection.spec.ts -g "文本输入"

# 带 UI（方便调试）
bunx playwright test e2e/benchmark/context-injection.spec.ts --headed
```

### 完整 UI 交互测试

```bash
bunx playwright test e2e/benchmark/input-types.spec.ts
```

### 查看测试截图

测试截图保存在：
```
packages/thinkflow/app/test-results/benchmark/
```

### 查看 HTML 报告

```bash
bunx playwright show-report
```

## 用 Agent 自动跑测试

在 ThinkFlow 画布中创建以下工作流可自动执行 benchmark：

1. **文本输入节点** — 填写：`请执行 ThinkFlow benchmark 测试并汇报结果`
2. **Agent 节点** — 想法填写：
   ```
   执行以下 shell 命令并汇报每个测试的通过/失败状态：
   cd /path/to/thinkflow-opencode/packages/thinkflow/app
   bunx playwright test e2e/benchmark/context-injection.spec.ts --reporter=json
   ```
3. **输出节点** — 日记格式，记录测试结果

## 提示词注入格式说明

`canvasStore.ts` 在 `runWorkflow` 中为每种输入类型生成不同的前缀标签：

| 输入类型 | 注入格式 |
|---------|---------|
| `text` | `【输入内容】\n{值}` |
| `url` | `【参考链接】\n{URL}\n\n请访问上述链接...` |
| `file` | `【文件内容】\n{文件文本}` |
| `memory` | `【记忆内容】\n{记忆文本}` |
| `feed` | `【信息流】\n{工具名}` |

Agent 的「想法」字段追加为 `【想法/指令】\n{想法}`。

## 期望结果

所有场景在 dry-run 模式下应满足：
- 输出节点有内容（字数 > 10）
- 截图中可见内容（不是「等待生成...」占位文本）
- 无控制台报错（`TypeError`、`Cannot read`）

dry-run 模式使用 `runMockWorkflow`（流式 mock 字符串），不调用真实 OpenCode API，因此：
- 不验证 AI 是否真的"理解"了输入内容
- 只验证输入→提示词→输出的整条管道是否通畅

**真实 API 验证**（需要 OpenCode + OpenRouter key）：将 AgentNode 的 `dryRun` 关闭后运行，检查输出中是否出现与输入相关的关键词（如文件中的 `BENCHMARK_FILE_CONTENT_MARKER_2025`）。
