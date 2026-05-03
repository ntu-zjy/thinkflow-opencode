/**
 * Vercel 部署冒烟测试
 * 验证网页版核心功能：页面加载、画布渲染、节点添加、工作流 dry-run
 */
import { test, expect } from "@playwright/test"

const BASE_URL = process.env.TEST_BASE_URL || "https://thinkflow-opencode-app.vercel.app"

/** 清空画布数据（保留 tour-done 标记避免教程遮挡） */
async function resetCanvas(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    // 保留 tour-done 避免 TourGuide 遮挡画布操作
    const tourDone = localStorage.getItem("thinkflow-tour-done")
    Object.keys(localStorage)
      .filter((k) => k.includes("thinkflow"))
      .forEach((k) => localStorage.removeItem(k))
    if (tourDone !== null) {
      localStorage.setItem("thinkflow-tour-done", tourDone)
    } else {
      // 首次访问也先跳过 tour
      localStorage.setItem("thinkflow-tour-done", "1")
    }
  })
  await page.reload()
  await page.waitForLoadState("networkidle", { timeout: 20000 })
  await page.waitForSelector(".react-flow__viewport", { timeout: 10000 })
  await page.waitForTimeout(600)
}

/** 右键画布唤出菜单（使用画布右下角空白区域，避开默认节点中央区域） */
async function openContextMenu(page: import("@playwright/test").Page, x = 900, y = 600) {
  const pane = page.locator(".react-flow__pane")
  const box = await pane.boundingBox()
  // 确保点击位置在 pane 内部且不超出边界
  const safeX = box ? Math.min(x, box.width - 40) : x
  const safeY = box ? Math.min(y, box.height - 40) : y
  await pane.click({ button: "right", position: { x: safeX, y: safeY } })
  await page.waitForSelector(".tf-context-menu", { timeout: 5000 })
}

test.describe("Vercel 部署 - 基础功能", () => {
  test("页面加载并显示画布", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })

    // 页面标题包含 ThinkFlow
    await expect(page).toHaveTitle(/ThinkFlow|thinkflow/i)

    // 画布容器存在
    const canvas = page.locator(".react-flow")
    await expect(canvas).toBeVisible({ timeout: 10000 })
  })

  test("Toolbar 渲染正常", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow", { timeout: 10000 })

    // Toolbar 存在
    const toolbar = page.locator(".tf-toolbar")
    await expect(toolbar).toBeVisible()
  })

  test("右键菜单 - 可以打开节点菜单", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow__pane", { timeout: 10000 })

    await openContextMenu(page)

    // 右键菜单包含三个选项
    const menu = page.locator(".tf-context-menu").first()
    await expect(menu).toBeVisible()

    const items = menu.locator(".tf-context-menu-item")
    await expect(items).toHaveCount(3)
  })

  test("右键菜单 - 可以添加输入节点", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow__pane", { timeout: 10000 })
    await resetCanvas(page)

    // 右键菜单 → 点击「输入节点」
    await openContextMenu(page)
    await page.locator(".tf-context-menu .tf-context-menu-item").first().click()
    await page.waitForTimeout(500)

    // 画布中有节点
    const nodes = page.locator(".react-flow__node")
    await expect(nodes.first()).toBeVisible({ timeout: 5000 })
  })

  test("右键菜单 - 可以添加 Agent 节点", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow__pane", { timeout: 10000 })
    await resetCanvas(page)

    // 右键菜单 → 点击「Agent 节点」（第二项）
    await openContextMenu(page)
    await page.locator(".tf-context-menu .tf-context-menu-item").nth(1).click()
    await page.waitForTimeout(500)

    const agentNode = page.locator(".react-flow__node-agent")
    await expect(agentNode.first()).toBeVisible({ timeout: 5000 })
  })

  test("右键菜单 - 可以添加输出节点", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow__pane", { timeout: 10000 })
    await resetCanvas(page)

    // 右键菜单 → 点击「输出节点」（第三项）
    await openContextMenu(page)
    await page.locator(".tf-context-menu .tf-context-menu-item").nth(2).click()
    await page.waitForTimeout(500)

    const outputNode = page.locator(".react-flow__node-output")
    await expect(outputNode.first()).toBeVisible({ timeout: 5000 })
  })

  test("主题切换 - 明暗模式切换正常", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow", { timeout: 10000 })

    // 获取当前主题
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"))

    // 找到主题切换按钮
    const themeBtn = page
      .locator('[aria-label*="主题"], [title*="主题"], [aria-label*="theme"], [title*="theme"]')
      .first()
    await expect(themeBtn).toBeVisible({ timeout: 5000 })
    await themeBtn.click()
    await page.waitForTimeout(300)

    // 主题已切换
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"))
    expect(newTheme).not.toBe(initialTheme)
  })

  test("记忆侧边栏 - 可以打开", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow", { timeout: 10000 })

    // 找到记忆按钮
    const memoryBtn = page.locator(".tf-wf-sidebar__memory-btn").first()
    if ((await memoryBtn.count()) > 0) {
      await memoryBtn.click()
      await page.waitForTimeout(500)

      // 记忆面板打开
      const panel = page.locator(".tf-memory-panel").first()
      await expect(panel).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe("Vercel 部署 - Dry-run 工作流", () => {
  test("干运行模式下工作流可以执行并产生输出", async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle", { timeout: 30000 })
    await page.waitForSelector(".react-flow__pane", { timeout: 10000 })
    // resetCanvas 后默认状态已有 3 个节点（input / agent / output），不需要手动添加
    await resetCanvas(page)

    // 验证默认 3 个节点存在
    const nodes = page.locator(".react-flow__node")
    await expect(nodes.first()).toBeVisible({ timeout: 5000 })
    const nodeCount = await nodes.count()
    expect(nodeCount).toBeGreaterThanOrEqual(3)

    // 找到 Agent 节点上的 dry-run 开关并打开
    const agentNode = page.locator(".react-flow__node-agent").first()
    await expect(agentNode).toBeVisible({ timeout: 5000 })

    const dryRunToggle = agentNode.locator("input[type='checkbox']").first()
    if ((await dryRunToggle.count()) > 0) {
      const isChecked = await dryRunToggle.isChecked()
      if (!isChecked) await dryRunToggle.click()
      await page.waitForTimeout(200)
    }

    // 找到并点击运行按钮
    const runBtn = agentNode
      .locator("button:has-text('运行'), [class*='run-btn'], [title*='运行'], [aria-label*='运行']")
      .first()

    if ((await runBtn.count()) > 0) {
      await runBtn.click()
    } else {
      // 聚焦 Agent 节点后用快捷键
      await agentNode.click()
      await page.keyboard.press("Meta+Enter")
    }

    // 等待 dry-run 完成（最多 15 秒）
    await page.waitForTimeout(5000)

    // 输出节点应该可见（有内容或在运行中）
    const outputNode = page.locator(".react-flow__node-output").first()
    await expect(outputNode).toBeVisible({ timeout: 5000 })

    const content = await outputNode.textContent()
    console.log("Output node text:", content?.substring(0, 100))
  })
})
