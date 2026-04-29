import { describe, it, expect, beforeEach } from "vitest"
import { useMemoryStore } from "../store/memoryStore"

beforeEach(() => {
  useMemoryStore.setState({
    folders: [],
    searchQuery: "",
  })
})

describe("memoryStore", () => {
  it("adds a folder", () => {
    useMemoryStore.getState().addFolder("Test Folder", "persona")
    const folders = useMemoryStore.getState().folders
    expect(folders).toHaveLength(1)
    expect(folders[0].name).toBe("Test Folder")
    expect(folders[0].type).toBe("persona")
  })

  it("deletes a folder", () => {
    const store = useMemoryStore.getState()
    store.addFolder("Folder 1", "persona")
    store.addFolder("Folder 2", "material")
    const id = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().deleteFolder(id)
    expect(useMemoryStore.getState().folders).toHaveLength(1)
    expect(useMemoryStore.getState().folders[0].name).toBe("Folder 2")
  })

  it("renames a folder", () => {
    useMemoryStore.getState().addFolder("Old Name", "persona")
    const id = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().renameFolder(id, "New Name")
    expect(useMemoryStore.getState().folders[0].name).toBe("New Name")
  })

  it("adds an entry to a folder", () => {
    useMemoryStore.getState().addFolder("Personas", "persona")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "My Persona",
      type: "persona",
      content: "I write about tech.",
      tags: ["tech", "writing"],
    })
    const entries = useMemoryStore.getState().folders[0].entries
    expect(entries).toHaveLength(1)
    expect(entries[0].title).toBe("My Persona")
    expect(entries[0].tags).toContain("tech")
  })

  it("updates an entry", () => {
    useMemoryStore.getState().addFolder("Personas", "persona")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "Original Title",
      type: "persona",
      content: "Original content",
      tags: [],
    })
    const entryId = useMemoryStore.getState().folders[0].entries[0].id
    useMemoryStore.getState().updateEntry(folderId, entryId, { title: "Updated Title" })
    expect(useMemoryStore.getState().folders[0].entries[0].title).toBe("Updated Title")
  })

  it("deletes an entry", () => {
    useMemoryStore.getState().addFolder("Materials", "material")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "Entry 1",
      type: "material",
      content: "Content 1",
      tags: [],
    })
    useMemoryStore.getState().addEntry(folderId, {
      title: "Entry 2",
      type: "material",
      content: "Content 2",
      tags: [],
    })
    const entryId = useMemoryStore.getState().folders[0].entries[0].id
    useMemoryStore.getState().deleteEntry(folderId, entryId)
    expect(useMemoryStore.getState().folders[0].entries).toHaveLength(1)
  })

  it("searches entries by title", () => {
    useMemoryStore.getState().addFolder("Personas", "persona")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "小红书博主风格",
      type: "persona",
      content: "活泼可爱",
      tags: ["小红书"],
    })
    useMemoryStore.getState().addEntry(folderId, {
      title: "知乎写作风格",
      type: "persona",
      content: "严谨专业",
      tags: ["知乎"],
    })
    const results = useMemoryStore.getState().searchEntries("小红书")
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("小红书博主风格")
  })

  it("searches entries by content", () => {
    useMemoryStore.getState().addFolder("Materials", "material")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "Golden Quotes",
      type: "material",
      content: "Life is short, so make it count.",
      tags: [],
    })
    const results = useMemoryStore.getState().searchEntries("short")
    expect(results).toHaveLength(1)
  })

  it("searches entries by tag", () => {
    useMemoryStore.getState().addFolder("Materials", "material")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "Item 1",
      type: "material",
      content: "content",
      tags: ["marketing", "viral"],
    })
    useMemoryStore.getState().addEntry(folderId, {
      title: "Item 2",
      type: "material",
      content: "other content",
      tags: ["branding"],
    })
    const results = useMemoryStore.getState().searchEntries("viral")
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe("Item 1")
  })

  it("gets entry by id", () => {
    useMemoryStore.getState().addFolder("Test", "preference")
    const folderId = useMemoryStore.getState().folders[0].id
    useMemoryStore.getState().addEntry(folderId, {
      title: "Test Entry",
      type: "preference",
      content: "test content",
      tags: [],
    })
    const entryId = useMemoryStore.getState().folders[0].entries[0].id
    const entry = useMemoryStore.getState().getEntry(entryId)
    expect(entry).toBeDefined()
    expect(entry?.title).toBe("Test Entry")
  })

  it("returns undefined for non-existent entry", () => {
    const entry = useMemoryStore.getState().getEntry("non-existent-id")
    expect(entry).toBeUndefined()
  })
})
