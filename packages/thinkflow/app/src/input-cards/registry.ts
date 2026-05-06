import type React from "react"
import type { InputType } from "../types"

export interface InputCardDef {
  key: InputType
  label: string
  shortLabel: string           // 用于节点标题
  LogoComponent: React.ComponentType<{ size?: number }>
  color: string                // 主色 hex（浅色主题）
  darkColor: string            // 主色 hex（深色主题）
  bgColor: string              // header 背景色 rgba
  borderColor: string          // 边框色 rgba
  darkBgColor: string          // 深色主题 header 背景
  darkBorderColor: string      // 深色主题边框色
  placeholder?: string         // 输入占位提示
  description?: string         // 功能描述
}

export const INPUT_CARD_REGISTRY = new Map<InputType, InputCardDef>()

export function registerInputCard(def: InputCardDef): void {
  INPUT_CARD_REGISTRY.set(def.key, def)
}

export function getInputCard(type: InputType): InputCardDef {
  const card = INPUT_CARD_REGISTRY.get(type)
  if (!card) throw new Error(`未注册的输入卡片: ${type}`)
  return card
}

export function getAllInputCards(): InputCardDef[] {
  return Array.from(INPUT_CARD_REGISTRY.values())
}
