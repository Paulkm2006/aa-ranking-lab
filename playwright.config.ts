import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  use: {
    baseURL: "http://127.0.0.1:4173/aa-ranking-lab/",
    viewport: { width: 1440, height: 1600 },
    launchOptions:
      process.env.CI || !existsSync("/usr/bin/chromium")
        ? {}
        : { executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] },
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://127.0.0.1:4173/aa-ranking-lab/",
    reuseExistingServer: !process.env.CI,
  },
  reporter: "list",
});
