import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Remotion / Node.js 原生模块不走 webpack，直接用 Node require
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@remotion/cli",
    "remotion",
    "puppeteer-core",
    "@puppeteer/browsers",
  ],
}

export default nextConfig
