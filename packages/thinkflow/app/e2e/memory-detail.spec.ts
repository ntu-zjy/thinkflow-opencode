import { test, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const DIR = "/Users/zhangjingyuan/Downloads/thinkflow-opencode/packages/thinkflow/app/test-results/memory-explore"

test.beforeAll(() => {
  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true })
  }
})

test("memory panel full exploration", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 截图1: 初始状态（记忆面板关闭）
  await page.screenshot({ path: path.join(DIR, "10-initial-state.png"), fullPage: true })

  // 找到记忆按钮并点击
  const memoryBtn = page.locator('.tf-wf-sidebar__memory-btn')
  await expect(memoryBtn).toBeVisible()
  console.log("Memory button found:", await memoryBtn.textContent())

  // 截图记忆按钮区域
  const sidebar = page.locator('.tf-wf-sidebar')
  if (await sidebar.count() > 0) {
    await sidebar.screenshot({ path: path.join(DIR, "11-sidebar-before-memory.png") })
  }

  await memoryBtn.click()
  await page.waitForTimeout(500)

  // 截图2: 记忆面板打开后
  await page.screenshot({ path: path.join(DIR, "12-memory-panel-open.png"), fullPage: true })

  // 检查记忆面板
  const memoryPanel = page.locator('.tf-memory-panel')
  if (await memoryPanel.count() > 0) {
    await memoryPanel.screenshot({ path: path.join(DIR, "13-memory-panel-close-up.png") })
    console.log("Memory panel found!")

    // 获取面板的尺寸和位置
    const box = await memoryPanel.boundingBox()
    console.log("Memory panel bounding box:", JSON.stringify(box))

    // 获取面板内所有元素
    const panelHTML = await memoryPanel.innerHTML()
    console.log("Memory panel HTML (first 2000):", panelHTML.substring(0, 2000))
  }

  // 截图3: 记忆面板详细视图（放大）
  const panel = page.locator('.tf-memory-panel')
  if (await panel.count() > 0) {
    const box = await panel.boundingBox()
    if (box) {
      await page.screenshot({
        path: path.join(DIR, "14-memory-panel-region.png"),
        clip: { x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 }
      })
    }
  }
})

test("memory panel - categories exploration", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(500)

  // 截图完整面板
  await page.screenshot({ path: path.join(DIR, "15-memory-categories.png"), fullPage: true })

  // 查找分类列表
  const categorySelectors = [
    '.tf-memory-panel__categories',
    '.tf-memory-panel__sidebar',
    '[class*="categor"]',
    '[class*="category"]',
  ]

  for (const sel of categorySelectors) {
    const el = page.locator(sel)
    const count = await el.count()
    if (count > 0) {
      console.log(`Category container found: ${sel}`)
      const html = await el.first().innerHTML()
      console.log(`Category HTML: ${html.substring(0, 500)}`)
    }
  }

  // 查找所有分类项
  const categoryItems = await page.locator('.tf-memory-panel__cat-item, [class*="cat-item"], [class*="category-item"]').all()
  console.log(`Category items found: ${categoryItems.length}`)
  for (const item of categoryItems) {
    const text = await item.textContent()
    console.log(`Category: "${text?.trim()}"`)
  }

  // 打印记忆面板内所有元素的 class
  const allPanelElements = await page.locator('.tf-memory-panel *').all()
  const classes = new Set<string>()
  for (const el of allPanelElements.slice(0, 100)) {
    const cls = await el.getAttribute('class')
    if (cls) {
      cls.split(' ').forEach(c => {
        if (c.startsWith('tf-')) classes.add(c)
      })
    }
  }
  console.log("All tf- classes in memory panel:", [...classes].sort().join(', '))
})

