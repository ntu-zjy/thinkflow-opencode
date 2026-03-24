# Provider 体系

如何接入 20+ AI 模型提供商。

---

## 理解双层结构

Provider 系统有两层：**BUNDLED_PROVIDERS** 和 **CUSTOM_LOADERS**。

**BUNDLED_PROVIDERS** 是一个静态映射，将 npm 包名映射到 AI SDK 的工厂函数。

```ts
const BUNDLED_PROVIDERS = {
  "@ai-sdk/anthropic": createAnthropic,
  "@ai-sdk/openai": createOpenAI,
  "@ai-sdk/google": createGoogle,
  // ... 20+ 个
}
```

**CUSTOM_LOADERS** 是 provider 级钩子，处理自动发现、认证和特殊配置。

```ts
const CUSTOM_LOADERS = {
  anthropic: async () => ({
    autoload: true,  // 检测到 API key 就自动启用
    options: { ... },
    getModel: (id) => { ... }
  }),
  "amazon-bedrock": async () => ({
    autoload: !!process.env.AWS_ACCESS_KEY_ID,
    options: { region: "us-east-1" }
  })
}
```

---

## 掌握加载流程

Provider 在 `Instance.state()` 初始化时加载。

```
1. 读取 models.dev 目录（JSON 数据库，包含所有 provider/model 信息）
2. 读取用户 config 的 provider 配置
3. 遍历每个 provider：
   a. 检查环境变量中的 API key
   b. 检查存储的认证信息（Auth.all()）
   c. 运行插件认证钩子
   d. 运行 CUSTOM_LOADER（如果存在）
   e. 缓存 SDK 实例
4. 应用 enabled/disabled 过滤
5. 返回完整的 provider 列表
```

---

## 看懂 Model 解析

模型标识符格式为 `provider/model`，例如 `anthropic/claude-sonnet-4-5`。

```ts
Provider.parseModel("anthropic/claude-sonnet-4-5")
// → { providerID: "anthropic", modelID: "claude-sonnet-4-5" }

const language = await Provider.getLanguage("anthropic/claude-sonnet-4-5")
// → LanguageModelV2 实例，可直接传给 ai-sdk
```

`getLanguage()` 的过程：

1. 解析 provider 和 model ID
2. 查找 provider 的 SDK 实例（从缓存或新建）
3. 调用 SDK 的 `languageModel(modelID)` 获取 `LanguageModelV2`
4. 应用 provider 级 transform（如 Anthropic 的 beta headers）

---

## 理解 Transform 层

`ProviderTransform` 处理不同 provider 的特殊需求。

```ts
// 三种 transform：
ProviderTransform.options(provider, model) // 调整 streamText 的选项
ProviderTransform.schema(provider, model) // 调整 tool schema
ProviderTransform.messages(provider, model) // 调整消息格式
```

例如 Anthropic 需要注入 cache control headers，Google Gemini 需要不同的 tool schema 格式。

---

## 理解自定义 Provider

用户可以在 config 中添加任意 OpenAI-compatible provider。

```json
{
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Ollama (local)",
      "options": {
        "baseURL": "http://localhost:11434/v1"
      },
      "models": {
        "llama2": { "name": "Llama 2" }
      }
    }
  }
}
```

自定义 provider 的 npm 包会被自动安装（通过 `BunProc.install()`）。

---

## 理解 Model Variants

某些模型支持变体（如推理强度级别）。

```ts
ProviderTransform.variants(provider, model)
// → [
//   { id: "high", name: "High effort" },
//   { id: "medium", name: "Medium effort" },
//   { id: "low", name: "Low effort" }
// ]
```

变体会影响 LLM 调用时的参数（如 OpenAI o1 的 `reasoning_effort`）。

---

## 关键文件

| 文件                        | 内容                                            |
| --------------------------- | ----------------------------------------------- |
| `src/provider/provider.ts`  | 核心加载逻辑、BUNDLED_PROVIDERS、CUSTOM_LOADERS |
| `src/provider/models.ts`    | models.dev 数据集成                             |
| `src/provider/transform.ts` | Provider 特定的 options/schema/message 转换     |
| `src/provider/auth.ts`      | 认证信息存取                                    |

---

## 动手验证

1. 在 `provider.ts` 里搜索 `BUNDLED_PROVIDERS`，看看包含哪些 provider
2. 在 `CUSTOM_LOADERS.anthropic` 里看 Anthropic 特有的 beta headers
3. 配置一个 Ollama 本地 provider，追踪它的加载过程
