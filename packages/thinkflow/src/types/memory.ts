export type MemoryType = "persona" | "material" | "preference" | "output"

export interface MemoryEntry {
  id: string
  title: string
  type: MemoryType
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  platform?: string
}

export interface MemoryFolder {
  id: string
  name: string
  type: MemoryType
  entries: MemoryEntry[]
}
