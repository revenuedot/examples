// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API.
// This file: Playwright config; starts the Vite dev server and loads .env / .env.local so the tests can also ask the server directly.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), "VITE_"));
const port = Number(process.env.PORT ?? 5199);

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { baseURL: `http://localhost:${port}` },
  webServer: { command: `npx vite --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: true },
});
