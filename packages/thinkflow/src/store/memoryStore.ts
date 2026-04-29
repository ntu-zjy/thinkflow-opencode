import { create } from "zustand"
import { immer } from "zustand/middleware/immer"
import { persist } from "zustand/middleware"
import { v4 as uuid } from "uuid"
import type { MemoryEntry, MemoryFolder, MemoryType } from "@/types/memory"

interface MemoryState {
  folders: MemoryFolder[]
  searchQuery: string

  addFolder: (name: string, type: MemoryType) => void
  deleteFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  addEntry: (folderId: string, entry: Omit<MemoryEntry, "id" | "createdAt" | "updatedAt">) => void
  updateEntry: (folderId: string, entryId: string, partial: Partial<MemoryEntry>) => void
  deleteEntry: (folderId: string, entryId: string) => void
  setSearch: (q: string) => void
  searchEntries: (q: string) => MemoryEntry[]
  getEntry: (id: string) => MemoryEntry | undefined
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    immer((set, get) => ({
      folders: [
        {
          id: uuid(),
          name: "账号人设",
          type: "persona",
          entries: [],
        },
        {
          id: uuid(),
          name: "内容素材",
          type: "material",
          entries: [],
        },
        {
          id: uuid(),
          name: "用户偏好",
          type: "preference",
          entries: [],
        },
      ],
      searchQuery: "",

      addFolder(name, type) {
        set((s) => {
          s.folders.push({ id: uuid(), name, type, entries: [] })
        })
      },

      deleteFolder(id) {
        set((s) => { s.folders = s.folders.filter((f) => f.id !== id) })
      },

      renameFolder(id, name) {
        set((s) => {
          const f = s.folders.find((f) => f.id === id)
          if (f) f.name = name
        })
      },

      addEntry(folderId, entry) {
        set((s) => {
          const f = s.folders.find((f) => f.id === folderId)
          if (!f) return
          f.entries.push({
            ...entry,
            id: uuid(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
        })
      },

      updateEntry(folderId, entryId, partial) {
        set((s) => {
          const f = s.folders.find((f) => f.id === folderId)
          if (!f) return
          const e = f.entries.find((e) => e.id === entryId)
          if (e) Object.assign(e, { ...partial, updatedAt: Date.now() })
        })
      },

      deleteEntry(folderId, entryId) {
        set((s) => {
          const f = s.folders.find((f) => f.id === folderId)
          if (f) f.entries = f.entries.filter((e) => e.id !== entryId)
        })
      },

      setSearch(q) {
        set((s) => { s.searchQuery = q })
      },

      searchEntries(q) {
        const lower = q.toLowerCase()
        return get().folders.flatMap((f) =>
          f.entries.filter(
            (e) =>
              e.title.toLowerCase().includes(lower) ||
              e.content.toLowerCase().includes(lower) ||
              e.tags.some((t) => t.toLowerCase().includes(lower)),
          ),
        )
      },

      getEntry(id) {
        for (const f of get().folders) {
          const e = f.entries.find((e) => e.id === id)
          if (e) return e
        }
        return undefined
      },
    })),
    { name: "thinkflow-memory" },
  ),
)