test("memory panel - detailed interaction", async ({ page }) => {
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 截图记忆面板
  await page.screenshot({ path: path.join(DIR, "16-memory-panel-full.png"), fullPage: true })

  // 获取面板完整 HTML
  const panel = page.locator('.tf-memory-panel')
  if (await panel.count() > 0) {
    const fullHTML = await panel.innerHTML()
    console.log("FULL PANEL HTML:", fullHTML)
  }

  // 查找所有按钮
  const panelButtons = await page.locator('.tf-memory-panel button').all()
  console.log(`Buttons in memory panel: ${panelButtons.length}`)
  for (const btn of panelButtons) {
    const text = await btn.textContent()
    const ariaLabel = await btn.getAttribute('aria-label')
    const title = await btn.getAttribute('title')
    const cls = await btn.getAttribute('class')
    console.log(`Panel button: text="${text?.trim()}", aria="${ariaLabel}", title="${title}", class="${cls}"`)
  }

  // 查找搜索框
  const searchInput = page.locator('.tf-memory-panel input[type="search"], .tf-memory-panel input[placeholder*="搜索"], .tf-memory-panel input[placeholder*="search"]')
  const searchCount = await searchInput.count()
  console.log(`Search inputs found: ${searchCount}`)
  if (searchCount > 0) {
    const placeholder = await searchInput.first().getAttribute('placeholder')
    console.log(`Search placeholder: "${placeholder}"`)
  }

  // 查找所有 input 元素
  const allInputs = await page.locator('.tf-memory-panel input').all()
  for (const input of allInputs) {
    const type = await input.getAttribute('type')
    const placeholder = await input.getAttribute('placeholder')
    const cls = await input.getAttribute('class')
    console.log(`Input: type="${type}", placeholder="${placeholder}", class="${cls}"`)
  }

  // 查找 textarea
  const textareas = await page.locator('.tf-memory-panel textarea').all()
  console.log(`Textareas in panel: ${textareas.length}`)
  for (const ta of textareas) {
    const placeholder = await ta.getAttribute('placeholder')
    const cls = await ta.getAttribute('class')
    const box = await ta.boundingBox()
    console.log(`Textarea: placeholder="${placeholder}", class="${cls}", size=${JSON.stringify(box)}`)
  }

  // 查找 select 下拉
  const selects = await page.locator('.tf-memory-panel select').all()
  console.log(`Selects in panel: ${selects.length}`)
  for (const sel of selects) {
    const cls = await sel.getAttribute('class')
    const options = await sel.locator('option').all()
    const optTexts = []
    for (const opt of options) {
      optTexts.push(await opt.textContent())
    }
    console.log(`Select: class="${cls}", options=[${optTexts.join(', ')}]`)
  }
})

test("memory panel - three column layout analysis", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 大屏截图
  await page.screenshot({ path: path.join(DIR, "17-memory-1440px.png"), fullPage: true })

  // 分析三栏布局
  const panel = page.locator('.tf-memory-panel')
  if (await panel.count() > 0) {
    const panelBox = await panel.boundingBox()
    console.log("Panel total size:", JSON.stringify(panelBox))

    // 查找三栏子元素
    const children = await panel.locator(':scope > *').all()
    console.log(`Direct children of panel: ${children.length}`)
    for (const child of children) {
      const cls = await child.getAttribute('class')
      const box = await child.boundingBox()
      console.log(`Child: class="${cls}", box=${JSON.stringify(box)}`)
    }
  }

  // 查找分类列（左栏）
  const leftCol = page.locator('.tf-memory-panel__cats, .tf-memory-panel__left, [class*="memory-panel__cats"]')
  if (await leftCol.count() > 0) {
    const box = await leftCol.first().boundingBox()
    console.log("Left column (categories):", JSON.stringify(box))
    await leftCol.first().screenshot({ path: path.join(DIR, "18-left-column-cats.png") })
  }

  // 查找条目列（中栏）
  const midCol = page.locator('.tf-memory-panel__items, .tf-memory-panel__middle, [class*="memory-panel__items"]')
  if (await midCol.count() > 0) {
    const box = await midCol.first().boundingBox()
    console.log("Middle column (items):", JSON.stringify(box))
    await midCol.first().screenshot({ path: path.join(DIR, "19-middle-column-items.png") })
  }

  // 查找编辑区（右栏）
  const rightCol = page.locator('.tf-memory-panel__editor, .tf-memory-panel__right, [class*="memory-panel__editor"]')
  if (await rightCol.count() > 0) {
    const box = await rightCol.first().boundingBox()
    console.log("Right column (editor):", JSON.stringify(box))
    await rightCol.first().screenshot({ path: path.join(DIR, "20-right-column-editor.png") })
  }
})

