// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: test runner config for the signature verification tests.
// Docs: https://revenuedot.app/docs/guides/webhooks   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// "@/..." mirrors the tsconfig path alias Next.js uses.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["test/**/*.test.ts"] },
});
