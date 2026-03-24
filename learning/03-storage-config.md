# 存储与配置

JSON 文件存储和层叠配置如何工作。

---

## 理解存储模型

OpenCode 不用数据库。所有数据存为 JSON 文件，路径结构反映数据模型。

```
~/.local/share/opencode/storage/
  session/{projectID}/{sessionID}.json
  message/{sessionID}/{messageID}.json
  part/{messageID}/{partID}.json
  permission/{projectID}.json
```

---

## 读懂 Storage API

`Storage` 命名空间提供五个核心操作，参数都是路径段数组。

```ts
// 读
const session = await Storage.read<Session.Info>(["session", projectID, sessionID])

// 写
await Storage.write(["session", projectID, sessionID], sessionData)

// 读-改-写（带锁）
await Storage.update<Session.Info>(["session", projectID, sessionID], (current) => ({ ...current, title: "new title" }))

// 列举
const sessions = await Storage.list(["session", projectID])

// 删除
await Storage.remove(["session", projectID, sessionID])
```

路径段 `["session", "proj123", "sess456"]` 映射到文件 `storage/session/proj123/sess456.json`。

---

## 掌握文件锁

Storage 用读写锁防止并发冲突。采用 TC39 的 `using` 语法（显式资源管理）。

```ts
// 写锁
{
  using lock = await Lock.write(target)
  // 在这个作用域内独占写入
  await Bun.write(target, data)
}
// 作用域结束，锁自动释放

// 读锁
{
  using lock = await Lock.read(target)
  const data = await Bun.file(target).text()
}
```

---

## 理解配置层叠

配置按优先级从低到高合并：

```
1. Remote config（.well-known/opencode）    ← 组织默认值
2. Global config（~/.config/opencode/）      ← 用户偏好
3. Custom config（OPENCODE_CONFIG 环境变量）  ← 自定义覆盖
4. Project config（项目根目录 opencode.json） ← 项目特定
5. .opencode/ 目录                           ← agent、command、plugin
6. Inline config（OPENCODE_CONFIG_CONTENT）   ← 运行时覆盖
```

合并规则：**对象深合并，数组拼接**（plugin、instructions 等列表字段不会被覆盖，而是追加）。

---

## 看懂配置加载

`Config.state` 是一个 `Instance.state()`，在项目初始化时执行。

```ts
Config.state = Instance.state(async () => {
  // 1. 读 remote config
  // 2. 读 global config（~/.config/opencode/opencode.json）
  // 3. 读 OPENCODE_CONFIG 路径
  // 4. 读项目 opencode.json（向上遍历到 git root）
  // 5. 合并所有层
  // 6. 加载 .opencode/ 目录（agent、command、plugin）
  return { info: merged }
})
```

支持 JSONC（带注释的 JSON）格式。

---

## 理解变量替换

配置文件支持两种动态值：

```json
{
  "model": "{env:OPENCODE_MODEL}",
  "provider": {
    "openai": {
      "options": {
        "apiKey": "{file:~/.secrets/openai-key}"
      }
    }
  }
}
```

- `{env:VAR}` — 替换为环境变量值
- `{file:path}` — 替换为文件内容

---

## 掌握迁移系统

Storage 支持顺序迁移，类似数据库 migration。

```ts
const MIGRATIONS = [
  async () => {
    // migration 0: 重命名某个字段
  },
  async () => {
    // migration 1: 调整数据结构
  },
]
```

当前迁移索引持久化到 `storage/migration` 文件。每次启动时检查并执行未运行的迁移。

---

## 关键文件

| 文件                     | 内容                          |
| ------------------------ | ----------------------------- |
| `src/storage/storage.ts` | Storage CRUD + 锁 + 迁移      |
| `src/config/config.ts`   | 配置加载、合并、变量替换      |
| `src/config/markdown.ts` | Markdown frontmatter 配置解析 |

---

## 动手验证

1. 运行 OpenCode 一次，然后看 `~/.local/share/opencode/storage/` 目录结构
2. 在 `storage.ts` 里追踪 `read` → `Lock.read` → `Bun.file()` 的完整路径
3. 创建一个 `opencode.json` 和 `~/.config/opencode/opencode.json`，用不同的 theme 值，验证覆盖行为
