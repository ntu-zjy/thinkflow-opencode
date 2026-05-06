import { test, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const DIR = "/Users/zhangjingyuan/Downloads/thinkflow-opencode/packages/thinkflow/app/test-results/memory-explore"

test.beforeAll(() => {
  if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true })
  }
})

test("comprehensive memory panel screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1000)

  // SS1: 初始状态（记忆面板关闭）- 显示工作流画布
  await page.screenshot({ path: path.join(DIR, "A1-initial-canvas.png"), fullPage: false })

  // 截图左侧 sidebar（包含记忆按钮）
  const sidebar = page.locator('.tf-wf-sidebar')
  if (await sidebar.count() > 0) {
    await sidebar.screenshot({ path: path.join(DIR, "A2-sidebar-with-memory-btn.png") })
  }

  // 点击记忆按钮
  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // SS2: 记忆面板整体（空状态）
  await page.screenshot({ path: path.join(DIR, "A3-memory-panel-empty.png"), fullPage: false })

  // 截图记忆面板 header
  const header = page.locator('.tf-memory-panel__header')
  if (await header.count() > 0) {
    await header.screenshot({ path: path.join(DIR, "A4-memory-header.png") })
  }

  // 截图 notion 区域（左侧 sidebar + 右侧 editor）
  const notion = page.locator('.tf-memory-notion')
  if (await notion.count() > 0) {
    await notion.screenshot({ path: path.join(DIR, "A5-notion-area.png") })
  }

  // 截图左侧 sidebar（分类列表）
  const notionSidebar = page.locator('.tf-memory-notion__sidebar')
  if (await notionSidebar.count() > 0) {
    await notionSidebar.screenshot({ path: path.join(DIR, "A6-notion-sidebar-categories.png") })
  }

  // 截图右侧 editor（空状态）
  const editor = page.locator('.tf-memory-notion__editor')
  if (await editor.count() > 0) {
    await editor.screenshot({ path: path.join(DIR, "A7-notion-editor-empty.png") })
  }

  // 截图 header 区域（搜索框 + 新建按钮）
  const sidebarHeader = page.locator('.tf-memory-notion__sidebar-header')
  if (await sidebarHeader.count() > 0) {
    await sidebarHeader.screenshot({ path: path.join(DIR, "A8-sidebar-header-search.png") })
  }

  // 点击新建记忆按钮
  const newMemBtn = page.locator('button[title="新建记忆"]')
  if (await newMemBtn.count() > 0) {
    await newMemBtn.click()
    await page.waitForTimeout(500)

    // SS3: 新建记忆后状态
    await page.screenshot({ path: path.join(DIR, "A9-after-new-memory.png"), fullPage: false })

    // 截图编辑区（现在应该有内容了）
    const editorAfter = page.locator('.tf-memory-notion__editor')
    if (await editorAfter.count() > 0) {
      const html = await editorAfter.innerHTML()
      console.log("Editor HTML after new memory:", html.substring(0, 2000))
      await editorAfter.screenshot({ path: path.join(DIR, "A10-editor-with-content.png") })
    }

    // 截图左侧 sidebar（现在应该有条目了）
    const sidebarAfter = page.locator('.tf-memory-notion__sidebar')
    if (await sidebarAfter.count() > 0) {
      await sidebarAfter.screenshot({ path: path.join(DIR, "A11-sidebar-with-item.png") })
    }

    // 截图整体
    await page.screenshot({ path: path.join(DIR, "A12-memory-with-item.png"), fullPage: false })

    // 查找新建的条目
    const items = await page.locator('.tf-memory-notion__list [class*="item"], .tf-memory-notion__list [class*="entry"]').all()
    console.log(`Items after new: ${items.length}`)

    // 查找编辑区内的元素
    const editorInputs = await page.locator('.tf-memory-notion__editor input, .tf-memory-notion__editor textarea, .tf-memory-notion__editor select').all()
    console.log(`Editor inputs: ${editorInputs.length}`)
    for (const input of editorInputs) {
      const type = await input.getAttribute('type')
      const placeholder = await input.getAttribute('placeholder')
      const cls = await input.getAttribute('class')
      const box = await input.boundingBox()
      console.log(`Editor input: type="${type}", placeholder="${placeholder}", class="${cls}", size=${JSON.stringify(box)}`)
    }

    // 查找编辑区按钮
    const editorBtns = await page.locator('.tf-memory-notion__editor button').all()
    console.log(`Editor buttons: ${editorBtns.length}`)
    for (const btn of editorBtns) {
      const text = await btn.textContent()
      const title = await btn.getAttribute('title')
      const cls = await btn.getAttribute('class')
      const box = await btn.boundingBox()
      console.log(`Editor btn: text="${text?.trim()}", title="${title}", class="${cls}", pos=${JSON.stringify(box)}`)
    }
  }
})

test("memory panel - folder collapse expand", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 截图展开状态（默认）
  await page.screenshot({ path: path.join(DIR, "B1-folders-expanded.png"), fullPage: false })

  // 点击第一个文件夹 header 折叠
  const folderHeaders = await page.locator('.tf-memory-notion__folder-header').all()
  console.log(`Folder headers: ${folderHeaders.length}`)
  for (const fh of folderHeaders) {
    const text = await fh.textContent()
    const style = await fh.getAttribute('style')
    console.log(`Folder: text="${text?.trim()}", style="${style}"`)
  }

  if (folderHeaders.length > 0) {
    await folderHeaders[0].click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "B2-folder-collapsed.png"), fullPage: false })

    // 截图左侧 sidebar
    const sidebar = page.locator('.tf-memory-notion__sidebar')
    if (await sidebar.count() > 0) {
      await sidebar.screenshot({ path: path.join(DIR, "B3-sidebar-after-collapse.png") })
    }

    // 再次点击展开
    await folderHeaders[0].click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "B4-folder-expanded-again.png"), fullPage: false })
  }
})

