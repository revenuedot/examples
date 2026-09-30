// RevenueDot: open-source, self-hostable alternative to RevenueCat. Same SDK API, free.
// This file: Vite config for the purchases-js web paywall example.
// Docs: https://revenuedot.app/docs/sdks/web   Migrate from RevenueCat: https://revenuedot.app/docs/migrate
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()], server: { port: 5199 } });
