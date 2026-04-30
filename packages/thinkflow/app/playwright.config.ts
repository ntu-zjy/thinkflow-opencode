import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  use: {
    baseURL: "http://localhost:1421",
    headless: true,
    viewport: { width: 1280, height: 800 },
  },
  reporter: "line",
})
