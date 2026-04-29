import { useCallback } from "react"
import { v4 as uuid } from "uuid"
import { useCanvasStore } from "@/store/canvasStore"
import { useMemoryStore } from "@/store/memoryStore"
import { PLATFORM_FORMATS } from "@/types/platform"
import type { InputNodeData, AgentNodeData, OutputNodeData } from "@/types/canvas"

export function useAgentRunner() {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData)
  const setNodeStatus = useCanvasStore((s) => s.setNodeStatus)
  const getConnectedInputs = useCanvasStore((s) => s.getConnectedInputs)
  const getConnectedOutputs = useCanvasStore((s) => s.getConnectedOutputs)
  const getNode = useCanvasStore((s) => s.getNode)
  const getEntry = useMemoryStore((s) => s.getEntry)

  const run = useCallback(
    async (agentNodeId: string) => {
      const agentNode = getNode(agentNodeId)
      if (!agentNode || agentNode.type !== "agentNode") return
      const agentData = agentNode.data as AgentNodeData
      if (agentData.status === "running") return

      const inputNodes = getConnectedInputs(agentNodeId)
      const outputNodes = getConnectedOutputs(agentNodeId)

      // Set agent running
      setNodeStatus(agentNodeId, "running")
      outputNodes.forEach((n) => setNodeStatus(n.id, "running"))
      updateNodeData(agentNodeId, { messages: [] })

      // Build context from inputs
      const inputParts: string[] = []
      for (const inputNode of inputNodes) {
        const d = inputNode.data as InputNodeData
        if (d.inputType === "text" && d.value) {
          inputParts.push(`[文本输入]\n${d.value}`)
        } else if (d.inputType === "url" && d.value) {
          inputParts.push(`[网页链接] ${d.value}`)
        } else if (d.inputType === "file" && d.fileInfo) {
          inputParts.push(`[文件] ${d.fileInfo.name} (路径: ${d.fileInfo.path})`)
        } else if (d.inputType === "memory" && d.memoryRef) {
          const entry = getEntry(d.memoryRef)
          if (entry) inputParts.push(`[记忆: ${entry.title}]\n${entry.content}`)
        } else if (d.inputType === "feed" && d.feedConfig) {
          inputParts.push(`[信息流: ${d.feedConfig.source}]\n数据源: ${d.feedConfig.url}`)
        }
      }

      // Build platform-specific prompt
      const outputPlatforms = outputNodes.map((n) => {
        const d = n.data as OutputNodeData
        return PLATFORM_FORMATS[d.platform]
      })

      const platformPrompts = outputPlatforms
        .map((p) => (p.promptTemplate ? `\n\n【输出格式要求 - ${p.name}】\n${p.promptTemplate}` : ""))
        .filter(Boolean)
        .join("\n")

      const userMessage = [
        inputParts.join("\n\n"),
        agentData.idea ? `\n\n【创作指令】\n${agentData.idea}` : "",
        platformPrompts,
      ]
        .filter(Boolean)
        .join("")

      if (!userMessage.trim()) {
        setNodeStatus(agentNodeId, "error")
        outputNodes.forEach((n) => setNodeStatus(n.id, "error"))
        return
      }

      // Add user message to logs
      const userMsg = { id: uuid(), role: "user" as const, content: userMessage, time: Date.now() }
      updateNodeData(agentNodeId, { messages: [userMsg] })

      // Try OpenCode API first, fall back to mock
      let fullText = ""
      let assistantMsg = { id: uuid(), role: "assistant" as const, content: "", time: Date.now() }

      const { OpencodeClient } = await import("@/services/opencodeClient")
      const isAlive = await OpencodeClient.check()

      if (isAlive) {
        // Use real OpenCode backend
        const session = await OpencodeClient.createSession({ title: "ThinkFlow Run" }).catch(() => null)
        if (session) {
          await OpencodeClient.chat(
            session.id,
            userMessage,
            (chunk) => {
              fullText += chunk
              assistantMsg = { ...assistantMsg, content: fullText }
              updateNodeData(agentNodeId, {
                messages: [userMsg, assistantMsg],
                sessionId: session.id,
              })
            },
            () => {
              // done
            },
            (err) => {
              console.error("Agent error:", err)
            },
          )
          await OpencodeClient.deleteSession(session.id).catch(() => null)
        }
      } else {
        // Mock response for development
        fullText = await mockGenerate(userMessage, outputPlatforms[0]?.id ?? "raw")
        assistantMsg = { ...assistantMsg, content: fullText }
        updateNodeData(agentNodeId, { messages: [userMsg, assistantMsg] })
      }

      // Distribute output to output nodes
      outputNodes.forEach((n) => {
        updateNodeData(n.id, { content: fullText, status: "done" })
      })
      setNodeStatus(agentNodeId, "done")
    },
    [getNode, getConnectedInputs, getConnectedOutputs, setNodeStatus, updateNodeData, getEntry],
  )

  return { run }
}

