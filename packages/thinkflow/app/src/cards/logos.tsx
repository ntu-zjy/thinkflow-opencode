// 各平台品牌 Logo SVG 组件
// 统一 viewBox="0 0 24 24"，用 text 元素显示品牌字符，几何图形辅助

interface LogoProps { size?: number }

// 知乎 logo —— 蓝底白色「知」字
export function ZhihuLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0084ff" />
      <text x="12" y="17" textAnchor="middle" fill="white"
        fontSize="14" fontWeight="800"
        fontFamily="'PingFang SC','Microsoft YaHei',sans-serif">知</text>
    </svg>
  )
}

// 微信公众号 logo —— 绿底白色两个对话气泡
export function WechatLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#07c160" />
      {/* 左大气泡 */}
      <ellipse cx="9.5" cy="9" rx="6" ry="4.5" fill="white" />
      <polygon points="7,13.5 6,16.5 10,13.5" fill="white" />
      {/* 左气泡内的点 */}
      <circle cx="7.5" cy="9" r="1" fill="#07c160" />
      <circle cx="9.5" cy="9" r="1" fill="#07c160" />
      <circle cx="11.5" cy="9" r="1" fill="#07c160" />
      {/* 右小气泡 */}
      <ellipse cx="15.5" cy="14" rx="5" ry="3.5" fill="white" opacity="0.85" />
      <polygon points="17,17.5 18,20 14,17.5" fill="white" opacity="0.85" />
    </svg>
  )
}

// 小红书 logo —— 红底白色「小红书」三字（官方样式）
export function XiaohongshuLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#ff2b54" />
      <text x="12" y="15.5" textAnchor="middle" dominantBaseline="middle" fill="white"
        fontSize="7" fontWeight="900"
        fontFamily="'PingFang SC','Microsoft YaHei',sans-serif"
        letterSpacing="0.5">小红书</text>
    </svg>
  )
}

// 日记 logo —— 暖棕色底，白色「记」字
export function DiaryLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#b47828" />
      <text x="12" y="17" textAnchor="middle" fill="white"
        fontSize="14" fontWeight="800"
        fontFamily="'PingFang SC','Microsoft YaHei',sans-serif">记</text>
    </svg>
  )
}

// 笔记 logo —— 紫色底，白色「笔」字
export function NoteLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#6366f1" />
      <text x="12" y="17" textAnchor="middle" fill="white"
        fontSize="14" fontWeight="800"
        fontFamily="'PingFang SC','Microsoft YaHei',sans-serif">笔</text>
    </svg>
  )
}

// 视频 logo —— 红底白色摄像机图形
export function VideoLogo({ size = 16 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#ef4444" />
      {/* 摄像机机身 */}
      <rect x="2.5" y="7.5" width="12" height="9" rx="2" fill="white" opacity="0.95" />
      {/* 镜头三角（录像机侧翼） */}
      <polygon points="14.5,9.5 21.5,6.5 21.5,17.5 14.5,14.5" fill="white" opacity="0.9" />
    </svg>
  )
}
