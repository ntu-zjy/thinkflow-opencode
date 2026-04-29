// Fix React 18.3 type incompatibility with reactflow v11 and antd v5
// These libraries use the older ReactNode definition which doesn't require children in ReactPortal
import "react"

declare module "react" {
  interface ReactPortal {
    children?: ReactNode
  }
}
