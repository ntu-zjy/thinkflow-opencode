import { describe, it, expect } from "vitest"
import { PLATFORM_FORMATS } from "../types/platform"

describe("PLATFORM_FORMATS", () => {
  it("contains all MVP platforms", () => {
    const expected = ["xiaohongshu", "zhihu", "wechat", "manhua", "raw"]
    expected.forEach((id) => {
      expect(PLATFORM_FORMATS[id]).toBeDefined()
    })
  })

  it("each platform has required fields", () => {
    Object.values(PLATFORM_FORMATS).forEach((p) => {
      expect(p.id).toBeTruthy()
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(typeof p.supportsImages).toBe("boolean")
      expect(typeof p.promptTemplate).toBe("string")
    })
  })

  it("image-supporting platforms are correct", () => {
    expect(PLATFORM_FORMATS.xiaohongshu.supportsImages).toBe(true)
    expect(PLATFORM_FORMATS.zhihu.supportsImages).toBe(true)
    expect(PLATFORM_FORMATS.wechat.supportsImages).toBe(true)
    expect(PLATFORM_FORMATS.manhua.supportsImages).toBe(false)
    expect(PLATFORM_FORMATS.raw.supportsImages).toBe(false)
  })

  it("xiaohongshu has length limit", () => {
    expect(PLATFORM_FORMATS.xiaohongshu.maxLength).toBeGreaterThan(0)
  })

  it("raw platform has empty prompt template", () => {
    expect(PLATFORM_FORMATS.raw.promptTemplate).toBe("")
  })
})
