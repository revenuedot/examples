// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Playwright config; starts the Next.js dev server, and loads .env.local so the tests can also ask the server directly.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const port = Number(process.env.PORT ?? 5200);

export default defineConfig({
  testDir: "e2e",
  // The first request compiles the page in next dev, which can take a while.
  timeout: 60_000,
  workers: 1,
  use: { baseURL: `http://localhost:${port}` },
  webServer: { command: `npx next dev --port ${port}`, url: `http://localhost:${port}`, reuseExistingServer: true, timeout: 120_000 },
});