test("memory panel - category interactions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  await page.screenshot({ path: path.join(DIR, "21-memory-open.png"), fullPage: true })

  // 查找分类项并点击
  const catItems = await page.locator('[class*="cat-item"], [class*="category"]').all()
  console.log(`Category items: ${catItems.length}`)

  // 尝试点击分类折叠/展开
  const firstCat = page.locator('[class*="cat-item"]').first()
  if (await firstCat.count() > 0) {
    const text = await firstCat.textContent()
    console.log(`First category: "${text?.trim()}"`)
    await firstCat.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "22-category-clicked.png"), fullPage: true })
  }

  // 查找新建分类按钮
  const addCatBtns = await page.locator('button[class*="add"], button[title*="新建"], button[title*="添加"], [class*="add-cat"]').all()
  console.log(`Add category buttons: ${addCatBtns.length}`)
  for (const btn of addCatBtns) {
    const text = await btn.textContent()
    const title = await btn.getAttribute('title')
    const cls = await btn.getAttribute('class')
    console.log(`Add button: text="${text?.trim()}", title="${title}", class="${cls}"`)
  }

  // 查找所有 + 按钮
  const plusBtns = await page.locator('button:has-text("+"), button[title*="+"]').all()
  console.log(`Plus buttons: ${plusBtns.length}`)
  for (const btn of plusBtns) {
    const text = await btn.textContent()
    const cls = await btn.getAttribute('class')
    const box = await btn.boundingBox()
    console.log(`Plus button: text="${text?.trim()}", class="${cls}", pos=${JSON.stringify(box)}`)
  }
})

test("memory panel - item interactions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 查找条目列表
  const itemList = page.locator('[class*="memory-panel__items"], [class*="item-list"]')
  if (await itemList.count() > 0) {
    const html = await itemList.first().innerHTML()
    console.log("Item list HTML:", html.substring(0, 1000))
  }

  // 查找条目
  const items = await page.locator('[class*="mem-item"], [class*="memory-item"]').all()
  console.log(`Memory items found: ${items.length}`)
  for (const item of items) {
    const text = await item.textContent()
    const cls = await item.getAttribute('class')
    console.log(`Item: text="${text?.trim().substring(0, 50)}", class="${cls}"`)
  }

  // 点击第一个条目
  if (items.length > 0) {
    await items[0].click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "23-item-clicked.png"), fullPage: true })
  }

  // 查找新建条目按钮（右上角 +）
  const newItemBtns = await page.locator('.tf-memory-panel button').all()
  for (const btn of newItemBtns) {
    const text = await btn.textContent()
    const cls = await btn.getAttribute('class')
    const box = await btn.boundingBox()
    if (text?.trim() === '+' || text?.includes('+')) {
      console.log(`New item button: text="${text?.trim()}", class="${cls}", pos=${JSON.stringify(box)}`)
    }
  }
})

test("memory panel - editor area", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 截图编辑区
  const editor = page.locator('[class*="editor"], [class*="memory-panel__edit"]')
  if (await editor.count() > 0) {
    await editor.first().screenshot({ path: path.join(DIR, "24-editor-area.png") })
    const html = await editor.first().innerHTML()
    console.log("Editor HTML:", html.substring(0, 1000))
  }

  // 查找 textarea 的 placeholder
  const textarea = page.locator('.tf-memory-panel textarea')
  if (await textarea.count() > 0) {
    const placeholder = await textarea.first().getAttribute('placeholder')
    const box = await textarea.first().boundingBox()
    console.log(`Textarea placeholder: "${placeholder}", size: ${JSON.stringify(box)}`)
  }

  // 查找分类下拉
  const categorySelect = page.locator('.tf-memory-panel select, .tf-memory-panel [class*="select"]')
  if (await categorySelect.count() > 0) {
    const html = await categorySelect.first().outerHTML()
    console.log("Category select HTML:", html.substring(0, 300))
  }

  // 查找右上角图标按钮
  const iconBtns = await page.locator('.tf-memory-panel__editor button, [class*="editor"] button, [class*="icon-btn"]').all()
  console.log(`Icon buttons in editor: ${iconBtns.length}`)
  for (const btn of iconBtns) {
    const text = await btn.textContent()
    const title = await btn.getAttribute('title')
    const ariaLabel = await btn.getAttribute('aria-label')
    const cls = await btn.getAttribute('class')
    const box = await btn.boundingBox()
    console.log(`Icon btn: text="${text?.trim()}", title="${title}", aria="${ariaLabel}", class="${cls}", pos=${JSON.stringify(box)}`)
  }

  // 截图整个面板（1440px 宽）
  await page.screenshot({ path: path.join(DIR, "25-memory-panel-1440.png"), fullPage: true })
})

