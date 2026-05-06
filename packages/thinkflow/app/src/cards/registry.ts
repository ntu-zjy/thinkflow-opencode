import type React from "react"
import type { OutputPlatform, ContentFormat, ImageAsset } from "../types"

export interface PreviewProps {
  content: string
  images?: ImageAsset[]
  contentType?: "text" | "image"
  showPreview: boolean
}

export interface CardDef {
  key: OutputPlatform
  label: string
  LogoComponent: React.ComponentType<{ size?: number }>  // 品牌 logo 组件
  color: string                   // 主色 hex（浅色主题）
  darkColor: string               // 主色 hex（深色主题）
  bgColor: string                 // header 背景色 rgba
  borderColor: string             // 边框色 rgba
  darkBgColor: string             // 深色主题 header 背景
  darkBorderColor: string         // 深色主题边框色
  defaultInstruction: (contentFormat: ContentFormat) => string
  supportedFormats: ContentFormat[]
  PreviewComponent?: React.ComponentType<PreviewProps>
}

export const CARD_REGISTRY = new Map<OutputPlatform, CardDef>()

export function registerCard(def: CardDef): void {
  CARD_REGISTRY.set(def.key, def)
}

export function getCard(platform: OutputPlatform): CardDef {
  const card = CARD_REGISTRY.get(platform)
  if (!card) throw new Error(`未注册的平台卡片: ${platform}`)
  return card
}

export function getAllCards(): CardDef[] {
  return Array.from(CARD_REGISTRY.values())
}
