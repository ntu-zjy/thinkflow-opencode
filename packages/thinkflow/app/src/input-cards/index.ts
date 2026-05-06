// 按序导入所有输入卡片，触发 registerInputCard 副作用
import "./text"
import "./url"
import "./file"
import "./memory"
import "./feed"

export { INPUT_CARD_REGISTRY, getInputCard, getAllInputCards } from "./registry"
export type { InputCardDef } from "./registry"
export { TextLogo, LinkLogo, FileLogo, MemoryLogo, FeedLogo } from "./logos"
