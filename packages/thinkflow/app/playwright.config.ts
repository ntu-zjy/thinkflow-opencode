import { defineConfig } from "@playwright/test"

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:1421"

export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  reporter: "line",
})
