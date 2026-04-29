import React from "react"
import ReactDOM from "react-dom/client"
import { ConfigProvider, theme } from "antd"
import zhCN from "antd/locale/zh_CN"
import App from "./App"
import "./styles/global.css"
import "@xyflow/react/dist/style.css"

const antTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: "#63d2ba",
    colorBgBase: "#0d0d10",
    colorBgContainer: "#1a1a20",
    colorBgElevated: "#22222a",
    colorBorder: "#2e2e3a",
    colorText: "#f0eee8",
    colorTextSecondary: "#9896a0",
    borderRadius: 8,
    fontFamily: "'Sora', 'PingFang SC', 'Microsoft YaHei', sans-serif",
    fontSize: 13,
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 32,
    },
    Input: {
      colorBgContainer: "#141418",
      borderRadius: 8,
    },
    Select: {
      colorBgContainer: "#141418",
    },
    Modal: {
      colorBgElevated: "#1a1a20",
    },
  },
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={antTheme} locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