test("memory panel - right click on folder", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 右键点击文件夹
  const folderHeaders = await page.locator('.tf-memory-notion__folder-header').all()
  if (folderHeaders.length > 0) {
    await folderHeaders[0].click({ button: 'right' })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "C1-right-click-folder.png"), fullPage: false })

    // 查找上下文菜单
    const contextMenu = page.locator('[class*="context-menu"], [class*="dropdown"], [role="menu"]')
    const menuCount = await contextMenu.count()
    console.log(`Context menu found: ${menuCount}`)
    if (menuCount > 0) {
      const html = await contextMenu.first().innerHTML()
      console.log("Context menu HTML:", html)
    }

    // 按 Escape 关闭
    await page.keyboard.press('Escape')
  }
})

test("memory panel - input node memory tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  // 截图 InputNode（包含记忆 tab）
  const inputNode = page.locator('.react-flow__node-input')
  if (await inputNode.count() > 0) {
    await inputNode.screenshot({ path: path.join(DIR, "D1-input-node-full.png") })

    // 点击记忆 tab
    const memTab = inputNode.locator('.tf-tab:has-text("记忆")')
    if (await memTab.count() > 0) {
      await memTab.click()
      await page.waitForTimeout(300)
      await inputNode.screenshot({ path: path.join(DIR, "D2-input-node-memory-tab.png") })
      await page.screenshot({ path: path.join(DIR, "D3-full-page-memory-tab.png"), fullPage: false })

      // 获取记忆 tab 内容
      const memTabContent = await inputNode.innerHTML()
      console.log("Input node memory tab HTML:", memTabContent.substring(0, 1000))
    }
  }
})

test("memory panel - measure all column widths", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 获取所有主要区域的尺寸
  const elements = [
    { selector: '.tf-memory-panel', name: 'Memory Panel (全部)' },
    { selector: '.tf-memory-panel__header', name: 'Header' },
    { selector: '.tf-memory-notion', name: 'Notion Area' },
    { selector: '.tf-memory-notion__sidebar', name: 'Left Sidebar (分类+条目)' },
    { selector: '.tf-memory-notion__sidebar-header', name: 'Sidebar Header (搜索+新建)' },
    { selector: '.tf-memory-notion__list', name: 'Folder List' },
    { selector: '.tf-memory-notion__editor', name: 'Right Editor' },
    { selector: '.tf-memory-notion__folder-header', name: 'Folder Header (first)' },
    { selector: '.tf-input', name: 'Search Input' },
    { selector: 'button[title="新建记忆"]', name: 'New Memory Button' },
    { selector: 'button[title="导入"]', name: 'Import Button' },
    { selector: 'button[title="导出"]', name: 'Export Button' },
    { selector: 'button[title="返回画布"]', name: 'Back Button' },
  ]

  console.log("\n=== LAYOUT MEASUREMENTS (1440x900) ===")
  for (const { selector, name } of elements) {
    const el = page.locator(selector).first()
    const count = await el.count()
    if (count > 0) {
      const box = await el.boundingBox()
      if (box) {
        console.log(`${name}: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`)
      }
    } else {
      console.log(`${name}: NOT FOUND`)
    }
  }

  // 创建新记忆后再测量编辑区
  await page.locator('button[title="新建记忆"]').click()
  await page.waitForTimeout(500)

  console.log("\n=== AFTER NEW MEMORY ===")
  const editorElements = [
    { selector: '.tf-memory-notion__editor', name: 'Editor (after new)' },
  ]

  for (const { selector, name } of editorElements) {
    const el = page.locator(selector).first()
    const count = await el.count()
    if (count > 0) {
      const box = await el.boundingBox()
      const html = await el.innerHTML()
      console.log(`${name}: box=${JSON.stringify(box)}`)
      console.log(`${name} HTML: ${html.substring(0, 3000)}`)
    }
  }

  // 截图有内容的编辑区
  await page.screenshot({ path: path.join(DIR, "E1-memory-with-editor.png"), fullPage: false })

  // 截图编辑区放大
  const editorEl = page.locator('.tf-memory-notion__editor')
  if (await editorEl.count() > 0) {
    await editorEl.screenshot({ path: path.join(DIR, "E2-editor-close-up.png") })
  }

  // 截图侧边栏（有条目）
  const sidebarEl = page.locator('.tf-memory-notion__sidebar')
  if (await sidebarEl.count() > 0) {
    await sidebarEl.screenshot({ path: path.join(DIR, "E3-sidebar-with-item.png") })
  }
})

test("memory panel - import export buttons", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(800)

  await page.locator('.tf-wf-sidebar__memory-btn').click()
  await page.waitForTimeout(600)

  // 截图 header 区域放大
  const header = page.locator('.tf-memory-panel__header')
  if (await header.count() > 0) {
    await header.screenshot({ path: path.join(DIR, "F1-header-buttons.png") })
  }

  // 点击导出按钮
  const exportBtn = page.locator('button[title="导出"]')
  if (await exportBtn.count() > 0) {
    await exportBtn.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(DIR, "F2-after-export-click.png"), fullPage: false })
  }

  // 截图 header 区域（所有图标按钮）
  await page.screenshot({ path: path.join(DIR, "F3-header-area.png"), clip: { x: 0, y: 52, width: 1440, height: 52 } })
})
