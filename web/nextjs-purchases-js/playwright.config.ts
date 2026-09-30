// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Playwright config; starts the Next.js dev server (it reads .env.local or the shell for the server URL and key).
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // The first request compiles the page in next dev, which can take a while.
  timeout: 60_000,
  use: { baseURL: "http://localhost:5200" },
  webServer: { command: "npx next dev --port 5200", url: "http://localhost:5200", reuseExistingServer: true, timeout: 120_000 },
});
