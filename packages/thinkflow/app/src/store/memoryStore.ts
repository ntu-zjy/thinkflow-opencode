import { create } from "zustand"
import { persist } from "zustand/middleware"
import { nanoid } from "nanoid"
import type { MemoryFolder, MemoryEntry, MemoryFolderType } from "../types"

// ─── 默认分类文件夹 ───────────────────────────────────────────────────────────

const DEFAULT_FOLDERS: MemoryFolder[] = [
  { id: "folder-persona",    type: "persona",    name: "人设", createdAt: 0, isDefault: true },
  { id: "folder-material",   type: "material",   name: "灵感", createdAt: 0, isDefault: true },
  { id: "folder-preference", type: "preference", name: "素材", createdAt: 0, isDefault: true },
  { id: "folder-output",     type: "output",     name: "作品", createdAt: 0, isDefault: true },
  { id: "folder-other",      type: "other",      name: "其他", createdAt: 0, isDefault: true },
]

const FOLDER_NAME_MIGRATIONS: Record<string, string> = {
  "内容素材": "灵感",
  "用户偏好": "素材",
  "输出记录": "作品",
  "作品记忆": "作品",
  "想法记忆": "灵感",
  "关键信息": "素材",
  "账号人设": "人设",
}

// ─── Store 接口 ───────────────────────────────────────────────────────────────

interface MemoryStore {
  folders: MemoryFolder[]
  entries: MemoryEntry[]

  addFolder: (type: MemoryFolderType, name: string) => string
  removeFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void

  addEntry: (params: { folderId: string; title: string; content: string; tags?: string[] }) => string
  updateEntry: (id: string, params: Partial<Pick<MemoryEntry, "title" | "content" | "tags" | "folderId">>) => void
  removeEntry: (id: string) => void

  searchEntries: (query: string) => MemoryEntry[]
  getEntriesByFolder: (folderId: string) => MemoryEntry[]

  importFromJson: (json: string) => void
  exportToJson: () => string
}

// ─── Store 实现 ───────────────────────────────────────────────────────────────

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      folders: DEFAULT_FOLDERS,
      entries: [],

      addFolder: (type, name) => {
        const id = `folder-${nanoid(6)}`
        set((s) => ({
          folders: [...s.folders, { id, type, name, createdAt: Date.now() }],
        }))
        return id
      },

      removeFolder: (id) =>
        set((s) => ({
          folders: s.folders.filter((f) => f.id !== id),
          entries: s.entries.filter((e) => e.folderId !== id),
        })),

      renameFolder: (id, name) =>
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
        })),

      addEntry: ({ folderId, title, content, tags = [] }) => {
        const id = `entry-${nanoid(8)}`
        const now = Date.now()
        set((s) => ({
          entries: [
            ...s.entries,
            { id, folderId, title, content, tags, createdAt: now, updatedAt: now },
          ],
        }))
        return id
      },

      updateEntry: (id, params) =>
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id ? { ...e, ...params, updatedAt: Date.now() } : e,
          ),
        })),

      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      searchEntries: (query) => {
        const q = query.toLowerCase().trim()
        if (!q) return get().entries
        return get().entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.content.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q)),
        )
      },

      getEntriesByFolder: (folderId) =>
        get().entries.filter((e) => e.folderId === folderId),

      importFromJson: (json) => {
        const data = JSON.parse(json) as { folders?: MemoryFolder[]; entries?: MemoryEntry[] }
        set((s) => ({
          folders: [...s.folders, ...(data.folders ?? [])],
          entries: [...s.entries, ...(data.entries ?? [])],
        }))
      },

      exportToJson: () =>
        JSON.stringify({ folders: get().folders, entries: get().entries }, null, 2),
    }),
    {
      name: "thinkflow-memory",
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // 迁移旧名称
        state.folders = state.folders.map((f) => ({
          ...f,
          name: FOLDER_NAME_MIGRATIONS[f.name] ?? f.name,
        }))
        // 补全缺失的默认分类（如旧数据没有"其他"）
        const existingIds = new Set(state.folders.map((f) => f.id))
        for (const df of DEFAULT_FOLDERS) {
          if (!existingIds.has(df.id)) {
            state.folders.push(df)
          }
        }
      },
    },
  ),
)