async function mockGenerate(prompt: string, platform: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 1500))

  const mocks: Record<string, string> = {
    xiaohongshu: `✨ 今日分享 | 让创作更智能

最近发现了一个超好用的创作神器——ThinkFlow！

🌟 核心亮点：
• 记忆功能：每次创作都在学习你的风格
• 可视化画布：所有流程一目了然
• 多平台适配：一键生成多个平台内容

💡 使用体验：
第一次用就被惊艳到了，居然能记住我的口头禅和写作风格！再也不用每次都重新介绍自己了~

试了一下生成小红书文案，真的非常准确，感觉像有个了解我的AI助手在帮我写作✍️

👉 你也在为内容创作烦恼吗？快来试试吧！

#内容创作 #AI工具 #自媒体运营 #效率神器 #ThinkFlow`,

    zhihu: `# 如何用 AI 工具显著提升内容创作效率？

**核心答案：关键在于构建"有记忆"的创作系统，而非每次从零开始。**

---

## 问题的本质

大多数创作者使用 AI 工具时都面临同一困境：

1. 每次都要重新描述自己的账号定位和写作风格
2. 生成的内容缺乏一致性，破坏账号人设
3. 上下文管理复杂，信息难以复用

这本质上是 **上下文复用** 的问题。

## 解决方案

ThinkFlow 的核心设计理念是让 AI 拥有持久记忆：

- **人设记忆**：一次性定义你的写作风格、口头禅、价值观
- **素材库**：积累金句、案例、数据，随时调用
- **可视化流程**：输入 → Agent → 输出，流程清晰透明

## 实际效果

以一个科技博主为例，配置完人设记忆后：
- 生成效率提升 **3-5 倍**
- 风格一致性显著提高
- 跨平台内容迁移成本降低 60%

---

*个人实测体验，欢迎讨论。*`,

    wechat: `# 我用了这个工具，内容创作效率翻了三倍

**如果你还在每次创作都从头想，这篇文章值得你读完。**

---

三个月前，我每天要花两个小时在内容创作上。

不是因为我写得慢，而是因为每次打开 AI 工具，我都要重新告诉它："我是谁，我的账号是什么风格，我的用户是谁……"

直到我发现了 ThinkFlow。

**它解决的核心问题，是记忆。**

ThinkFlow 会记住你的写作风格、常用表达、账号人设。你只需要告诉它一次，之后每次创作，它都会带着这些记忆来理解你的需求。

用了一周之后，我的创作流程变成了这样：

1. 打开 ThinkFlow，选择本次的创作主题
2. 连接已有的人设记忆节点
3. 输入这次的核心想法
4. 点击运行，等待输出

从两小时到二十分钟。

这不是效率的提升，是创作方式的改变。

---

**你愿意分享你的创作工具吗？评论区见。**`,

    raw: `基于你的输入，以下是生成的内容：\n\n${prompt.slice(0, 200)}...\n\n[ThinkFlow 模拟输出 - 请连接 OpenCode 后端以获得真实 AI 生成内容]`,
  }

  return mocks[platform] ?? mocks.raw
}