test("memory panel - search and bottom tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 截图初始底部 tab 区域
  const viewportSize = page.viewportSize()!
  await page.screenshot({
    path: path.join(DIR, "26-bottom-tab-area.png"),
    clip: { x: 0, y: viewportSize.height - 60, width: viewportSize.width, height: 60 }
  })

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 查找搜索框
  const searchInputs = await page.locator('.tf-memory-panel input').all()
  console.log(`Search inputs: ${searchInputs.length}`)
  for (const input of searchInputs) {
    const type = await input.getAttribute('type')
    const placeholder = await input.getAttribute('placeholder')
    const cls = await input.getAttribute('class')
    const box = await input.boundingBox()
    console.log(`Input: type="${type}", placeholder="${placeholder}", class="${cls}", pos=${JSON.stringify(box)}`)
  }

  // 在搜索框输入内容
  if (searchInputs.length > 0) {
    await searchInputs[0].click()
    await searchInputs[0].type('测试')
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "27-search-typed.png"), fullPage: true })
    await searchInputs[0].clear()
  }

  // 截图最终状态
  await page.screenshot({ path: path.join(DIR, "28-final-state.png"), fullPage: true })

  // 查找底部记忆 tab（在 InputNode 里）
  const memoryTab = page.locator('.tf-tab:has-text("记忆")')
  const memoryTabCount = await memoryTab.count()
  console.log(`Memory tabs found: ${memoryTabCount}`)
  if (memoryTabCount > 0) {
    for (const tab of await memoryTab.all()) {
      const cls = await tab.getAttribute('class')
      const box = await tab.boundingBox()
      console.log(`Memory tab: class="${cls}", pos=${JSON.stringify(box)}`)
    }
  }
})

test("memory panel - new item flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 打开记忆面板
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 截图打开后状态
  await page.screenshot({ path: path.join(DIR, "29-memory-open-1440.png"), fullPage: true })

  // 查找所有按钮，找新建按钮
  const allBtns = await page.locator('.tf-memory-panel button').all()
  console.log(`All buttons in memory panel: ${allBtns.length}`)
  let addBtn = null
  for (const btn of allBtns) {
    const text = await btn.textContent()
    const cls = await btn.getAttribute('class')
    const title = await btn.getAttribute('title')
    const box = await btn.boundingBox()
    console.log(`Button: text="${text?.trim()}", class="${cls}", title="${title}", pos=${JSON.stringify(box)}`)
    if (text?.trim() === '+' || text?.includes('新建') || text?.includes('添加')) {
      addBtn = btn
    }
  }

  // 点击新建按钮
  if (addBtn) {
    await addBtn.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "30-new-item-created.png"), fullPage: true })
  }

  // 截图最终状态
  await page.screenshot({ path: path.join(DIR, "31-memory-final.png"), fullPage: true })
})

test("memory panel - dark mode", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 切换到暗色模式
  const themeToggle = page.locator('[aria-label="切换主题"]')
  if (await themeToggle.count() > 0) {
    await themeToggle.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "32-dark-mode.png"), fullPage: true })
  }

  // 打开记忆面板（暗色模式）
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(DIR, "33-memory-dark-mode.png"), fullPage: true })
})
