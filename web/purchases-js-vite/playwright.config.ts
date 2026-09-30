// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Playwright config; starts the Vite dev server (it reads .env / .env.local for the server URL and key).
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:5199" },
  webServer: { command: "npx vite --port 5199 --strictPort", url: "http://localhost:5199", reuseExistingServer: true },
});
