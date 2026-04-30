import { test, expect } from "@playwright/test"

test("小红书两步法：文本生成 + 图片生成（含地区限制降级）", async ({ page }) => {
  const apiCalls: { url: string; status: number; body: string }[] = []

  page.on("response", async (resp) => {
    const url = resp.url()
    if (url.includes("openrouter") || url.includes("images/generations")) {
      let body = ""
      try { body = await resp.text() } catch { body = "<stream>" }
      apiCalls.push({ url, status: resp.status(), body: body.slice(0, 200) })
    }
  })

  await page.goto("http://localhost:1421")
  await page.waitForLoadState("networkidle")

  // 等待节点渲染
  await page.waitForSelector(".tf-node", { timeout: 10000 })

  // 找输入节点，填写内容
  const inputNodes = page.locator(".tf-node").filter({ hasText: "输入" })
  const firstInput = inputNodes.first()
  const textarea = firstInput.locator("textarea").first()
  await textarea.waitFor({ state: "visible", timeout: 5000 })
  await textarea.fill("一朵鲜花")

  // 切换第一个输出节点到小红书
  const outputNodes = page.locator(".tf-node").filter({ hasText: "输出" })
  const firstOutput = outputNodes.first()
  const xiaohongshuBtn = firstOutput.locator("button", { hasText: "小红书" })
  await xiaohongshuBtn.waitFor({ state: "visible", timeout: 5000 })
  await xiaohongshuBtn.click()

  // 等待 Agent 节点处于 idle 状态（避免上一次测试留下的 done 状态干扰）
  const agentNode = page.locator(".tf-node").filter({ hasText: "Agent" }).first()

  // 重置：如果不是 idle，先等它变成可点击状态
  // 直接等运行按钮可见（idle 时显示"运行"，running 时显示"停止"）
  const runBtn = agentNode.locator(".tf-btn-primary", { hasText: "运行" })
  await runBtn.waitFor({ state: "visible", timeout: 10000 })

  // 记录点击前的状态
  const statusBefore = await page.evaluate(() => {
    const dot = document.querySelector(".tf-status-dot")
    return dot?.className ?? ""
  })
  console.log("运行前状态:", statusBefore)

  // 点击运行
  await runBtn.click()
  console.log("已点击运行，等待完成（最多 90s）...")

  // 等待状态从 running 变成 done 或 error（先等 running 出现，再等结束）
  await page.waitForFunction(
    () => document.querySelector(".tf-status-dot.running") !== null,
    { timeout: 15000 },
  ).catch(() => console.log("未检测到 running 状态，可能直接结束了"))

  await page.waitForFunction(
    () => {
      const dots = document.querySelectorAll(".tf-status-dot")
      return Array.from(dots).some((d) => d.classList.contains("done") || d.classList.contains("error"))
    },
    { timeout: 90000 },
  )

  // 读取结果
  const agentStatus = await page.evaluate(() => {
    const dot = document.querySelector(".tf-status-dot")
    return dot?.className ?? "not found"
  })
  console.log("Agent 状态:", agentStatus)

  const content = await firstOutput.locator(".tf-preview").textContent()
  console.log("输出内容:", content?.slice(0, 200))

  const img = firstOutput.locator("img")
  const hasImage = await img.count() > 0
  console.log("有图片:", hasImage)
  if (hasImage) {
    const src = await img.first().getAttribute("src")
    console.log("图片类型:", src?.startsWith("data:image/svg") ? "SVG 占位图（地区限制降级）"
      : src?.startsWith("data:") ? "base64 真实图片" : "URL: " + src?.slice(0, 80))
  }

  if (apiCalls.length > 0) {
    console.log("=== 图片 API 调用 ===")
    apiCalls.forEach((c) => console.log(`  ${c.status} ${c.url}\n  ${c.body.slice(0, 100)}`))
  }

  // ── 断言 ──────────────────────────────────────────────────────────────────
  expect(content?.length).toBeGreaterThan(10)  // 有文案
  expect(hasImage).toBe(true)                   // 有图片（占位或真实）
  expect(agentStatus).toContain("done")         // 流程完成，不 throw
})
