import { describe, it, expect, beforeEach } from "vitest"
import useMemoryStore from "../store/memoryStore"

beforeEach(() => {
  useMemoryStore.setState({
    folders: [
      { id: "folder-persona", type: "persona", name: "人设记忆" },
      { id: "folder-material", type: "material", name: "素材记忆" },
      { id: "folder-preference", type: "preference", name: "偏好" },
      { id: "folder-output", type: "output", name: "输出" },
    ],
    entries: [],
  })
})

describe("memoryStore", () => {
  it("初始状态有 4 个默认文件夹", () => {
    const { folders } = useMemoryStore.getState()
    expect(folders).toHaveLength(4)
    expect(folders.map((f) => f.type)).toEqual(["persona", "material", "preference", "output"])
  })

  it("addEntry 添加记忆条目", () => {
    useMemoryStore.getState().addEntry({
      folderId: "folder-persona",
      title: "我的账号人设",
      content: "科技博主，专注 AI 领域",
      tags: ["AI", "科技"],
    })
    const { entries } = useMemoryStore.getState()
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe("我的账号人设")
    expect(entries[0].tags).toContain("AI")
    expect(entries[0].folderId).toBe("folder-persona")
  })

  it("deleteEntry 删除记忆条目", () => {
    useMemoryStore.getState().addEntry({
      folderId: "folder-persona",
      title: "测试条目",
      content: "测试内容",
    })
    const id = useMemoryStore.getState().entries[0].id
    useMemoryStore.getState().deleteEntry(id)
    expect(useMemoryStore.getState().entries).toHaveLength(0)
  })

  it("updateEntry 更新记忆条目", () => {
    useMemoryStore.getState().addEntry({
      folderId: "folder-material",
      title: "原标题",
      content: "原内容",
    })
    const id = useMemoryStore.getState().entries[0].id
    useMemoryStore.getState().updateEntry(id, { title: "新标题" })
    expect(useMemoryStore.getState().entries[0].title).toBe("新标题")
  })

  it("searchEntries 按标题搜索", () => {
    useMemoryStore.getState().addEntry({ folderId: "folder-persona", title: "AI 写作技巧", content: "..." })
    useMemoryStore.getState().addEntry({ folderId: "folder-material", title: "金句合集", content: "..." })
    const results = useMemoryStore.getState().searchEntries("AI")
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("AI 写作技巧")
  })

  it("searchEntries 按 tag 搜索", () => {
    useMemoryStore.getState().addEntry({ folderId: "folder-persona", title: "写作风格", content: "...", tags: ["知乎"] })
    const results = useMemoryStore.getState().searchEntries("知乎")
    expect(results).toHaveLength(1)
  })

  it("exportData / importData 往返正确", () => {
    useMemoryStore.getState().addEntry({ folderId: "folder-output", title: "导出测试", content: "测试内容" })
    const json = useMemoryStore.getState().exportData()
    useMemoryStore.setState({ entries: [] })
    useMemoryStore.getState().importData(json)
    expect(useMemoryStore.getState().entries).toHaveLength(1)
    expect(useMemoryStore.getState().entries[0].title).toBe("导出测试")
  })

  it("importData 忽略非法 JSON", () => {
    useMemoryStore.getState().addEntry({ folderId: "folder-persona", title: "保留", content: "..." })
    useMemoryStore.getState().importData("这不是合法的json{{{")
    // Should still have the original entry intact
    expect(useMemoryStore.getState().entries).toHaveLength(1)
  })
})
