// 信息流服务 - 从各种源头抓取内容

export interface FeedConfig {
  url: string
  type: "rss" | "api" | "webhook" | "github"
  refreshInterval: string  // "5min" | "15min" | "1hour" | "6hours" | "1day"
  filters?: {
    keywords?: string[]      // 关键词过滤
    exclude?: string[]       // 排除词
    maxItems?: number        // 最大条目数
  }
}

export interface FeedItem {
  id: string
  title: string
  content: string
  url?: string
  author?: string
  publishedAt: string
  source: string
}

export interface FeedResult {
  items: FeedItem[]
  lastUpdated: string
  nextUpdate: string
  source: string
}

// 模拟 RSS 抓取
async function fetchRSS(url: string, filters?: FeedConfig["filters"]): Promise<FeedItem[]> {
  // 实际实现应该调用后端 API 或 MCP fetch 工具
  // 这里提供模拟数据展示效果
  const mockItems: FeedItem[] = [
    {
      id: "1",
      title: "AI 技术周报：GPT-5 发布新功能",
      content: "OpenAI 本周发布了 GPT-5 的多个新功能，包括更强大的代码生成能力和多模态理解...",
      url: "https://example.com/ai-news-1",
      author: "TechDaily",
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      source: url,
    },
    {
      id: "2",
      title: "前端框架对比：React vs Vue 2026",
      content: "随着 Vue 4.0 和 React 20 的发布，两大框架的竞争进入新阶段...",
      url: "https://example.com/frontend-compare",
      author: "FrontendWeekly",
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      source: url,
    },
  ]

  // 应用关键词过滤
  if (filters?.keywords?.length) {
    return mockItems.filter(item =>
      filters.keywords!.some(kw =>
        item.title.includes(kw) || item.content.includes(kw)
      )
    )
  }

  return mockItems.slice(0, filters?.maxItems || 10)
}

// 模拟 GitHub Trending 抓取
async function fetchGitHubTrending(filters?: FeedConfig["filters"]): Promise<FeedItem[]> {
  const mockItems: FeedItem[] = [
    {
      id: "gh-1",
      title: "microsoft/markitdown - 12.5k ⭐",
      content: "Python 工具，用于将各种文件格式转换为 Markdown...",
      url: "https://github.com/microsoft/markitdown",
      author: "microsoft",
      publishedAt: new Date().toISOString(),
      source: "github-trending",
    },
    {
      id: "gh-2",
      title: "anthropics/claude-code - 8.3k ⭐",
      content: "Claude 官方 CLI 工具，AI 辅助编程...",
      url: "https://github.com/anthropics/claude-code",
      author: "anthropics",
      publishedAt: new Date().toISOString(),
      source: "github-trending",
    },
  ]

  return mockItems.slice(0, filters?.maxItems || 10)
}

// 计算下次更新时间
function getNextUpdateTime(interval: string): string {
  const now = new Date()
  const intervals: Record<string, number> = {
    "5min": 5 * 60 * 1000,
    "15min": 15 * 60 * 1000,
    "1hour": 60 * 60 * 1000,
    "6hours": 6 * 60 * 60 * 1000,
    "1day": 24 * 60 * 60 * 1000,
  }
  const ms = intervals[interval] || intervals["1hour"]
  return new Date(now.getTime() + ms).toISOString()
}

// 主抓取函数
export async function fetchFeed(config: FeedConfig): Promise<FeedResult> {
  let items: FeedItem[] = []

  try {
    switch (config.type) {
      case "rss":
        items = await fetchRSS(config.url, config.filters)
        break
      case "github":
        items = await fetchGitHubTrending(config.filters)
        break
      case "api":
        // API 调用需要后端支持
        items = await fetchRSS(config.url, config.filters)
        break
      default:
        items = await fetchRSS(config.url, config.filters)
    }
  } catch (error) {
    console.error("Feed fetch error:", error)
    items = [{
      id: "error",
      title: "获取失败",
      content: `无法从 ${config.url} 获取内容，请检查 URL 或稍后重试。`,
      publishedAt: new Date().toISOString(),
      source: config.url,
    }]
  }

  return {
    items,
    lastUpdated: new Date().toISOString(),
    nextUpdate: getNextUpdateTime(config.refreshInterval),
    source: config.url,
  }
}

// 格式化信息流内容为文本
export function formatFeedContent(result: FeedResult): string {
  const lines = [
    `【信息流】${result.source}`,
    `更新时间: ${new Date(result.lastUpdated).toLocaleString("zh-CN")}`,
    `下次更新: ${new Date(result.nextUpdate).toLocaleString("zh-CN")}`,
    "",
    "=" .repeat(40),
    "",
  ]

  result.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.title}`)
    if (item.author) {
      lines.push(`   作者: ${item.author}`)
    }
    lines.push(`   时间: ${new Date(item.publishedAt).toLocaleString("zh-CN")}`)
    lines.push("")
    lines.push(item.content)
    if (item.url) {
      lines.push(`   链接: ${item.url}`)
    }
    lines.push("")
    lines.push("-".repeat(40))
    lines.push("")
  })

  return lines.join("\n")
}

// 刷新间隔转换为毫秒
export function intervalToMs(interval: string): number {
  const map: Record<string, number> = {
    "5min": 5 * 60 * 1000,
    "15min": 15 * 60 * 1000,
    "1hour": 60 * 60 * 1000,
    "6hours": 6 * 60 * 60 * 1000,
    "1day": 24 * 60 * 60 * 1000,
  }
  return map[interval] || map["1hour"]
}
