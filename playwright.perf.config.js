import { defineConfig } from "@playwright/test"

const PORT = 5175

export default defineConfig({
  testDir: "./perf",
  snapshotPathTemplate: "{testDir}/{testFileName}-snapshots/{arg}{ext}",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true
  }
})
