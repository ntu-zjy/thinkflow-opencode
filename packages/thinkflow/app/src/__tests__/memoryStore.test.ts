import { describe, it, expect, beforeEach } from "vitest"
import { useMemoryStore } from "../store/memoryStore"

// 每个测试前重置 store
beforeEach(() => {
  useMemoryStore.setState({
    folders: [
      { id: "folder-persona", type: "persona", name: "账号人设", createdAt: 0 },
      { id: "folder-material", type: "material", name: "内容素材", createdAt: 0 },
      { id: "folder-preference", type: "preference", name: "用户偏好", createdAt: 0 },
      { id: "folder-output", type: "output", name: "输出记录", createdAt: 0 },
    ],
    entries: [],
  })
})

describe("memoryStore — 基础 CRUD", () => {
  it("addEntry 应该添加条目并返回 id", () => {
    const store = useMemoryStore.getState()
    const id = store.addEntry({ folderId: "folder-persona", title: "测试标题", content: "测试内容" })
    expect(id).toBeTruthy()
    const updated = useMemoryStore.getState()
    expect(updated.entries).toHaveLength(1)
    expect(updated.entries[0].title).toBe("测试标题")
    expect(updated.entries[0].folderId).toBe("folder-persona")
  })

  it("addEntry 支持 tags 可选参数", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "带标签", content: "内容", tags: ["创作", "技术"] })
    const updated = useMemoryStore.getState()
    expect(updated.entries[0].tags).toEqual(["创作", "技术"])
  })

  it("updateEntry 应该更新指定条目", () => {
    const store = useMemoryStore.getState()
    const id = store.addEntry({ folderId: "folder-persona", title: "原标题", content: "原内容" })
    useMemoryStore.getState().updateEntry(id, { title: "新标题", content: "新内容" })
    const updated = useMemoryStore.getState()
    expect(updated.entries[0].title).toBe("新标题")
    expect(updated.entries[0].content).toBe("新内容")
  })

  it("removeEntry 应该删除指定条目", () => {
    const store = useMemoryStore.getState()
    const id = store.addEntry({ folderId: "folder-material", title: "待删", content: "删掉" })
    useMemoryStore.getState().removeEntry(id)
    expect(useMemoryStore.getState().entries).toHaveLength(0)
  })

  it("removeFolder 同时删除其下所有条目", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "A", content: "a" })
    store.addEntry({ folderId: "folder-persona", title: "B", content: "b" })
    store.addEntry({ folderId: "folder-material", title: "C", content: "c" })
    useMemoryStore.getState().removeFolder("folder-persona")
    const updated = useMemoryStore.getState()
    expect(updated.entries).toHaveLength(1)
    expect(updated.entries[0].title).toBe("C")
  })
})

describe("memoryStore — 搜索", () => {
  it("searchEntries 按标题搜索", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "张三的人设", content: "..." })
    store.addEntry({ folderId: "folder-material", title: "素材库", content: "..." })
    const results = useMemoryStore.getState().searchEntries("张三")
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("张三的人设")
  })

  it("searchEntries 按内容搜索", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "标题", content: "这里包含关键词AI" })
    const results = useMemoryStore.getState().searchEntries("AI")
    expect(results).toHaveLength(1)
  })

  it("searchEntries 空查询返回全部", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "A", content: "a" })
    store.addEntry({ folderId: "folder-material", title: "B", content: "b" })
    const results = useMemoryStore.getState().searchEntries("")
    expect(results).toHaveLength(2)
  })
})

describe("memoryStore — 导入导出", () => {
  it("exportToJson 导出有效 JSON", () => {
    const store = useMemoryStore.getState()
    store.addEntry({ folderId: "folder-persona", title: "测试", content: "内容" })
    const json = useMemoryStore.getState().exportToJson()
    const parsed = JSON.parse(json)
    expect(parsed.entries).toHaveLength(1)
    expect(parsed.folders.length).toBeGreaterThan(0)
  })

  it("importFromJson 合并到现有数据", () => {
    const json = JSON.stringify({
      folders: [],
      entries: [
        {
          id: "imported-1",
          folderId: "folder-persona",
          title: "导入记忆",
          content: "导入内容",
          tags: [],
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    })
    useMemoryStore.getState().importFromJson(json)
    const updated = useMemoryStore.getState()
    expect(updated.entries.some((e) => e.title === "导入记忆")).toBe(true)
  })
})
