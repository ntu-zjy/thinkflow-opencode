import { test, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const SCREENSHOT_DIR = "/Users/zhangjingyuan/Downloads/thinkflow-opencode/packages/thinkflow/app/test-results/memory-explore"

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
})

test("explore memory page in detail", async ({ page }) => {
  // 1. 先访问首页
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-homepage.png"), fullPage: true })

  // 2. 寻找记忆 tab
  // 查找底部 tab 或导航
  const pageContent = await page.content()
  console.log("Page title:", await page.title())

  // 截图查看整体布局
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-initial-view.png"), fullPage: true })

  // 3. 查找记忆相关的按钮/tab
  // 尝试多种选择器
  const memorySelectors = [
    'text=记忆',
    '[data-tab="memory"]',
    'button:has-text("记忆")',
    'a:has-text("记忆")',
    '[aria-label*="记忆"]',
    '.memory-tab',
    '#memory-tab',
  ]

  let memoryButton = null
  for (const selector of memorySelectors) {
    const el = page.locator(selector).first()
    const count = await el.count()
    if (count > 0) {
      console.log(`Found memory button with selector: ${selector}`)
      memoryButton = el
      break
    }
  }

  if (memoryButton) {
    await memoryButton.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-memory-tab-clicked.png"), fullPage: true })
  } else {
    console.log("Memory tab not found with common selectors, trying to find all buttons...")
    const buttons = await page.locator('button').all()
    for (const btn of buttons) {
      const text = await btn.textContent()
      console.log("Button text:", text)
    }

    // 尝试找到 MemorySidebar 组件
    const allText = await page.locator('body').textContent()
    console.log("Page body text (first 500):", allText?.substring(0, 500))
  }

  // 4. 截图当前状态
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-after-memory-click.png"), fullPage: true })

  // 5. 查找 MemorySidebar 组件相关元素
  // 查找侧边栏
  const sidebar = page.locator('[class*="memory"], [class*="Memory"], [id*="memory"]').first()
  const sidebarCount = await sidebar.count()
  console.log("Sidebar found:", sidebarCount > 0)

  // 6. 检查所有可见元素
  const allElements = await page.locator('*[class]').all()
  const classNames = new Set<string>()
  for (const el of allElements.slice(0, 50)) {
    const cls = await el.getAttribute('class')
    if (cls) classNames.add(cls.split(' ')[0])
  }
  console.log("First 20 class names:", [...classNames].slice(0, 20))
})

test("explore memory sidebar layout", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")

  // 截图整体页面
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-full-page.png"), fullPage: true })

  // 查找底部 tab 栏
  const footer = page.locator('footer, [class*="footer"], [class*="bottom"], [class*="tab-bar"]').first()
  const footerCount = await footer.count()
  console.log("Footer found:", footerCount > 0)

  // 截图底部区域
  const viewportSize = page.viewportSize()
  if (viewportSize) {
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "06-bottom-area.png"),
      clip: {
        x: 0,
        y: viewportSize.height - 100,
        width: viewportSize.width,
        height: 100
      }
    })
  }

  // 查找所有按钮并记录
  const buttons = await page.locator('button').all()
  console.log(`Total buttons found: ${buttons.length}`)
  for (const btn of buttons) {
    const text = await btn.textContent()
    const ariaLabel = await btn.getAttribute('aria-label')
    const cls = await btn.getAttribute('class')
    if (text?.trim() || ariaLabel) {
      console.log(`Button: text="${text?.trim()}", aria-label="${ariaLabel}", class="${cls?.substring(0, 50)}"`)
    }
  }

  // 查找所有 tab 相关元素
  const tabs = await page.locator('[role="tab"], [class*="tab"], [class*="Tab"]').all()
  console.log(`Total tabs found: ${tabs.length}`)
  for (const tab of tabs) {
    const text = await tab.textContent()
    const cls = await tab.getAttribute('class')
    console.log(`Tab: text="${text?.trim()}", class="${cls?.substring(0, 80)}"`)
  }
})

test("navigate to memory page via URL or interaction", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")

  // 尝试直接导航到记忆页面
  const routes = ['/memory', '/memories', '/#memory', '/?tab=memory']
  for (const route of routes) {
    await page.goto(`http://localhost:1421${route}`)
    await page.waitForLoadState("networkidle")
    const url = page.url()
    const title = await page.title()
    console.log(`Route ${route}: url=${url}, title=${title}`)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `07-route-${route.replace(/[^a-z0-9]/g, '-')}.png`), fullPage: true })
  }

  // 回到首页
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")

  // 打印完整的 DOM 结构（前2000字符）
  const html = await page.content()
  console.log("HTML structure (first 3000):", html.substring(0, 3000))
})

test("find and interact with memory features", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1000)

  // 截图全页
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-loaded-page.png"), fullPage: true })

  // 查找所有可交互元素
  const clickables = await page.locator('button, a, [role="button"], [onclick]').all()
  console.log(`Total clickable elements: ${clickables.length}`)

  for (const el of clickables) {
    const text = await el.textContent()
    const ariaLabel = await el.getAttribute('aria-label')
    const title = await el.getAttribute('title')
    const cls = await el.getAttribute('class')
    const tagName = await el.evaluate(e => e.tagName)
    console.log(`${tagName}: text="${text?.trim().substring(0, 30)}", aria="${ariaLabel}", title="${title}", class="${cls?.substring(0, 60)}"`)
  }

  // 尝试点击包含"记忆"文字的元素
  const memoryElements = await page.locator(':text("记忆")').all()
  console.log(`Elements with "记忆" text: ${memoryElements.length}`)
  for (const el of memoryElements) {
    const text = await el.textContent()
    const tagName = await el.evaluate(e => e.tagName)
    const cls = await el.getAttribute('class')
    console.log(`Memory element: ${tagName}, text="${text?.trim()}", class="${cls}"`)
  }

  if (memoryElements.length > 0) {
    // 点击第一个记忆元素
    await memoryElements[0].click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-memory-clicked.png"), fullPage: true })
  }
})
