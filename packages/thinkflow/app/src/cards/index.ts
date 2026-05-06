// 按序导入所有卡片，触发 registerCard 副作用
import "./zhihu"
import "./wechat"
import "./diary"
import "./note"
import "./xiaohongshu"
import "./video"

export { CARD_REGISTRY, getCard, getAllCards, registerCard } from "./registry"
export type { CardDef, PreviewProps } from "./registry"
export { ZhihuLogo, WechatLogo, DiaryLogo, NoteLogo, XiaohongshuLogo, VideoLogo } from "./logos"
