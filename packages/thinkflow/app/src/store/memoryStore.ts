import { create } from "zustand"
import { persist } from "zustand/middleware"
import { nanoid } from "nanoid"
import type { MemoryEntry, MemoryFolder, MemoryFolderType } from "../types"

type AddEntryInput = { folderId: string; title: string; content: string; tags?: string[] }

type MemoryState = {
  folders: MemoryFolder[]
  entries: MemoryEntry[]
  addFolder: (type: MemoryFolderType, name: string) => void
  addEntry: (input: AddEntryInput) => void
  updateEntry: (id: string, patch: Partial<MemoryEntry>) => void
  deleteEntry: (id: string) => void
  searchEntries: (query: string) => MemoryEntry[]
  exportData: () => string
  importData: (json: string) => void
}

const DEFAULT_FOLDERS: MemoryFolder[] = [
  { id: "folder-persona", type: "persona", name: "人设记忆" },
  { id: "folder-material", type: "material", name: "素材记忆" },
  { id: "folder-preference", type: "preference", name: "偏好" },
  { id: "folder-output", type: "output", name: "输出" },
]

const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      folders: DEFAULT_FOLDERS,
      entries: [],

      addFolder: (type, name) => {
        const folder: MemoryFolder = { id: nanoid(), type, name }
        set({ folders: [...get().folders, folder] })
      },

      addEntry: ({ folderId, title, content, tags = [] }) => {
        const now = Date.now()
        const entry: MemoryEntry = {
          id: nanoid(),
          folderId,
          title,
          content,
          tags,
          createdAt: now,
          updatedAt: now,
        }
        set({ entries: [...get().entries, entry] })
      },

      updateEntry: (id, patch) => {
        set({
          entries: get().entries.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e
          ),
        })
      },

      deleteEntry: (id) => {
        set({ entries: get().entries.filter((e) => e.id !== id) })
      },

      searchEntries: (query) => {
        if (!query.trim()) return get().entries
        const q = query.toLowerCase()
        return get().entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.content.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q))
        )
      },

      exportData: () => {
        const { folders, entries } = get()
        return JSON.stringify({ folders, entries }, null, 2)
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as { folders?: MemoryFolder[]; entries?: MemoryEntry[] }
          set({
            folders: parsed.folders ?? get().folders,
            entries: parsed.entries ?? get().entries,
          })
        } catch {
          // silently ignore malformed JSON
        }
      },
    }),
    { name: "thinkflow-memory" }
  )
)

export default useMemoryStore
