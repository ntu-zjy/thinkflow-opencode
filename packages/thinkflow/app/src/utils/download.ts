import { strToU8, zipSync } from "fflate"

export interface DownloadItem {
  filename: string
  content: string
  imageBase64?: string
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "-").slice(0, 80)
}

export function downloadAsZip(items: DownloadItem[], zipName: string): void {
  const files: Record<string, Uint8Array> = {}
  for (const item of items) {
    const safeName = sanitizeFilename(item.filename)
    if (item.content) {
      files[safeName] = strToU8(item.content)
    }
    if (item.imageBase64) {
      const base64 = item.imageBase64.replace(/^data:[^;]+;base64,/, "")
      const binary = atob(base64)
      const u8 = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i)
      const imgName = sanitizeFilename(item.filename.replace(/\.[^.]+$/, "")) + ".png"
      files[imgName] = u8
    }
  }
  const zipped = zipSync(files)
  triggerDownload(new Blob([zipped], { type: "application/zip" }), zipName)
}

export function downloadSingleText(content: string, filename: string): void {
  triggerDownload(new Blob([content], { type: "text/plain;charset=utf-8" }), filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
